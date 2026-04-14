import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";

export const Route = createFileRoute("/agent")({
  component: AgentPage,
  head: () => ({
    meta: [
      { title: "Agent — Skill Hub" },
      { name: "description", content: "Route, execute, and loop tasks across the skill registry" },
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

function AgentPage() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<"idle" | "routing" | "done" | "error">("idle");
  const [streamText, setStreamText] = useState("");
  const [routingPlan, setRoutingPlan] = useState<any>(null);
  const streamRef = useRef<string>("");

  const handleRoute = async () => {
    if (!task.trim()) return;
    setStatus("routing");
    setStreamText("");
    setRoutingPlan(null);
    streamRef.current = "";

    try {
      // Load skills and config for routing
      const [skillsRes, configRes, memoriesRes] = await Promise.all([
        supabase.from("skills").select("id, name, category_id, description, cost_class, latency_class, priority, safe_for_parallel, fallback_chain"),
        supabase.from("agent_config").select("*"),
        supabase.from("memories").select("*").order("importance", { ascending: false }).limit(5),
      ]);

      const config: Record<string, string> = {};
      (configRes.data || []).forEach(c => { config[c.key] = c.value; });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/agent-route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          task,
          skills: skillsRes.data || [],
          memories: memoriesRes.data || [],
          config,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        setStreamText(err.error || "Error routing task");
        setStatus("error");
        return;
      }

      // Stream response
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                streamRef.current += content;
                setStreamText(streamRef.current);
              }
            } catch { /* partial JSON */ }
          }
        }
      }

      // Try to parse the routing plan from stream text
      try {
        const jsonMatch = streamRef.current.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setRoutingPlan(parsed);

          // Save session to database
          await supabase.from("agent_sessions").insert({
            task,
            status: "routed",
            routing_plan: parsed.plan || parsed,
            router_reasoning: parsed.reasoning || "",
            total_skills: parsed.plan?.steps?.length || 0,
            estimated_cost: parsed.plan?.estimated_total_cost || "medium",
            model_used: "google/gemini-3-flash-preview",
          });
        }
      } catch { /* not valid JSON */ }

      setStatus("done");
    } catch (err) {
      setStreamText(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  return (
    <div className="p-7 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">Agent Cockpit</div>
        <h1 className="font-display text-2xl font-black text-hub-pink tracking-tight">Route & Execute</h1>
        <p className="text-[11px] text-hub-text-muted mt-1">
          Describe a task and the AI router will select the optimal skills to execute it.
        </p>
      </div>

      {/* Task input */}
      <div className="bg-hub-surface border border-hub-border rounded-lg p-4 mb-6">
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="Describe your task..."
          rows={3}
          className="w-full bg-input border border-border rounded p-2.5 text-foreground text-[12px] outline-none resize-none font-mono"
        />
        <div className="flex items-center gap-2.5 mt-3">
          <button
            onClick={handleRoute}
            disabled={!task.trim() || status === "routing"}
            className="px-4 py-2 rounded text-[11px] font-bold cursor-pointer transition-all disabled:opacity-50"
            style={{
              background: "#ec489918",
              border: "1px solid #ec489944",
              color: "#ec4899",
            }}
          >
            {status === "routing" ? "◈ Routing..." : "◎ Route Task"}
          </button>
          <span className="text-[9px] text-hub-text-dim">powered by Lovable AI</span>
        </div>
      </div>

      {/* Sample tasks */}
      {status === "idle" && (
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

      {/* Stream output */}
      {streamText && (
        <div className="bg-hub-surface border border-hub-border rounded-lg p-4 mb-6">
          <div className="text-[9px] text-hub-text-dim tracking-[0.15em] uppercase mb-2">
            {status === "routing" ? "◈ Routing..." : status === "done" ? "✓ Complete" : "✗ Error"}
          </div>
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto">
            {streamText}
          </pre>
        </div>
      )}

      {/* Routing plan */}
      {routingPlan?.plan?.steps && (
        <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
          <div className="text-[9px] text-hub-pink tracking-[0.15em] uppercase mb-3 font-bold">Routing Plan</div>
          <div className="flex flex-col gap-2">
            {routingPlan.plan.steps.map((step: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded border border-hub-border bg-background">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-hub-pink/10 text-hub-pink border border-hub-pink/30">
                  {step.sequence || i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-foreground">{step.skill}</div>
                  <div className="text-[10px] text-hub-text-muted">{step.reason}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold" style={{
                  background: step.estimated_cost === "low" ? "#16a34a22" : step.estimated_cost === "high" ? "#dc262622" : "#ca8a0422",
                  color: step.estimated_cost === "low" ? "#16a34a" : step.estimated_cost === "high" ? "#dc2626" : "#ca8a04",
                }}>
                  {step.estimated_cost}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
