import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/observe")({
  component: ObservabilityPage,
  head: () => ({
    meta: [
      { title: "Observability — Skill Hub" },
      { name: "description", content: "Analytics, session history, and execution drill-down" },
    ],
  }),
});

function ObservabilityPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [execLogs, setExecLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("agent_sessions").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }) => setSessions(data || []));
  }, []);

  const viewSession = async (session: any) => {
    setSelected(session);
    const { data } = await supabase.from("execution_log").select("*").eq("session_id", session.id).order("sequence_order");
    setExecLogs(data || []);
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: "#666", routed: "#f59e0b", executed: "#10b981", partial: "#ca8a04", error: "#ef4444",
  };

  return (
    <div className="p-7 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">Analytics</div>
        <h1 className="font-display text-2xl font-black text-hub-cyan tracking-tight">Observability</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Session list */}
        <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
          <div className="text-[9px] text-hub-text-dim tracking-[0.12em] uppercase mb-3">Recent Sessions</div>
          {sessions.length === 0 ? (
            <div className="text-[11px] text-hub-text-dim text-center p-8">No sessions yet. Route a task from the Agent page.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => viewSession(s)}
                  className="flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-all"
                  style={{
                    borderColor: selected?.id === s.id ? STATUS_COLOR[s.status] + "55" : "var(--hub-border)",
                    background: selected?.id === s.id ? STATUS_COLOR[s.status] + "08" : "var(--background)",
                  }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[s.status] || "#666" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-foreground truncate">{s.task}</div>
                    <div className="text-[9px] text-hub-text-dim">
                      {new Date(s.created_at).toLocaleString()} · {s.total_skills || 0} skills · {s.execution_tokens || 0} tokens
                    </div>
                  </div>
                  <span className="text-[9px] uppercase font-bold" style={{ color: STATUS_COLOR[s.status] }}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session detail */}
        {selected && (
          <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
            <div className="text-[9px] text-hub-cyan tracking-[0.12em] uppercase mb-3 font-bold">Session Detail</div>
            <div className="text-[12px] font-bold text-foreground mb-2">{selected.task}</div>
            <div className="text-[10px] text-hub-text-muted mb-4">
              Status: <span style={{ color: STATUS_COLOR[selected.status] }}>{selected.status}</span> ·
              Model: {selected.model_used || "—"} ·
              Tokens: {selected.execution_tokens || 0}
            </div>

            {selected.synthesis && (
              <div className="mb-4">
                <div className="text-[9px] text-hub-text-dim uppercase mb-1">Synthesis</div>
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed bg-background p-2.5 rounded border border-border max-h-[200px] overflow-y-auto">
                  {selected.synthesis}
                </pre>
              </div>
            )}

            {execLogs.length > 0 && (
              <div>
                <div className="text-[9px] text-hub-text-dim uppercase mb-2">Execution Log</div>
                <div className="flex flex-col gap-1">
                  {execLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-2 p-2 bg-background rounded border border-border">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: log.status === "complete" ? "#10b981" : log.status === "error" ? "#ef4444" : "#666" }} />
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-foreground">{log.skill_name}</div>
                        <div className="text-[9px] text-hub-text-dim">{log.output_summary || log.reason || "—"}</div>
                      </div>
                      <span className="text-[9px] text-hub-text-dim">{log.tokens_used || 0}t</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
