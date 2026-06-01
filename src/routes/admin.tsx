import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminConsole,
  head: () => ({
    meta: [
      { title: "Admin Console — Skill Hub" },
      { name: "description", content: "Admin-only console: endpoints, sessions, captured API keys, audit log, registry health." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

interface Stats {
  endpoints: number;
  endpoints_24h: number;
  unique_hosts: number;
  unique_extension: number;
  unique_skillhub: number;
  sessions: number;
  sessions_24h: number;
  executions: number;
  exec_errors_24h: number;
  skills: number;
  keys_captured: number;
  allowlist_enabled: number;
  audit_entries: number;
}

interface EndpointRow {
  id: number;
  url: string;
  host: string | null;
  method: string | null;
  status_code: number | null;
  resource_type: string | null;
  source: string | null;
  captured_at: string | null;
  tab_url: string | null;
}

interface KeyRow {
  id: number;
  pattern_name: string;
  redacted_preview: string;
  source_url: string | null;
  source_header: string | null;
  captured_at: string | null;
}

interface SessionRow {
  id: string;
  task: string;
  status: string | null;
  total_skills: number | null;
  duration_ms: number | null;
  estimated_cost: string | null;
  created_at: string | null;
}

interface AuditRow { id: number; action: string; table_name: string | null; record_id: string | null; details: string | null; created_at: string | null }

interface InvocationRow {
  id: string;
  request_id: string;
  skill: string;
  status: string;
  duration_ms: number | null;
  callback_url: string | null;
  callback_attempts: number;
  callback_delivered: boolean;
  callback_last_status: number | null;
  created_at: string | null;
}

type Tab = "overview" | "endpoints" | "keys" | "sessions" | "invocations" | "audit";

function AdminConsole() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointRow[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [invocations, setInvocations] = useState<InvocationRow[]>([]);
  const [hostFilter, setHostFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const loadStats = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [
      { count: epAll },
      { count: ep24 },
      { data: hostsData },
      { count: extCount },
      { count: hubCount },
      { count: sAll },
      { count: s24 },
      { count: execAll },
      { count: execErr },
      { count: skillsCount },
      { count: keysCount },
      { count: allowEnabled },
      { count: auditCount },
    ] = await Promise.all([
      supabase.from("api_endpoints").select("*", { count: "exact", head: true }),
      supabase.from("api_endpoints").select("*", { count: "exact", head: true }).gte("captured_at", since),
      supabase.from("api_endpoints").select("host").limit(2000),
      supabase.from("api_endpoints").select("*", { count: "exact", head: true }).eq("source", "extension"),
      supabase.from("api_endpoints").select("*", { count: "exact", head: true }).eq("source", "skillhub-api"),
      supabase.from("agent_sessions").select("*", { count: "exact", head: true }),
      supabase.from("agent_sessions").select("*", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("execution_log").select("*", { count: "exact", head: true }),
      supabase.from("execution_log").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("skills").select("*", { count: "exact", head: true }),
      supabase.from("api_keys_detected").select("*", { count: "exact", head: true }),
      supabase.from("api_endpoint_allowlist").select("*", { count: "exact", head: true }).eq("enabled", true),
      supabase.from("audit_log").select("*", { count: "exact", head: true }),
    ]);
    const uniqueHosts = new Set((hostsData ?? []).map((r) => r.host).filter(Boolean)).size;
    setStats({
      endpoints: epAll ?? 0,
      endpoints_24h: ep24 ?? 0,
      unique_hosts: uniqueHosts,
      unique_extension: extCount ?? 0,
      unique_skillhub: hubCount ?? 0,
      sessions: sAll ?? 0,
      sessions_24h: s24 ?? 0,
      executions: execAll ?? 0,
      exec_errors_24h: execErr ?? 0,
      skills: skillsCount ?? 0,
      keys_captured: keysCount ?? 0,
      allowlist_enabled: allowEnabled ?? 0,
      audit_entries: auditCount ?? 0,
    });
  }, []);

  const loadEndpoints = useCallback(async () => {
    let q = supabase.from("api_endpoints").select("id,url,host,method,status_code,resource_type,source,captured_at,tab_url").order("captured_at", { ascending: false }).limit(200);
    if (hostFilter.trim()) q = q.ilike("host", `%${hostFilter.trim()}%`);
    if (sourceFilter) q = q.eq("source", sourceFilter);
    const { data } = await q;
    setEndpoints((data ?? []) as EndpointRow[]);
  }, [hostFilter, sourceFilter]);

  const loadKeys = useCallback(async () => {
    const { data } = await supabase.from("api_keys_detected").select("*").order("captured_at", { ascending: false }).limit(200);
    setKeys((data ?? []) as KeyRow[]);
  }, []);

  const loadSessions = useCallback(async () => {
    const { data } = await supabase.from("agent_sessions").select("id,task,status,total_skills,duration_ms,estimated_cost,created_at").order("created_at", { ascending: false }).limit(100);
    setSessions((data ?? []) as SessionRow[]);
  }, []);

  const loadAudit = useCallback(async () => {
    const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    setAudit((data ?? []) as AuditRow[]);
  }, []);

  const loadInvocations = useCallback(async () => {
    const { data } = await supabase
      .from("skill_invocations")
      .select("id,request_id,skill,status,duration_ms,callback_url,callback_attempts,callback_delivered,callback_last_status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setInvocations((data ?? []) as InvocationRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      if (admin) await loadStats();
      setLoading(false);
    })();
  }, [loadStats]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "endpoints") loadEndpoints();
    if (tab === "keys") loadKeys();
    if (tab === "sessions") loadSessions();
    if (tab === "invocations") loadInvocations();
    if (tab === "audit") loadAudit();
  }, [tab, isAdmin, loadEndpoints, loadKeys, loadSessions, loadInvocations, loadAudit]);

  const deleteEndpoint = async (id: number) => {
    if (!confirm("Delete endpoint row?")) return;
    await supabase.from("api_endpoints").delete().eq("id", id);
    await Promise.all([loadEndpoints(), loadStats()]);
  };
  const deleteKey = async (id: number) => {
    if (!confirm("Delete captured key row?")) return;
    await supabase.from("api_keys_detected").delete().eq("id", id);
    await Promise.all([loadKeys(), loadStats()]);
  };

  if (loading) return <div className="p-7 text-[12px] text-hub-text-muted">Loading admin console…</div>;

  if (!isAdmin) {
    return (
      <div className="p-7 max-w-[620px] mx-auto">
        <div className="bg-hub-surface border border-hub-border rounded-lg p-5">
          <div className="text-[10px] tracking-[0.18em] uppercase text-hub-text-dim mb-2">Restricted</div>
          <div className="text-[13px] font-bold text-foreground mb-1">Admin access required</div>
          <div className="text-[11px] text-hub-text-muted">
            {email ? <>Signed in as <span className="font-mono">{email}</span> — this account is not an admin.</> : <>You are not signed in. Use the top bar to sign in with Google.</>}
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "endpoints", label: "Endpoints" },
    { id: "keys", label: "Captured Keys" },
    { id: "sessions", label: "Sessions" },
    { id: "invocations", label: "Invocations" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <div className="p-7 max-w-[1280px] mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">System · Restricted</div>
          <h1 className="font-display text-2xl font-black text-foreground tracking-tight" style={{ color: "#fbbf24" }}>
            Admin Console
          </h1>
          <p className="text-[11px] text-hub-text-muted mt-1">
            Signed in as <span className="font-mono">{email}</span> · admin role
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/allowlist" className="px-3 py-1.5 text-[10px] tracking-wider uppercase font-bold rounded border border-hub-border text-hub-text-muted hover:text-foreground">Allowlist</Link>
          <Link to="/database" className="px-3 py-1.5 text-[10px] tracking-wider uppercase font-bold rounded border border-hub-border text-hub-text-muted hover:text-foreground">Database</Link>
          <Link to="/config" className="px-3 py-1.5 text-[10px] tracking-wider uppercase font-bold rounded border border-hub-border text-hub-text-muted hover:text-foreground">Config</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-hub-border">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 text-[11px] font-bold tracking-wider uppercase cursor-pointer"
            style={{
              color: tab === t.id ? "#fbbf24" : "var(--hub-text-muted)",
              borderBottom: tab === t.id ? "2px solid #fbbf24" : "2px solid transparent",
              background: "transparent",
            }}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Endpoints (all)" value={stats.endpoints} sub={`+${stats.endpoints_24h} in 24h`} />
          <StatCard label="Unique hosts" value={stats.unique_hosts} sub="last 2000 rows" />
          <StatCard label="From extension" value={stats.unique_extension} />
          <StatCard label="From SkillHub API" value={stats.unique_skillhub} />
          <StatCard label="Agent sessions" value={stats.sessions} sub={`+${stats.sessions_24h} in 24h`} />
          <StatCard label="Skill executions" value={stats.executions} sub={`${stats.exec_errors_24h} failed`} accent={stats.exec_errors_24h > 0 ? "#ef4444" : undefined} />
          <StatCard label="Skills registered" value={stats.skills} />
          <StatCard label="Captured keys" value={stats.keys_captured} accent={stats.keys_captured > 0 ? "#ef4444" : undefined} />
          <StatCard label="Allowlist (enabled)" value={stats.allowlist_enabled} />
          <StatCard label="Audit entries" value={stats.audit_entries} />
        </div>
      )}

      {tab === "endpoints" && (
        <div>
          <div className="flex gap-2 mb-3">
            <input value={hostFilter} onChange={e => setHostFilter(e.target.value)} placeholder="host contains…" className="flex-1 bg-hub-bg border border-hub-border rounded px-3 py-1.5 text-[11px] font-mono text-foreground" />
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="bg-hub-bg border border-hub-border rounded px-3 py-1.5 text-[11px] text-foreground">
              <option value="">all sources</option>
              <option value="extension">extension</option>
              <option value="skillhub-api">skillhub-api</option>
            </select>
            <button onClick={loadEndpoints} className="px-3 py-1.5 rounded text-[11px] font-bold border border-hub-border text-foreground cursor-pointer">Reload</button>
          </div>
          <DataTable
            cols={["captured_at", "source", "method", "status", "host", "url", ""]}
            rows={endpoints.map(r => [
              fmtTime(r.captured_at), r.source ?? "", r.method ?? "", String(r.status_code ?? ""), r.host ?? "", <span key="u" className="font-mono text-[10px] truncate inline-block max-w-[420px]">{r.url}</span>,
              <button key="d" onClick={() => deleteEndpoint(r.id)} className="text-[10px] text-hub-text-dim hover:text-red-400 cursor-pointer">✕</button>,
            ])}
          />
        </div>
      )}

      {tab === "keys" && (
        <div>
          <div className="mb-3 text-[10px] text-hub-text-muted">⚠ Sensitive: values are stored redacted. Investigate the source URL and delete after triage.</div>
          <DataTable
            cols={["captured_at", "pattern", "redacted", "header", "source_url", ""]}
            rows={keys.map(k => [
              fmtTime(k.captured_at), k.pattern_name, <code key="r" className="font-mono text-[10px]">{k.redacted_preview}</code>, k.source_header ?? "", <span key="s" className="font-mono text-[10px] truncate inline-block max-w-[360px]">{k.source_url ?? ""}</span>,
              <button key="d" onClick={() => deleteKey(k.id)} className="text-[10px] text-hub-text-dim hover:text-red-400 cursor-pointer">✕</button>,
            ])}
          />
        </div>
      )}

      {tab === "sessions" && (
        <DataTable
          cols={["created_at", "status", "skills", "duration", "cost", "task"]}
          rows={sessions.map(s => [
            fmtTime(s.created_at), s.status ?? "", String(s.total_skills ?? 0), s.duration_ms ? `${s.duration_ms}ms` : "", s.estimated_cost ?? "",
            <span key="t" className="truncate inline-block max-w-[560px]">{s.task}</span>,
          ])}
        />
      )}

      {tab === "audit" && (
        <DataTable
          cols={["created_at", "action", "table", "record", "details"]}
          rows={audit.map(a => [fmtTime(a.created_at), a.action, a.table_name ?? "", a.record_id ?? "", <span key="d" className="truncate inline-block max-w-[520px]">{a.details ?? ""}</span>])}
        />
      )}

      {tab === "invocations" && (
        <div>
          <div className="mb-3 text-[10px] text-hub-text-muted">Outbound invokes via <span className="font-mono">/api/public/skillhub</span> with their async Sophie callback delivery status.</div>
          <DataTable
            cols={["created_at", "skill", "status", "duration", "cb attempts", "cb last", "delivered", "request_id"]}
            rows={invocations.map(i => [
              fmtTime(i.created_at),
              i.skill,
              i.status,
              i.duration_ms != null ? `${i.duration_ms}ms` : "",
              String(i.callback_attempts),
              i.callback_last_status != null ? String(i.callback_last_status) : (i.callback_url ? "—" : "n/a"),
              <span key="d" style={{ color: i.callback_delivered ? "#22c55e" : i.callback_url ? "#ef4444" : "var(--hub-text-dim)" }}>
                {i.callback_url ? (i.callback_delivered ? "yes" : "no") : "no url"}
              </span>,
              <span key="r" className="font-mono text-[10px] truncate inline-block max-w-[200px]">{i.request_id}</span>,
            ])}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
      <div className="text-[9px] tracking-[0.18em] uppercase text-hub-text-dim mb-1">{label}</div>
      <div className="font-display text-2xl font-black" style={{ color: accent ?? "var(--foreground)" }}>{value.toLocaleString()}</div>
      {sub && <div className="text-[10px] text-hub-text-muted mt-1">{sub}</div>}
    </div>
  );
}

function DataTable({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="bg-hub-surface border border-hub-border rounded-lg overflow-hidden">
      <div className="grid border-b border-hub-border" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
        {cols.map((c, i) => <div key={i} className="px-3 py-2 text-[9px] tracking-[0.15em] uppercase text-hub-text-dim font-bold">{c}</div>)}
      </div>
      {rows.length === 0 ? (
        <div className="p-4 text-[11px] text-hub-text-muted">No rows.</div>
      ) : rows.map((r, i) => (
        <div key={i} className="grid border-b border-hub-border last:border-b-0 hover:bg-hub-surface-hover" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
          {r.map((cell, j) => <div key={j} className="px-3 py-2 text-[11px] text-foreground overflow-hidden">{cell}</div>)}
        </div>
      ))}
    </div>
  );
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}