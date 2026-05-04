import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/tracker")({
  component: TrackerPage,
  head: () => ({
    meta: [
      { title: "API Tracker — Skill Hub" },
      { name: "description", content: "Live feed of API endpoints captured by the Chrome extension" },
    ],
  }),
});

interface Endpoint {
  id: number;
  url: string;
  host: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  tab_url: string | null;
  captured_at: string | null;
}

function TrackerPage() {
  const [rows, setRows] = useState<Endpoint[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("api_endpoints")
      .select("id, url, host, method, status_code, duration_ms, tab_url, captured_at")
      .order("captured_at", { ascending: false })
      .limit(200);
    setRows((data || []) as Endpoint[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("api_endpoints_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "api_endpoints" }, payload => {
        setRows(prev => [payload.new as Endpoint, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const visible = rows.filter(r => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return r.url.toLowerCase().includes(f) || (r.host || "").toLowerCase().includes(f);
  });

  const statusColor = (s: number | null) => {
    if (!s) return "#6b7280";
    if (s >= 500) return "#dc2626";
    if (s >= 400) return "#f59e0b";
    if (s >= 300) return "#3b82f6";
    return "#16a34a";
  };

  const clearAll = async () => {
    if (!confirm("Delete all captured endpoints?")) return;
    await supabase.from("api_endpoints").delete().neq("id", 0);
    setRows([]);
  };

  return (
    <div className="p-7 max-w-[1200px] mx-auto">
      <div className="mb-5">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">System</div>
        <h1 className="font-display text-2xl font-black tracking-tight" style={{ color: "#22d3ee" }}>API Tracker</h1>
        <p className="text-[11px] text-hub-text-muted mt-1">
          Live feed of API requests captured by the Chrome extension. Updates in real-time.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by host or URL…"
          className="flex-1 bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono"
        />
        <button
          onClick={load}
          className="px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer"
          style={{ background: "#22d3ee18", border: "1px solid #22d3ee44", color: "#22d3ee" }}
        >
          ↻ Refresh
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer"
          style={{ background: "#dc262618", border: "1px solid #dc262644", color: "#dc2626" }}
        >
          ✕ Clear
        </button>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_60px_1fr_80px_140px] text-[9px] text-hub-text-dim uppercase tracking-[0.15em] border-b border-hub-border bg-background px-3 py-2 font-bold">
          <div>Status</div>
          <div>Method</div>
          <div>URL</div>
          <div className="text-right">Duration</div>
          <div className="text-right">When</div>
        </div>
        {visible.length === 0 && (
          <div className="p-8 text-center text-[11px] text-hub-text-muted">
            No endpoints captured yet. Install the extension and browse to start tracking.
          </div>
        )}
        {visible.map(r => (
          <div
            key={r.id}
            className="grid grid-cols-[60px_60px_1fr_80px_140px] text-[10.5px] border-b border-hub-border px-3 py-2 hover:bg-hub-surface-hover transition-colors"
          >
            <div className="font-mono font-bold" style={{ color: statusColor(r.status_code) }}>
              {r.status_code || "—"}
            </div>
            <div className="font-mono text-hub-text-muted">{r.method || "?"}</div>
            <div className="truncate text-foreground font-mono" title={r.url}>{r.url}</div>
            <div className="text-right font-mono text-hub-text-muted">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</div>
            <div className="text-right font-mono text-hub-text-dim">
              {r.captured_at ? new Date(r.captured_at).toLocaleTimeString() : ""}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[10px] text-hub-text-dim">
        Showing {visible.length} of {rows.length} captures · listening on <code className="font-mono text-hub-pink">postgres_changes</code>
      </div>
    </div>
  );
}