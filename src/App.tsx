import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatNumber, metricDisplay, type HealthSnapshot } from "./domain";
import { GoogleHealthProvider } from "./googleProvider";
import { MockHealthProvider } from "./mockProvider";
import { applyTheme, loadTheme } from "./theme";

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
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - ((value - min) / (max - min || 1)) * 76 - 12}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="seven day trend"><polyline points={points} /></svg>;
}

function Card({ label, value, unit, delta, detail, tone = "accent", children }: { label: string; value: string; unit?: string; delta?: number; detail: string; tone?: string; children?: ReactNode }) {
  return <article className={`metric-card tone-${tone}`}>
    <div className="card-heading"><span>{label}</span><span className="card-mark">{tone === "positive" ? "↑" : "◈"}</span></div>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <div className="metric-meta"><span>{detail}</span>{delta !== undefined && <span className={delta >= 0 ? "delta-positive" : "delta-negative"}>{delta >= 0 ? "+" : ""}{delta} vs avg</span>}</div>
    {children}
  </article>;
}

function Today({ data }: { data: HealthSnapshot }) {
  const brief = useMemo(() => data.source === "mock"
    ? "Recovery signals look stable. HRV is above your recent baseline and resting heart rate is below average. Sleep ran shorter than normal, while activity is tracking close to your usual pace."
    : "Connected Google Health signals are available above. Daily interpretation will be added after the normalized trends layer is complete.", [data.source]);
  const stepsProgress = data.steps.value !== undefined && data.steps.baseline !== undefined ? Math.min(100, Math.round((data.steps.value / data.steps.baseline) * 100)) : undefined;
  const recoveryState = data.hrv.state === "available" || data.restingHeartRate.state === "available" ? "SIGNALS ONLY" : "NO DATA";
  return <>
    <section className="hero-grid">
      <Card label="Recovery signals" value={recoveryState} detail="No readiness score available" tone="positive"><div className="signal-row"><span className="signal good">HRV {metricDisplay(data.hrv, formatNumber)} ms</span><span className="signal good">RHR {metricDisplay(data.restingHeartRate, formatNumber)} bpm</span></div></Card>
      <Card label="Steps / activity" value={metricDisplay(data.steps, formatNumber)} unit=" steps" delta={data.steps.delta} detail="Today so far" tone="accent"><div className="progress"><span style={{ width: `${stepsProgress ?? 0}%` }} /></div><div className="progress-label"><span>{stepsProgress === undefined ? "No baseline available" : `${stepsProgress}% of recent daily average`}</span><span>{data.source === "mock" ? "06:42 PM" : "Google Health"}</span></div></Card>
      <Card label="Resting heart rate" value={metricDisplay(data.restingHeartRate, formatNumber)} unit=" bpm" delta={data.restingHeartRate.delta} detail="7-day personal baseline" tone="positive"><Sparkline values={data.trend} /></Card>
      <Card label="Sleep" value={metricDisplay(data.sleep, (value) => `${value.toFixed(1)}`)} unit=" hrs" delta={data.sleep.delta} detail="Last sleep window" tone="warning"><div className="sleep-bar"><span style={{ width: "82%" }} /></div><div className="progress-label"><span>11:18 PM → 06:31 AM</span><span>82% quality</span></div></Card>
    </section>
    <section className="section-block">
      <div className="section-title"><span>SECONDARY SIGNALS</span><span className="section-rule" /></div>
      <div className="signal-grid">
        <div className="signal-card"><span>HRV</span><strong>{metricDisplay(data.hrv, formatNumber)} <em>ms</em></strong><small className="delta-positive">+4 above baseline</small></div>
        <div className="signal-card"><span>SpO2</span><strong>{metricDisplay(data.oxygenSaturation, formatNumber)}<em>%</em></strong><small>Within usual range</small></div>
        <div className="signal-card"><span>RESPIRATORY</span><strong>{metricDisplay(data.respiratoryRate, (value) => value.toFixed(1))}<em> brpm</em></strong><small>Stable overnight</small></div>
        <div className="signal-card"><span>ZONE MINUTES</span><strong>{metricDisplay(data.activeZoneMinutes, formatNumber)}<em> min</em></strong><small className="delta-positive">+4 vs baseline</small></div>
      </div>
    </section>
    <section className="brief-panel"><div className="brief-label"><span className="live-dot" /> DAILY BRIEF <span>{data.source === "mock" ? "MOCK DATA" : "SIGNALS ONLY"}</span></div><p>{brief}</p><button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-ask"))}>Ask about this <span>→</span></button></section>
  </>;
}

function DetailView({ route, data }: { route: Route; data: HealthSnapshot }) {
  const copy: Record<Route, { title: string; summary: string }> = {
    heart: { title: "Heart telemetry", summary: `${data.restingHeartRate.value} bpm resting heart rate, ${data.hrv.value} ms HRV, and a seven-day view of your personal signal.` },
    sleep: { title: "Sleep continuity", summary: `${data.sleep.value?.toFixed(1)} hours recorded in the latest sleep window. More detailed stages will appear when Google Health data is connected.` },
    activity: { title: "Activity trace", summary: `${formatNumber(data.steps.value)} steps and ${data.activeZoneMinutes.value} active zone minutes today.` },
    trends: { title: "Personal trends", summary: "Compare current readings with seven-day and thirty-day personal baselines." },
    today: { title: "Today", summary: "Your health command center." },
    ask: { title: "Ask Health", summary: "Ask a focused question about the data available to SYSBODY." },
  };
  const item = copy[route];
  return <div className="detail-view"><div className="eyebrow">VIEW // {route.toUpperCase()}</div><h2>{item.title}</h2><p>{item.summary}</p><div className="empty-detail"><span>◌</span><strong>Detailed view is staged for the next phase</strong><small>Phase 1 keeps the shell navigable while the Google Health provider is built.</small></div></div>;
}

export default function App() {
  const [route, setRoute] = useState<Route>("today");
  const [data, setData] = useState<HealthSnapshot | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [themeName, setThemeName] = useState("fallback");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const authResponse = await fetch("/api/auth/status");
      if (!authResponse.ok) {
        setGoogleConnected(false);
        setData(await mockProvider.getToday());
        setLoadError(null);
        setLastRefresh(new Date());
        return;
      }
      const auth = await authResponse.json() as { connected: boolean };
      setGoogleConnected(auth.connected);
      setData(await (auth.connected ? googleProvider : mockProvider).getToday());
      setLoadError(null);
      setLastRefresh(new Date());
    } catch (error) {
      setData(null);
      setLoadError(error instanceof Error ? error.message : "health-data-unavailable");
    }
  };
  useEffect(() => { void refresh(); void loadTheme().then((theme) => { setThemeName(theme.name); applyTheme(theme); }); }, []);
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
    <header className="topbar"><div className="brand"><span className="brand-glyph">+</span><strong>SYSBODY</strong><span className="brand-divider">//</span><small>LOCAL HUMAN COMMAND CENTER</small></div><div className="top-meta"><span><i className="live-dot" /> SYSTEM ONLINE</span><span>THEME // {themeName.toUpperCase()}</span><button onClick={() => void refresh()} title="Refresh data (r)">SYNC ↻</button></div></header>
    <div className="layout"><aside className="sidebar"><div className="nav-label">NAVIGATION</div>{routes.map((item) => <button key={item.key} className={route === item.key ? "active" : ""} onClick={() => setRoute(item.key)}><span><b>{item.shortcut}</b>{item.label}</span>{route === item.key && <em>●</em>}</button>)}<button className={route === "ask" ? "active" : ""} onClick={() => setRoute("ask")}><span><b>/</b>Ask Health</span>{route === "ask" && <em>●</em>}</button><div className="sidebar-footer"><div className="connection"><span className={`status-dot ${googleConnected ? "connected" : "mock"}`} /> <span>{googleConnected ? "GOOGLE HEALTH" : "MOCK PROVIDER"}<small>{googleConnected ? "CONNECTED" : "GOOGLE HEALTH // PENDING"}</small></span></div>{googleConnected ? <button onClick={() => { void fetch("/auth/google/logout").then(() => setGoogleConnected(false)); }} className="help-link">× DISCONNECT</button> : <button onClick={() => { window.location.href = "/auth/google/start"; }} className="help-link">+ CONNECT GOOGLE</button>}<button onClick={() => setHelpOpen(true)} className="help-link">? SHORTCUTS</button></div></aside>
      <main><div className="page-header"><div><div className="eyebrow">HEALTH // {route.toUpperCase()}</div><h1>{route === "today" ? "How are you doing today?" : route === "ask" ? "Ask Health" : route}</h1></div><div className="date-block"><strong>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</strong><span>LAST SYNC {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div></div>{data ? route === "today" ? <Today data={data} /> : <DetailView route={route} data={data} /> : loadError ? <div className="empty-detail"><strong>Health data unavailable</strong><small>{loadError}</small></div> : <div className="loading">LOADING HEALTH SIGNALS<span>...</span></div>}</main>
    </div><footer className="statusbar"><span>LOCALHOST // READ-ONLY MODE</span><span>DATA SOURCE: {data?.source.toUpperCase() ?? "CONNECTING"}</span><span>PRESS <b>?</b> FOR HELP</span></footer>
    {helpOpen && <div className="overlay" role="dialog" aria-modal="true"><div className="help-modal"><div className="modal-heading"><span>KEYBOARD MAP</span><button onClick={() => setHelpOpen(false)}>ESC</button></div>{[["1—5", "Switch views"],["/", "Ask Health"],["r", "Refresh data"],["j / k", "Navigate lists"],["Esc", "Close overlay"]].map(([key, label]) => <div className="shortcut" key={key}><kbd>{key}</kbd><span>{label}</span></div>)}<p>SYSBODY is local-first. Connection to Google Health will be enabled after OAuth setup.</p></div></div>}
  </div>;
}
