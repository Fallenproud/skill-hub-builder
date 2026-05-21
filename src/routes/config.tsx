import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { testSkillHubPing, type TestResult } from "@/lib/skillhub-test.functions";

export const Route = createFileRoute("/config")({
  component: AgentConfigPage,
  head: () => ({
    meta: [
      { title: "Agent Config — Skill Hub" },
      { name: "description", content: "Configure agent name, persona, default context, cost preference, and long-term memory entries." },
      { property: "og:title", content: "Agent Config — Skill Hub" },
      { property: "og:description", content: "Configure agent persona, memory, and routing preferences." },
      { property: "og:url", content: "https://my-agenthub.lovable.app/config" },
    ],
    links: [
      { rel: "canonical", href: "https://my-agenthub.lovable.app/config" },
    ],
  }),
});

function AgentConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [memories, setMemories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [newMem, setNewMem] = useState("");
  const [importance, setImportance] = useState(3);

  useEffect(() => {
    supabase.from("agent_config").select("*").then(({ data }) => {
      const cfg: Record<string, string> = {};
      (data || []).forEach(c => { cfg[c.key] = c.value; });
      setConfig(cfg);
    });
    loadMemories();
  }, []);

  const loadMemories = () => {
    supabase.from("memories").select("*").order("importance", { ascending: false }).limit(50).then(({ data }) => setMemories(data || []));
  };

  const saveConfig = async (key: string, value: string) => {
    setSaving(true);
    setConfig(prev => ({ ...prev, [key]: value }));
    await supabase.from("agent_config").upsert({ key, value, updated_at: new Date().toISOString() });
    setSaving(false);
  };

  const addMemory = async () => {
    if (!newMem.trim()) return;
    await supabase.from("memories").insert({ content: newMem, importance, source: "manual" });
    setNewMem("");
    loadMemories();
  };

  const deleteMemory = async (id: string) => {
    await supabase.from("memories").delete().eq("id", id);
    setMemories(m => m.filter(x => x.id !== id));
  };

  const IMP_COLORS: Record<number, string> = { 1: "#444", 2: "#6b7280", 3: "#8b5cf6", 4: "#f59e0b", 5: "#ef4444" };
  const IMP_LABELS: Record<number, string> = { 1: "Trivial", 2: "Low", 3: "Normal", 4: "High", 5: "Critical" };

  return (
    <div className="p-7 max-w-[900px] mx-auto">
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">Configuration</div>
        <h1 className="font-display text-2xl font-black text-hub-pink tracking-tight">Agent Config</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent settings */}
        <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
          <div className="text-[9px] text-hub-text-dim tracking-[0.12em] uppercase mb-4">Agent Settings</div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Agent Name</label>
            <input
              value={config.agent_name || ""}
              onChange={e => saveConfig("agent_name", e.target.value)}
              className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono"
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Persona</label>
            <textarea
              value={config.agent_persona || ""}
              onChange={e => saveConfig("agent_persona", e.target.value)}
              rows={4}
              className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono resize-vertical"
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Default Context</label>
            <textarea
              value={config.default_context || ""}
              onChange={e => saveConfig("default_context", e.target.value)}
              rows={2}
              className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono resize-vertical"
              placeholder="Always-on context appended to every task..."
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Preferred Cost</label>
            <select
              value={config.preferred_cost || "medium"}
              onChange={e => saveConfig("preferred_cost", e.target.value)}
              className="bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none"
            >
              <option value="low">Low — prefer cheaper skills</option>
              <option value="medium">Medium — balanced</option>
              <option value="high">High — prefer best quality</option>
            </select>
          </div>

          {saving && <div className="text-[9px] text-hub-green">Saving...</div>}
        </div>

        {/* Memories */}
        <div className="bg-hub-surface border border-hub-border rounded-lg p-4">
          <div className="text-[9px] text-hub-text-dim tracking-[0.12em] uppercase mb-4">Agent Memory</div>

          <div className="mb-4 p-3 bg-background border border-border rounded">
            <textarea
              value={newMem}
              onChange={e => setNewMem(e.target.value)}
              placeholder="Something your agent should remember..."
              aria-label="New memory content"
              rows={2}
              className="w-full bg-transparent text-foreground text-[11px] outline-none resize-none font-mono"
            />
            <div className="flex gap-2 mt-2 items-center">
              <select
                value={importance}
                onChange={e => setImportance(parseInt(e.target.value))}
                aria-label="Memory importance"
                className="bg-input border border-border rounded p-1 text-[10px] outline-none"
                style={{ color: IMP_COLORS[importance] }}
              >
                {[1, 2, 3, 4, 5].map(i => <option key={i} value={i}>Importance {i} — {IMP_LABELS[i]}</option>)}
              </select>
              <button
                onClick={addMemory}
                disabled={!newMem.trim()}
                className="px-3 py-1 text-[10px] font-bold rounded cursor-pointer disabled:opacity-50"
                style={{ background: "#8b5cf618", border: "1px solid #8b5cf633", color: "#8b5cf6" }}
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto">
            {memories.map(m => (
              <div key={m.id} className="flex items-start gap-2 p-2 rounded border border-border bg-background">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: IMP_COLORS[m.importance] || "#666" }} />
                <div className="flex-1 text-[10px] text-muted-foreground leading-relaxed">{m.content}</div>
                <button
                  onClick={() => deleteMemory(m.id)}
                  className="text-[10px] text-hub-text-dim bg-transparent border-none cursor-pointer hover:text-destructive"
                >
                  ✕
                </button>
              </div>
            ))}
            {memories.length === 0 && (
              <div className="text-[10px] text-hub-text-dim text-center p-4">No memories yet</div>
            )}
          </div>
        </div>
      </div>

      <IntegrationPanel />
    </div>
  );
}

function IntegrationPanel() {
  const ping = useServerFn(testSkillHubPing);
  const [results, setResults] = useState<Record<string, TestResult | "loading">>({});

  const run = async (mode: "valid" | "bad-signature" | "stale-timestamp" | "missing-secret-check") => {
    setResults((r) => ({ ...r, [mode]: "loading" }));
    const res = await ping({ data: { mode } });
    setResults((r) => ({ ...r, [mode]: res }));
  };

  const curlExample = `TS=$(date +%s)
BODY='{"action":"ping"}'
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SKILL_HUB_SHARED_SECRET" -hex | awk '{print $2}')
curl -X POST https://my-agenthub.lovable.app/api/public/skillhub \\
  -H "Content-Type: application/json" \\
  -H "X-Hub-Timestamp: $TS" \\
  -H "X-Hub-Signature: $SIG" \\
  -d "$BODY"`;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex gap-3 text-[11px] py-1">
      <div className="text-hub-text-dim w-28 flex-shrink-0">{label}</div>
      <div className="font-mono text-foreground break-all">{value}</div>
    </div>
  );

  const Status = ({ k, label }: { k: keyof typeof results; label: string }) => {
    const r = results[k];
    return (
      <div className="flex flex-col gap-1 text-[10px]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => run(k as any)}
            className="px-2.5 py-1 rounded font-bold cursor-pointer"
            style={{ background: "#8b5cf618", border: "1px solid #8b5cf633", color: "#8b5cf6" }}
          >
            {label}
          </button>
          {r === "loading" && <span className="text-hub-text-dim">…running</span>}
          {r && r !== "loading" && (
            <span style={{ color: r.ok ? "#10b981" : "#ef4444" }} className="font-mono">
              {r.ok ? "✓" : "✗"} {r.result}
            </span>
          )}
        </div>
        {r && r !== "loading" && (
          <div className="ml-2 pl-3 border-l border-hub-border font-mono text-[10px] text-hub-text-dim space-y-0.5">
            <div>action: <span className="text-foreground">{r.action}</span></div>
            <div>button_request_status: <span className="text-foreground">{r.button_request_status}</span></div>
            <div>skillhub_response_status: <span className="text-foreground">{r.skillhub_response_status ?? "n/a"}</span></div>
            <div>used_origin_source: <span className="text-foreground">{r.used_origin_source}</span></div>
            <div className="break-all">resolved_url_used: <span className="text-foreground">{r.resolved_url_used}</span></div>
            <div className="break-all">skillhub_response_body: <span className="text-foreground">{JSON.stringify(r.skillhub_response_body)}</span></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6 bg-hub-surface border border-hub-border rounded-lg p-4">
      <div className="text-[9px] text-hub-text-dim tracking-[0.12em] uppercase mb-4">External Integration — Skill Hub API</div>

      <Row label="Base URL" value="https://my-agenthub.lovable.app" />
      <Row label="Endpoint" value="POST /api/public/skillhub" />
      <Row label="Auth" value="HMAC-SHA256 of `${timestamp}.${rawBody}` using SKILL_HUB_SHARED_SECRET" />
      <Row label="Headers" value="X-Hub-Signature, X-Hub-Timestamp, Content-Type: application/json" />
      <Row label="Actions" value="ping · list-skills · invoke" />
      <Row label="Replay window" value="±300s (5 min)" />

      <div className="mt-4">
        <div className="text-[9px] text-hub-text-dim tracking-[0.12em] uppercase mb-2">Curl — ping</div>
        <pre className="bg-background border border-border rounded p-3 text-[10px] font-mono text-foreground overflow-x-auto whitespace-pre">{curlExample}</pre>
        <div className="text-[9px] text-hub-text-dim mt-1">Secret is referenced via env var — never embedded in client code.</div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="text-[9px] text-hub-text-dim tracking-[0.12em] uppercase mb-1">Server-side tests</div>
        <Status k="valid" label="Test ping" />
        <Status k="bad-signature" label="Test invalid HMAC" />
        <Status k="stale-timestamp" label="Test stale timestamp" />
        <Status k="missing-secret-check" label="Check secret present" />
      </div>
    </div>
  );
}
