import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatNumber, metricDisplay, metricStatus, type HealthSnapshot, type Metric, type TrendPoint } from "./domain";
import { GoogleHealthProvider } from "./googleProvider";
import { MockHealthProvider } from "./mockProvider";
import { applyTheme, savedThemeId, themes } from "./theme";

type Route = "today" | "heart" | "sleep" | "activity" | "trends" | "ask";

const routes: { key: Route; label: string; shortcut: string }[] = [
  { key: "today", label: "Today", shortcut: "1" },
  { key: "heart", label: "Heart", shortcut: "2" },
  { key: "sleep", label: "Sleep", shortcut: "3" },
  { key: "activity", label: "Activity", shortcut: "4" },
  { key: "trends", label: "Trends", shortcut: "5" },
];

const mockProvider = new MockHealthProvider();
const googleProvider = new GoogleHealthProvider();

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="chart-empty">Trend unavailable</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - ((value - min) / (max - min || 1)) * 76 - 12}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="seven day trend"><polyline points={points} /></svg>;
}

function TrendsView({ data }: { data: HealthSnapshot }) {
  const [window, setWindow] = useState<"sevenDay" | "thirtyDay">("sevenDay");
  const trends = data.trends[window];
  const steps = trends.steps;
  if (steps.length < 2) {
    return <div className="empty-detail"><span>◌</span><strong>Not enough trend data yet</strong><small>{data.source === "mock" ? "Connect Google Health to load your personal history." : "Google Health returned fewer than two readings for this signal."}</small></div>;
  }
  const min = Math.min(...steps.map((point) => point.value));
  const max = Math.max(...steps.map((point) => point.value));
  const average = steps.reduce((sum, point) => sum + point.value, 0) / steps.length;
  const cards: { label: string; points: TrendPoint[]; unit: string; digits?: number }[] = [
    { label: "STEPS", points: trends.steps, unit: "steps" },
    { label: "RESTING HR", points: trends.restingHeartRate, unit: "bpm" },
    { label: "HRV", points: trends.hrv, unit: "ms" },
    { label: "SLEEP", points: trends.sleep, unit: "hrs", digits: 1 },
  ];
  return <div className="trends-view">
    <div className="trend-controls"><button className={window === "sevenDay" ? "active" : ""} onClick={() => setWindow("sevenDay")}>7 DAYS</button><button className={window === "thirtyDay" ? "active" : ""} onClick={() => setWindow("thirtyDay")}>30 DAYS</button></div>
    <div className="trend-summary"><div><span>WINDOW</span><strong>LAST {steps.length} DAYS</strong></div><div><span>STEPS AVERAGE</span><strong>{formatNumber(average)} steps</strong></div><div><span>STEPS RANGE</span><strong>{formatNumber(min)}—{formatNumber(max)}</strong></div></div>
    <div className="trend-chart" aria-label={`${window === "sevenDay" ? "seven" : "thirty"} day steps trend`}>{steps.map((point) => <div className="trend-column" key={point.date}><span>{formatNumber(point.value)}</span><i style={{ height: `${Math.max(8, ((point.value - min) / (max - min || 1)) * 76 + 12)}%` }} /><small>{point.date.slice(5)}</small></div>)}</div>
    <div className="trend-metric-grid">{cards.map((card) => <div className="trend-metric" key={card.label}><span>{card.label}</span>{card.points.length > 1 ? <Sparkline values={card.points.map((point) => point.value)} /> : <div className="chart-empty">No data</div>}<strong>{card.points.length ? `${formatNumber(card.points[card.points.length - 1].value, card.digits ?? 0)} ${card.unit}` : "No data"}</strong></div>)}</div>
    <small className="trend-note">Each series uses only readings returned by Google Health. Missing days are omitted; no values are interpolated.</small>
  </div>;
}

function Card({ label, value, unit, delta, detail, status, tone = "accent", children }: { label: string; value: string; unit?: string; delta?: number; detail: string; status?: string; tone?: string; children?: ReactNode }) {
  return <article className={`metric-card tone-${tone}`}>
    <div className="card-heading"><span>{label}</span><span className="card-mark">{tone === "positive" ? "↑" : "◈"}</span></div>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <div className="metric-meta"><span>{detail}</span>{status && <span className={`metric-status status-${status.toLowerCase().replace(" ", "-")}`}>{status}</span>}{delta !== undefined && <span className={delta >= 0 ? "delta-positive" : "delta-negative"}>{delta >= 0 ? "+" : ""}{delta} vs avg</span>}</div>
    {children}
  </article>;
}

function Today({ data }: { data: HealthSnapshot }) {
  const brief = useMemo(() => data.source === "mock"
    ? "Recovery signals look stable. HRV is above your recent baseline and resting heart rate is below average. Sleep ran shorter than normal, while activity is tracking close to your usual pace."
    : "Connected Google Health signals are available above. Daily interpretation will be added after the normalized trends layer is complete.", [data.source]);
  const stepsProgress = data.steps.value !== undefined && data.steps.baseline !== undefined ? Math.min(100, Math.round((data.steps.value / data.steps.baseline) * 100)) : undefined;
  const systemStatusAvailable = data.systemStatus.state === "available" && data.systemStatus.score !== undefined;
  const signalText = (metric: HealthSnapshot["hrv"], formatter: (value: number) => string, unit: string) => `${metricDisplay(metric, formatter)} ${unit}`;
  const metricNote = (metric: HealthSnapshot["hrv"], fallback: string) => metric.note ?? fallback;
  const signalTone = (metric: Metric<unknown>) => metric.state === "available" ? "good" : metric.state === "unavailable" ? "unavailable" : "missing";
  return <>
    <section className="hero-grid">
      <Card label="System // status" value={systemStatusAvailable ? String(data.systemStatus.score) : "—"} unit=" / 100" detail={data.systemStatus.note} status={systemStatusAvailable ? "DERIVED" : "INSUFFICIENT"} tone="positive"><div className="signal-row"><span className={`signal ${signalTone(data.hrv)}`}>HRV {metricDisplay(data.hrv, formatNumber)} ms</span><span className={`signal ${signalTone(data.restingHeartRate)}`}>RHR {metricDisplay(data.restingHeartRate, formatNumber)} bpm</span><span className={`signal ${signalTone(data.sleep)}`}>SLEEP {metricDisplay(data.sleep, (value) => value.toFixed(1))} h</span></div></Card>
      <Card label="Steps / activity" value={metricDisplay(data.steps, formatNumber)} unit=" steps" delta={data.steps.delta} detail="Today so far" status={metricStatus(data.steps)} tone="accent"><div className="progress"><span style={{ width: `${stepsProgress ?? 0}%` }} /></div><div className="progress-label"><span>{stepsProgress === undefined ? "No baseline available" : `${stepsProgress}% of recent daily average`}</span><span>{data.source === "mock" ? "06:42 PM" : "Google Health"}</span></div></Card>
      <Card label="Resting heart rate" value={metricDisplay(data.restingHeartRate, formatNumber)} unit=" bpm" delta={data.restingHeartRate.delta} detail="7-day personal baseline" status={metricStatus(data.restingHeartRate)} tone="positive"><Sparkline values={data.trends.sevenDay.restingHeartRate.map((point) => point.value)} /></Card>
      <Card label="Sleep" value={metricDisplay(data.sleep, (value) => `${value.toFixed(1)}`)} unit=" hrs" delta={data.sleep.delta} detail={metricNote(data.sleep, "Last sleep window")} status={metricStatus(data.sleep)} tone="warning"><div className="sleep-bar"><span style={{ width: data.sleep.state === "available" ? "100%" : "0%" }} /></div><div className="progress-label"><span>{data.sleep.state === "available" ? "Duration recorded" : metricNote(data.sleep, "No sleep duration available")}</span><span>{data.sleep.state === "available" ? "Google Health" : "—"}</span></div></Card>
    </section>
    <section className="section-block">
      <div className="section-title"><span>SECONDARY SIGNALS</span><span className="section-rule" /></div>
      <div className="signal-grid">
        <div className="signal-card"><span>HRV</span><strong>{signalText(data.hrv, formatNumber, "ms")}</strong><small className={data.hrv.delta !== undefined ? "delta-positive" : ""}>{data.hrv.delta === undefined ? metricNote(data.hrv, "No baseline available") : `${data.hrv.delta >= 0 ? "+" : ""}${data.hrv.delta} vs baseline`}</small></div>
        <div className="signal-card"><span>SpO2</span><strong>{signalText(data.oxygenSaturation, formatNumber, "%")}</strong><small>{metricNote(data.oxygenSaturation, "No reading available")}</small></div>
        <div className="signal-card"><span>RESPIRATORY</span><strong>{signalText(data.respiratoryRate, (value) => value.toFixed(1), "brpm")}</strong><small>{metricNote(data.respiratoryRate, "No reading available")}</small></div>
        <div className="signal-card"><span>ZONE MINUTES</span><strong>{signalText(data.activeZoneMinutes, formatNumber, "min")}</strong><small>{metricNote(data.activeZoneMinutes, "No reading available")}</small></div>
      </div>
    </section>
    <section className="brief-panel"><div className="brief-label"><span className="live-dot" /> DAILY BRIEF <span>{data.source === "mock" ? "MOCK DATA" : "SIGNALS ONLY"}</span></div><p>{brief}</p><button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-ask"))}>Ask about this <span>→</span></button></section>
  </>;
}

function DetailView({ route, data }: { route: Route; data: HealthSnapshot }) {
  const copy: Record<Route, { title: string; summary: string }> = {
    heart: { title: "Heart telemetry", summary: `${metricDisplay(data.restingHeartRate, formatNumber)} bpm resting heart rate, ${metricDisplay(data.hrv, formatNumber)} ms HRV, and a seven-day view of your personal signal.` },
    sleep: { title: "Sleep continuity", summary: `${metricDisplay(data.sleep, (value) => value.toFixed(1))} hours recorded in the latest sleep window. More detailed stages will appear when Google Health data is connected.` },
    activity: { title: "Activity trace", summary: `${metricDisplay(data.steps, formatNumber)} steps and ${metricDisplay(data.activeZoneMinutes, formatNumber)} active zone minutes today.` },
    trends: { title: "Personal trends", summary: "Compare current readings with seven-day and thirty-day personal baselines." },
    today: { title: "Today", summary: "Your health command center." },
    ask: { title: "Ask Health", summary: "Ask a focused question about the data available to SYSBODY." },
  };
  const item = copy[route];
  return <div className="detail-view"><div className="eyebrow">VIEW // {route.toUpperCase()}</div><h2>{item.title}</h2><p>{item.summary}</p>{route === "trends" ? <TrendsView data={data} /> : <div className="empty-detail"><span>◌</span><strong>Detailed view is staged for the next phase</strong><small>Phase 1 keeps the shell navigable while the Google Health provider is built.</small></div>}</div>;
}

export default function App() {
  const [route, setRoute] = useState<Route>("today");
  const [data, setData] = useState<HealthSnapshot | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [themeId, setThemeId] = useState(savedThemeId);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      let auth: { connected: boolean } | null = null;
      try {
        const authResponse = await fetch("/api/auth/status");
        const contentType = authResponse.headers.get("content-type") ?? "";
        if (authResponse.ok && contentType.includes("application/json")) {
          auth = await authResponse.json() as { connected: boolean };
        }
      } catch {
        // Static deployments do not have the local Vite API routes.
      }
      if (!auth) {
        setGoogleConnected(false);
        setData(await mockProvider.getToday());
        setLoadError(null);
        setLastRefresh(new Date());
        return;
      }
      setGoogleConnected(auth.connected);
      setData(await (auth.connected ? googleProvider : mockProvider).getToday());
      setLoadError(null);
      setLastRefresh(new Date());
    } catch (error) {
      setData(null);
      setLoadError(error instanceof Error ? error.message : "health-data-unavailable");
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { applyTheme(themeId); }, [themeId]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === "INPUT") return;
      if (event.key === "?") setHelpOpen(true);
      else if (event.key === "Escape") setHelpOpen(false);
      else if (event.key === "r") void refresh();
      else if (event.key === "/") { event.preventDefault(); setRoute("ask"); }
      else { const target = routes.find((item) => item.shortcut === event.key); if (target) setRoute(target.key); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => { const handler = () => setRoute("ask"); window.addEventListener("open-ask", handler); return () => window.removeEventListener("open-ask", handler); }, []);

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-glyph">+</span><strong>SYSBODY</strong><span className="brand-divider">//</span><small>LOCAL HUMAN COMMAND CENTER</small></div><div className="top-meta"><span><i className="live-dot" /> SYSTEM ONLINE</span><label className="theme-picker"><span>THEME</span><select value={themeId} onChange={(event) => setThemeId(event.target.value)} aria-label="Color theme">{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}</select></label><button onClick={() => void refresh()} disabled={refreshing} title="Refresh data (r)">{refreshing ? "SYNCING …" : "SYNC ↻"}</button></div></header>
    <div className="layout"><aside className="sidebar"><div className="nav-label">NAVIGATION</div>{routes.map((item) => <button key={item.key} className={route === item.key ? "active" : ""} onClick={() => setRoute(item.key)}><span><b>{item.shortcut}</b>{item.label}</span>{route === item.key && <em>●</em>}</button>)}<button className={route === "ask" ? "active" : ""} onClick={() => setRoute("ask")}><span><b>/</b>Ask Health</span>{route === "ask" && <em>●</em>}</button><div className="sidebar-footer"><div className="connection"><span className={`status-dot ${googleConnected ? "connected" : "mock"}`} /> <span>{googleConnected ? "GOOGLE HEALTH" : "MOCK PROVIDER"}<small>{googleConnected ? "CONNECTED" : "GOOGLE HEALTH // PENDING"}</small></span></div>{googleConnected ? <button onClick={() => { void fetch("/auth/google/logout").then(() => setGoogleConnected(false)); }} className="help-link">× DISCONNECT</button> : <button onClick={() => { window.location.href = "/auth/google/start"; }} className="help-link">+ CONNECT GOOGLE</button>}<button onClick={() => setHelpOpen(true)} className="help-link">? SHORTCUTS</button></div></aside>
      <main><div className="page-header"><div><div className="eyebrow">HEALTH // {route.toUpperCase()}</div><h1>{route === "today" ? "How are you doing today?" : route === "ask" ? "Ask Health" : route}</h1></div><div className="date-block"><strong>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</strong><span>LAST SYNC {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div></div>{data ? route === "today" ? <Today data={data} /> : <DetailView route={route} data={data} /> : loadError ? <div className="empty-detail"><span>!</span><strong>Health data unavailable</strong><small>{loadError}</small><button className="retry-button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Retrying…" : "Retry sync"}</button></div> : <div className="loading" aria-live="polite">LOADING HEALTH SIGNALS<span>...</span></div>}</main>
    </div><footer className="statusbar"><span>LOCALHOST // READ-ONLY MODE</span><span>DATA SOURCE: {data?.source.toUpperCase() ?? "CONNECTING"}</span><span>PRESS <b>?</b> FOR HELP</span></footer>
    {helpOpen && <div className="overlay" role="dialog" aria-modal="true"><div className="help-modal"><div className="modal-heading"><span>KEYBOARD MAP</span><button onClick={() => setHelpOpen(false)}>ESC</button></div>{[["1—5", "Switch views"],["/", "Ask Health"],["r", "Refresh data"],["j / k", "Navigate lists"],["Esc", "Close overlay"]].map(([key, label]) => <div className="shortcut" key={key}><kbd>{key}</kbd><span>{label}</span></div>)}<p>SYSBODY is local-first. Connection to Google Health will be enabled after OAuth setup.</p></div></div>}
  </div>;
}
