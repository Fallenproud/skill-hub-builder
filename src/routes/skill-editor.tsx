import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/skill-editor")({
  component: SkillEditorPage,
  head: () => ({
    meta: [
      { title: "Skill Editor — Skill Hub" },
      { name: "description", content: "Edit trigger conditions, boundaries, and routing metadata" },
    ],
  }),
});

function SkillEditorPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("skills").select("*").order("name").then(({ data }) => setSkills(data || []));
  }, []);

  const filtered = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from("skills").update({
      description: selected.description,
      trigger_condition: selected.trigger_condition,
      boundary: selected.boundary,
      priority: selected.priority,
      cost_class: selected.cost_class,
      latency_class: selected.latency_class,
    }).eq("id", selected.id);
    setSaving(false);
  };

  return (
    <div className="h-full flex">
      {/* Skill list */}
      <div className="w-[240px] border-r border-border bg-sidebar flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full bg-input border border-border rounded p-1.5 text-foreground text-[10px] outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected({ ...s })}
              className="w-full text-left px-3 py-2 text-[10px] border-b border-border cursor-pointer transition-all"
              style={{
                background: selected?.id === s.id ? "var(--hub-surface-hover)" : "transparent",
                color: selected?.id === s.id ? "var(--foreground)" : "var(--muted-foreground)",
                fontWeight: selected?.id === s.id ? 700 : 400,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="text-hub-text-dim text-center p-10 text-[11px]">Select a skill to edit</div>
        ) : (
          <div className="max-w-[600px]">
            <h2 className="font-display text-xl font-black text-hub-purple mb-4">{selected.name}</h2>

            <div className="mb-4">
              <label className="text-[9px] text-hub-text-dim uppercase tracking-wider mb-1 block">Description</label>
              <textarea
                value={selected.description || ""}
                onChange={e => setSelected({ ...selected, description: e.target.value })}
                rows={3}
                className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono resize-vertical"
              />
            </div>

            <div className="mb-4">
              <label className="text-[9px] text-hub-text-dim uppercase tracking-wider mb-1 block">Trigger Condition</label>
              <textarea
                value={selected.trigger_condition || ""}
                onChange={e => setSelected({ ...selected, trigger_condition: e.target.value })}
                rows={2}
                className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono resize-vertical"
              />
            </div>

            <div className="mb-4">
              <label className="text-[9px] text-hub-text-dim uppercase tracking-wider mb-1 block">Boundary</label>
              <textarea
                value={selected.boundary || ""}
                onChange={e => setSelected({ ...selected, boundary: e.target.value })}
                rows={2}
                className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono resize-vertical"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-[9px] text-hub-text-dim uppercase tracking-wider mb-1 block">Priority</label>
                <select
                  value={selected.priority}
                  onChange={e => setSelected({ ...selected, priority: parseInt(e.target.value) })}
                  className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none"
                >
                  <option value={1}>P1 Critical</option>
                  <option value={2}>P2 Standard</option>
                  <option value={3}>P3 Optional</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-hub-text-dim uppercase tracking-wider mb-1 block">Cost</label>
                <select
                  value={selected.cost_class}
                  onChange={e => setSelected({ ...selected, cost_class: e.target.value })}
                  className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-hub-text-dim uppercase tracking-wider mb-1 block">Latency</label>
                <select
                  value={selected.latency_class}
                  onChange={e => setSelected({ ...selected, latency_class: e.target.value })}
                  className="w-full bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none"
                >
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded text-[11px] font-bold cursor-pointer"
              style={{ background: "#8b5cf618", border: "1px solid #8b5cf644", color: "#8b5cf6" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
