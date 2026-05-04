import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { consumeSSE, functionsAuthHeader, functionsUrl } from "@/lib/sse";

export const Route = createFileRoute("/agent")({
  component: AgentPage,
  head: () => ({
    meta: [
      { title: "Agent — Skill Hub" },
      { name: "description", content: "Route, execute, and stream results across the skill registry" },
    ],
  }),
});

const SAMPLES = [
  "Research competitor pricing in the SaaS project management space and write a comparison report",
  "Refactor the authentication module, write unit tests, and scan for security vulnerabilities",
  "Analyse Q3 sales data and surface the top 3 anomalies with root-cause hypotheses",
  "Summarize action items from a customer support transcript",
  "Create a technical architecture document for a microservices migration",
];

type Phase = "idle" | "routing" | "executing" | "done" | "error";

interface StepRuntime {
  sequence: number;
  skill: string;
  reason: string;
  estimated_cost: string;
  status: "pending" | "running" | "done" | "error";
  output: string;
  duration_ms?: number;
}

function AgentPage() {
  const [task, setTask] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [routerLog, setRouterLog] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [steps, setSteps] = useState<StepRuntime[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const routerBufRef = useRef("");

  const reset = () => {
    setPhase("routing");
    setRouterLog("");
    setReasoning("");
    setSteps([]);
    setSessionId(null);
    routerBufRef.current = "";
  };

  const handleRun = async () => {
    if (!task.trim()) return;
    reset();

    try {
      // 1) Load context
      const [skillsRes, configRes, memoriesRes] = await Promise.all([
        supabase.from("skills").select("id, name, category_id, description, cost_class, latency_class, priority, safe_for_parallel, fallback_chain"),
        supabase.from("agent_config").select("*"),
        supabase.from("memories").select("*").order("importance", { ascending: false }).limit(5),
      ]);
      const config: Record<string, string> = {};
      (configRes.data || []).forEach((c: any) => { config[c.key] = c.value; });

      // 2) ROUTE
      const routeResp = await fetch(functionsUrl("agent-route"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...functionsAuthHeader() },
        body: JSON.stringify({ task, skills: skillsRes.data || [], memories: memoriesRes.data || [], config }),
      });

      if (!routeResp.ok) {
        const err = await routeResp.json().catch(() => ({ error: "Failed" }));
        setRouterLog(err.error || "Routing error");
        setPhase("error");
        return;
      }

      await consumeSSE(routeResp.body, chunk => {
        routerBufRef.current += chunk;
        setRouterLog(routerBufRef.current);
      });

      // Parse routing JSON
      const m = routerBufRef.current.match(/\{[\s\S]*\}/);
      if (!m) {
        setPhase("error");
        return;
      }
      let plan: any;
      try { plan = JSON.parse(m[0]); } catch { setPhase("error"); return; }
      setReasoning(plan.reasoning || "");

      const planSteps = plan.plan?.steps || [];
      const runtimeSteps: StepRuntime[] = planSteps.map((s: any, i: number) => ({
        sequence: s.sequence || i + 1,
        skill: s.skill,
        reason: s.reason || "",
        estimated_cost: s.estimated_cost || "medium",
        status: "pending",
        output: "",
      }));
      setSteps(runtimeSteps);

      // 3) Save session
      const { data: session } = await supabase
        .from("agent_sessions")
        .insert({
          task,
          status: "executing",
          routing_plan: plan.plan || plan,
          router_reasoning: plan.reasoning || "",
          total_skills: planSteps.length,
          estimated_cost: plan.plan?.estimated_total_cost || "medium",
          model_used: "google/gemini-3-flash-preview",
        })
        .select()
        .single();
      const sId = session?.id || null;
      setSessionId(sId);

      // 4) EXECUTE — sequentially stream each step (chained context)
      setPhase("executing");
      let chainedContext = `Original task: ${task}`;

      for (let i = 0; i < runtimeSteps.length; i++) {
        const step = runtimeSteps[i];
        const startedAt = new Date().toISOString();
        const t0 = performance.now();

        // Insert log row only if we have a session
        let logId: number | null = null;
        if (sId) {
          const { data: logRow } = await supabase
            .from("execution_log")
            .insert({
              session_id: sId,
              skill_id: step.skill,
              skill_name: step.skill,
              sequence_order: step.sequence,
              reason: step.reason,
              estimated_cost: step.estimated_cost,
              status: "running",
              started_at: startedAt,
            })
            .select()
            .single();
          logId = logRow?.id ?? null;
        }

        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s));

        try {
          const execResp = await fetch(functionsUrl("skill-execute"), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...functionsAuthHeader() },
            body: JSON.stringify({
              skill_name: step.skill,
              task,
              context: chainedContext,
            }),
          });

          if (!execResp.ok) {
            const err = await execResp.json().catch(() => ({ error: "Failed" }));
            const msg = err.error || `HTTP ${execResp.status}`;
            setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "error", output: msg } : s));
            if (logId) {
              await supabase.from("execution_log").update({
                status: "error", error_msg: msg, completed_at: new Date().toISOString(),
                duration_ms: Math.round(performance.now() - t0),
              }).eq("id", logId);
            }
            continue;
          }

          let stepBuf = "";
          await consumeSSE(execResp.body, chunk => {
            stepBuf += chunk;
            setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, output: stepBuf } : s));
          });

          const dur = Math.round(performance.now() - t0);
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "done", output: stepBuf, duration_ms: dur } : s));

          if (logId) {
            await supabase.from("execution_log").update({
              status: "done",
              stream_chunks: stepBuf,
              output_summary: stepBuf.slice(0, 240),
              completed_at: new Date().toISOString(),
              duration_ms: dur,
            }).eq("id", logId);
          }

          // Chain output into context for next step
          chainedContext += `\n\n[${step.skill} output]:\n${stepBuf.slice(0, 1500)}`;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: "error", output: msg } : s));
          if (logId) {
            await supabase.from("execution_log").update({
              status: "error", error_msg: msg, completed_at: new Date().toISOString(),
              duration_ms: Math.round(performance.now() - t0),
            }).eq("id", logId);
          }
        }
      }

      if (sId) {
        await supabase.from("agent_sessions").update({
          status: "done",
          completed_at: new Date().toISOString(),
        }).eq("id", sId);
      }
      setPhase("done");
    } catch (err) {
      setRouterLog(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  };

  const phaseLabel = {
    idle: "Ready",
    routing: "◈ Routing…",
    executing: "◉ Executing…",
    done: "✓ Complete",
    error: "✗ Error",
  }[phase];

  return (
    <div className="p-7 max-w-[980px] mx-auto">
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">Agent Cockpit</div>
        <h1 className="font-display text-2xl font-black text-hub-pink tracking-tight">Route & Execute</h1>
        <p className="text-[11px] text-hub-text-muted mt-1">
          Describe a task — the router picks skills, then each step is executed live with streaming output.
        </p>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-4 mb-6">
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="Describe your task..."
          rows={3}
          disabled={phase === "routing" || phase === "executing"}
          className="w-full bg-input border border-border rounded p-2.5 text-foreground text-[12px] outline-none resize-none font-mono disabled:opacity-60"
        />
        <div className="flex items-center gap-2.5 mt-3">
          <button
            onClick={handleRun}
            disabled={!task.trim() || phase === "routing" || phase === "executing"}
            className="px-4 py-2 rounded text-[11px] font-bold cursor-pointer transition-all disabled:opacity-50"
            style={{ background: "#ec489918", border: "1px solid #ec489944", color: "#ec4899" }}
          >
            {phaseLabel}
          </button>
          <span className="text-[9px] text-hub-text-dim">powered by Lovable AI · streaming live</span>
          {sessionId && (
            <span className="ml-auto text-[9px] text-hub-text-dim font-mono">session {sessionId.slice(0, 8)}</span>
          )}
        </div>
      </div>

      {phase === "idle" && (
        <div className="mb-6">
          <div className="text-[9px] text-hub-text-dim tracking-[0.15em] uppercase mb-2">Sample Tasks</div>
          <div className="flex flex-col gap-1.5">
            {SAMPLES.map(s => (
              <button
                key={s}
                onClick={() => setTask(s)}
                className="text-left text-[11px] text-hub-text-muted bg-hub-surface border border-hub-border rounded p-2.5 cursor-pointer transition-all hover:border-hub-border-hover hover:bg-hub-surface-hover"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === "routing" || routerLog) && (
        <details open={phase === "routing"} className="bg-hub-surface border border-hub-border rounded-lg p-4 mb-4">
          <summary className="text-[9px] text-hub-text-dim tracking-[0.15em] uppercase cursor-pointer">Router output</summary>
          {reasoning && (
            <div className="mt-2 text-[11px] text-foreground italic">{reasoning}</div>
          )}
          <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-[260px] overflow-y-auto">
            {routerLog}
          </pre>
        </details>
      )}

      {steps.length > 0 && (
        <div className="space-y-3">
          {steps.map((step, i) => {
            const accent = step.status === "done" ? "#16a34a"
              : step.status === "error" ? "#dc2626"
              : step.status === "running" ? "#ec4899"
              : "#6b7280";
            return (
              <div key={i} className="bg-hub-surface border border-hub-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border"
                    style={{ background: accent + "18", color: accent, borderColor: accent + "44" }}
                  >
                    {step.sequence}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold text-foreground">{step.skill}</div>
                    <div className="text-[10px] text-hub-text-muted">{step.reason}</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ background: accent + "22", color: accent }}>
                    {step.status}
                    {step.duration_ms ? ` · ${step.duration_ms}ms` : ""}
                  </span>
                </div>
                {(step.output || step.status === "running") && (
                  <pre className="mt-2 text-[10.5px] text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-background border border-hub-border rounded p-2.5 max-h-[320px] overflow-y-auto">
                    {step.output || "▎"}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}