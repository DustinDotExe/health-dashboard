import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { formatNumber, metricDisplay, metricStatus, type HealthSnapshot, type Metric, type TrendPoint } from "./domain";
import { GoogleHealthProvider } from "./googleProvider";
import { MockHealthProvider } from "./mockProvider";
import { applyTheme, savedThemeId, themes } from "./theme";
import { createDailyBriefContext, createLocalDailyBrief } from "./dailyBrief";

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

function metricText(metric: Metric<number>, digits = 0) {
  return metricDisplay(metric, (value) => formatNumber(value, digits));
}

function signed(value: number | undefined, digits = 0) {
  if (value === undefined) return "No baseline yet";
  return `${value >= 0 ? "+" : ""}${formatNumber(value, digits)} vs baseline`;
}

function MetricTrend({ label, metric, points, unit, digits = 0, lowerIsBetter = false }: { label: string; metric: Metric<number>; points: TrendPoint[]; unit: string; digits?: number; lowerIsBetter?: boolean }) {
  const delta = metric.delta;
  const favorable = delta === undefined ? undefined : lowerIsBetter ? delta <= 0 : delta >= 0;
  return <article className="detail-metric">
    <div className="detail-metric-heading"><span>{label}</span><span>{metricStatus(metric)}</span></div>
    <strong>{metricText(metric, digits)} <small>{unit}</small></strong>
    <div className={`detail-delta ${favorable === undefined ? "" : favorable ? "positive" : "warning"}`}>{signed(delta, digits)}</div>
    <Sparkline values={points.map((point) => point.value)} />
    <small className="detail-caption">{points.length > 1 ? `Last ${points.length} readings · personal baseline ${metric.baseline === undefined ? "unavailable" : `${formatNumber(metric.baseline, digits)} ${unit}`}` : metric.note ?? "Trend data unavailable"}</small>
  </article>;
}

function HeartView({ data }: { data: HealthSnapshot }) {
  const [window, setWindow] = useState<"sevenDay" | "thirtyDay">("sevenDay");
  const trends = data.trends[window];
  return <div className="detail-view">
    <div className="eyebrow">VIEW // HEART</div><h2>Heart telemetry</h2>
    <p>Compare resting heart rate and HRV with the personal history returned by Google Health. These are observations, not medical assessments.</p>
    <div className="trend-controls"><button className={window === "sevenDay" ? "active" : ""} onClick={() => setWindow("sevenDay")}>7 DAYS</button><button className={window === "thirtyDay" ? "active" : ""} onClick={() => setWindow("thirtyDay")}>30 DAYS</button></div>
    <div className="detail-metric-grid">
      <MetricTrend label="RESTING HEART RATE" metric={data.restingHeartRate} points={trends.restingHeartRate} unit="bpm" lowerIsBetter />
      <MetricTrend label="HEART RATE VARIABILITY" metric={data.hrv} points={trends.hrv} unit="ms" />
    </div>
    <section className="detail-signals"><div><span>OXYGEN SATURATION</span><strong>{metricText(data.oxygenSaturation)}%</strong><small>{data.oxygenSaturation.note ?? signed(data.oxygenSaturation.delta)}</small></div><div><span>RESPIRATORY RATE</span><strong>{metricText(data.respiratoryRate, 1)} brpm</strong><small>{data.respiratoryRate.note ?? signed(data.respiratoryRate.delta, 1)}</small></div></section>
  </div>;
}

function SleepView({ data }: { data: HealthSnapshot }) {
  const points = data.trends.thirtyDay.sleep;
  const recorded = points.length;
  const average = recorded ? points.reduce((total, point) => total + point.value, 0) / recorded : undefined;
  const range = recorded > 1 ? `${formatNumber(Math.min(...points.map((point) => point.value)), 1)}—${formatNumber(Math.max(...points.map((point) => point.value)), 1)} hrs` : "Insufficient readings";
  return <div className="detail-view">
    <div className="eyebrow">VIEW // SLEEP</div><h2>Sleep continuity</h2>
    <p>Sleep duration is assigned to the local day in which the recorded sleep window ends. Missing nights are omitted rather than counted as zero.</p>
    <div className="detail-metric-grid one-up"><MetricTrend label="LATEST SLEEP DURATION" metric={data.sleep} points={data.trends.thirtyDay.sleep} unit="hrs" digits={1} /></div>
    <section className="detail-signals sleep-summary"><div><span>READINGS RETURNED</span><strong>{recorded}</strong><small>Last 30 calendar days</small></div><div><span>RECORDED AVERAGE</span><strong>{average === undefined ? "—" : `${formatNumber(average, 1)} hrs`}</strong><small>Only nights Google Health returned</small></div><div><span>RECORDED RANGE</span><strong>{range}</strong><small>No missing-value interpolation</small></div></section>
    <p className="detail-note">Sleep-stage and bedtime consistency require additional normalized fields. They are intentionally not inferred from duration alone.</p>
  </div>;
}

function ActivityView({ data }: { data: HealthSnapshot }) {
  const points = data.trends.thirtyDay.steps;
  const currentHour = new Date().getHours();
  const timeLabel = currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening";
  return <div className="detail-view">
    <div className="eyebrow">VIEW // ACTIVITY</div><h2>Activity trace</h2>
    <p>Steps are today’s partial total. The comparison remains labeled against completed-day history, so it is context—not a daily verdict—until time-of-day normalization is available.</p>
    <div className="detail-metric-grid">
      <MetricTrend label="STEPS TODAY" metric={data.steps} points={points} unit="steps" />
      <article className="detail-metric"><div className="detail-metric-heading"><span>ACTIVE ZONE MINUTES</span><span>{metricStatus(data.activeZoneMinutes)}</span></div><strong>{metricText(data.activeZoneMinutes)} <small>min</small></strong><div className="detail-delta">{signed(data.activeZoneMinutes.delta)}</div><div className="activity-meter"><span style={{ width: data.activeZoneMinutes.value === undefined || data.activeZoneMinutes.baseline === undefined ? "0%" : `${Math.min(100, Math.round((data.activeZoneMinutes.value / data.activeZoneMinutes.baseline) * 100))}%` }} /></div><small className="detail-caption">{data.activeZoneMinutes.note ?? "Today so far · trend history is not available from the normalized provider yet."}</small></article>
    </div>
    <section className="detail-signals"><div><span>DAY PROGRESS</span><strong>{timeLabel.toUpperCase()}</strong><small>Local browser time</small></div><div><span>STEP READINGS</span><strong>{points.length}</strong><small>Returned in the last 30 days</small></div></section>
  </div>;
}

const askSuggestions = ["How has my sleep been this week?", "Is my resting heart rate changing?", "What changed most over the last week?", "Show me my HRV trend."];

function localAnswer(question: string, data: HealthSnapshot) {
  const normalized = question.toLowerCase();
  if (normalized.includes("sleep")) return `Sleep is ${metricText(data.sleep, 1)} hours in the latest window, ${signed(data.sleep.delta, 1)}. Google Health returned ${data.trends.sevenDay.sleep.length} sleep readings over the last seven days.`;
  if (normalized.includes("heart") || normalized.includes("resting")) return `Resting heart rate is ${metricText(data.restingHeartRate)} bpm, ${signed(data.restingHeartRate.delta)}. The seven-day series contains ${data.trends.sevenDay.restingHeartRate.length} readings.`;
  if (normalized.includes("hrv")) return `HRV is ${metricText(data.hrv)} ms, ${signed(data.hrv.delta)}. The seven-day trend has ${data.trends.sevenDay.hrv.length} readings; use the Heart view for the chart.`;
  return `Today’s available signals are ${metricText(data.steps)} steps, ${metricText(data.sleep, 1)} hours of sleep, resting heart rate ${metricText(data.restingHeartRate)} bpm, and HRV ${metricText(data.hrv)} ms. Ask specifically about sleep, resting heart rate, HRV, or activity for a focused local summary.`;
}

function AskView({ data }: { data: HealthSnapshot }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); if (question.trim()) setAnswer(localAnswer(question, data)); };
  return <div className="detail-view ask-view"><div className="eyebrow">VIEW // ASK HEALTH</div><h2>Ask Health</h2><p>Get a local, evidence-limited summary of the currently loaded signals. This does not send health data to an AI service and does not provide medical advice.</p><form onSubmit={submit}><label htmlFor="health-question">QUESTION</label><div className="ask-input"><input id="health-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="How has my sleep been this week?" autoFocus /><button type="submit">ASK ↵</button></div></form><div className="ask-suggestions">{askSuggestions.map((suggestion) => <button key={suggestion} onClick={() => { setQuestion(suggestion); setAnswer(localAnswer(suggestion, data)); }}>{suggestion}</button>)}</div>{answer && <section className="local-answer"><span>LOCAL SIGNAL SUMMARY</span><p>{answer}</p><small>Informed by the normalized today snapshot and its seven-day trends.</small></section>}</div>;
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
  const brief = createLocalDailyBrief(createDailyBriefContext(data));
  const stepsProgress = data.steps.value !== undefined && data.steps.baseline !== undefined ? Math.min(100, Math.round((data.steps.value / data.steps.baseline) * 100)) : undefined;
  const systemStatusAvailable = data.systemStatus.state === "available" && data.systemStatus.score !== undefined;
  const signalText = (metric: HealthSnapshot["hrv"], formatter: (value: number) => string, unit: string) => `${metricDisplay(metric, formatter)} ${unit}`;
  const metricNote = (metric: HealthSnapshot["hrv"], fallback: string) => metric.note ?? fallback;
  const signalTone = (metric: Metric<unknown>) => metric.state === "available" ? "good" : metric.state === "unavailable" ? "unavailable" : "missing";
  const systemSignal = (label: string, metric: HealthSnapshot["hrv"], digits = 0) => {
    const contribution = data.systemStatus.signals.find((signal) => signal.label === label);
    const contributionText = contribution ? `${contribution.componentScore}/100 · ${contribution.contribution >= 0 ? "+" : ""}${contribution.contribution} pts` : "baseline needed";
    return <span className={`signal ${signalTone(metric)}`}>{label} {metricDisplay(metric, (value) => value.toFixed(digits))} {metric.unit} <small>{contributionText}</small></span>;
  };
  return <>
    <section className="hero-grid">
      <Card label="System // status" value={systemStatusAvailable ? String(data.systemStatus.score) : "—"} unit=" / 100" detail={data.systemStatus.note} status={systemStatusAvailable ? "DERIVED" : "INSUFFICIENT"} tone="positive"><div className="signal-row">{systemSignal("HRV", data.hrv)}{systemSignal("RHR", data.restingHeartRate)}{systemSignal("SLEEP", data.sleep, 1)}</div></Card>
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
    <section className="brief-panel"><div className="brief-label"><span className="live-dot" /> DAILY BRIEF <span>LOCAL DERIVED</span></div><p>{brief.text}</p><div className="brief-evidence"><span>SIGNALS USED: {brief.signalsUsed.length ? brief.signalsUsed.join(" · ") : "NONE"}</span><span>{brief.note}</span></div><button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-ask"))}>Ask about this <span>→</span></button></section>
  </>;
}

function DetailView({ route, data }: { route: Route; data: HealthSnapshot }) {
  if (route === "heart") return <HeartView data={data} />;
  if (route === "sleep") return <SleepView data={data} />;
  if (route === "activity") return <ActivityView data={data} />;
  if (route === "ask") return <AskView data={data} />;
  const copy: Record<Route, { title: string; summary: string }> = {
    heart: { title: "Heart telemetry", summary: "" },
    sleep: { title: "Sleep continuity", summary: "" },
    activity: { title: "Activity trace", summary: "" },
    trends: { title: "Personal trends", summary: "Compare current readings with seven-day and thirty-day personal baselines." },
    today: { title: "Today", summary: "Your health command center." },
    ask: { title: "Ask Health", summary: "" },
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
