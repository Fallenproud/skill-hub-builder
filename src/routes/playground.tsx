import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
  head: () => ({
    meta: [
      { title: "Playground — Skill Hub" },
      { name: "description", content: "Test any skill directly without routing overhead" },
    ],
  }),
});

function PlaygroundPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [task, setTask] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const outputRef = useRef("");

  useEffect(() => {
    supabase.from("skills").select("id, name, category_id, cost_class").order("name").then(({ data }) => setSkills(data || []));
  }, []);

  const execute = async () => {
    if (!selectedSkill || !task.trim()) return;
    setRunning(true);
    setOutput("");
    outputRef.current = "";

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/skill-execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ skill_name: selectedSkill, task }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        setOutput(err.error || "Error");
        setRunning(false);
        return;
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                outputRef.current += content;
                setOutput(outputRef.current);
              }
            } catch { /* partial */ }
          }
        }
      }
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Error");
    }
    setRunning(false);
  };

  return (
    <div className="p-7 max-w-[900px] mx-auto">
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">Direct Execution</div>
        <h1 className="font-display text-2xl font-black text-hub-lime tracking-tight">Playground</h1>
        <p className="text-[11px] text-hub-text-muted mt-1">Test any skill directly — no routing overhead.</p>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-4 mb-6">
        <div className="mb-3">
          <div className="text-[9px] text-hub-text-dim tracking-wider uppercase mb-1.5">Skill</div>
          <select
            value={selectedSkill}
            onChange={e => setSelectedSkill(e.target.value)}
            className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none"
          >
            <option value="">Select a skill...</option>
            {skills.map(s => <option key={s.id} value={s.name}>{s.name} ({s.cost_class})</option>)}
          </select>
        </div>

        <div className="mb-3">
          <div className="text-[9px] text-hub-text-dim tracking-wider uppercase mb-1.5">Task</div>
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="What should this skill do?"
            rows={3}
            className="w-full bg-input border border-border rounded p-2.5 text-foreground text-[12px] outline-none resize-none font-mono"
          />
        </div>

        <button
          onClick={execute}
          disabled={!selectedSkill || !task.trim() || running}
          className="px-4 py-2 rounded text-[11px] font-bold cursor-pointer transition-all disabled:opacity-50"
          style={{ background: "#84cc1618", border: "1px solid #84cc1644", color: "#84cc16" }}
        >
          {running ? "◈ Executing..." : "◧ Execute Skill"}
        </button>
      </div>

      {output && (
        <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
          <div className="text-[9px] text-hub-lime tracking-[0.15em] uppercase mb-2 font-bold">Output</div>
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
