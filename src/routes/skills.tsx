import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

export const Route = createFileRoute("/skills")({
  component: SkillRegistryPage,
  head: () => ({
    meta: [
      { title: "Skill Registry — Skill Hub" },
      { name: "description", content: "Browse, search, and filter all 88 agent skills" },
    ],
  }),
});

const COST_COLOR: Record<string, string> = { low: "#16a34a", medium: "#ca8a04", high: "#dc2626" };
const LAT_COLOR: Record<string, string> = { fast: "#0891b2", normal: "#7c3aed", slow: "#c2410c" };

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase leading-relaxed"
      style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}

type Skill = any;

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

function SkillRegistryPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [costFilter, setCostFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("skills").select("*");
    if (catFilter) query = query.eq("category_id", catFilter);
    if (costFilter) query = query.eq("cost_class", costFilter);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    const { data } = await query.order("priority").order("name");
    setSkills(data || []);
    setLoading(false);
  }, [search, catFilter, costFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Group by category
  const grouped: Record<string, { color: string; skills: Skill[] }> = {};
  skills.forEach(s => {
    const cat = cats.find(c => c.id === s.category_id);
    const catName = cat?.name || s.category_id;
    const catColor = cat?.color || "#3b82f6";
    if (!grouped[catName]) grouped[catName] = { color: catColor, skills: [] };
    grouped[catName].skills.push(s);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-3 px-5 border-b border-border bg-sidebar flex gap-2.5 flex-wrap items-center flex-shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="⌕  search skills..."
          className="flex-1 min-w-[180px] py-1.5 px-2.5 bg-input border border-border rounded text-foreground text-[11px] outline-none"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="bg-input border border-border text-muted-foreground text-[11px] py-1.5 px-2.5 rounded outline-none"
        >
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={costFilter}
          onChange={e => setCostFilter(e.target.value)}
          className="bg-input border border-border text-muted-foreground text-[11px] py-1.5 px-2.5 rounded outline-none"
        >
          <option value="">All Costs</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <span className="text-xs text-hub-text-dim">
          <span className="text-hub-purple font-bold">{skills.length}</span> skills
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 px-5" style={{ marginRight: selected ? 360 : 0 }}>
        {loading ? (
          <div className="text-hub-text-dim p-10 text-center text-[11px]">Loading skills...</div>
        ) : (
          Object.entries(grouped).map(([catName, { color, skills: catSkills }]) => (
            <div key={catName} className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="font-display text-xs font-extrabold" style={{ color }}>{catName}</span>
                <span className="text-[9px] text-hub-text-dim">// {catSkills.length}</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-1.5">
                {catSkills.map(skill => {
                  const isSelected = selected?.id === skill.id;
                  return (
                    <div
                      key={skill.id}
                      onClick={() => setSelected(isSelected ? null : skill)}
                      className="cursor-pointer rounded-md p-2.5 transition-all duration-100 relative overflow-hidden"
                      style={{
                        background: isSelected ? color + "15" : "var(--hub-surface)",
                        border: `1px solid ${isSelected ? color + "55" : "var(--hub-border)"}`,
                      }}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: color }} />}
                      <div className="flex justify-between items-start gap-1.5 mb-1">
                        <span className="text-[11px] font-bold leading-tight" style={{ color: isSelected ? color : "var(--foreground)" }}>
                          {skill.name}
                        </span>
                        <div className="flex gap-1 flex-shrink-0">
                          <Badge label={skill.cost_class} color={COST_COLOR[skill.cost_class] || "#666"} />
                          <Badge label={skill.latency_class} color={LAT_COLOR[skill.latency_class] || "#666"} />
                        </div>
                      </div>
                      <div className="text-[10px] text-hub-text-muted leading-relaxed line-clamp-2">
                        {skill.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed right-0 top-0 bottom-0 w-[360px] bg-hub-surface overflow-y-auto z-50 font-mono" style={{ borderLeft: `1px solid ${cats.find(c => c.id === selected.category_id)?.color || "#3b82f6"}33` }}>
          <div className="p-4 border-b border-border sticky top-0 bg-hub-surface z-10">
            <button onClick={() => setSelected(null)} className="float-right bg-transparent border-none text-hub-text-muted cursor-pointer text-base">✕</button>
            <div className="text-[9px] tracking-[0.15em] uppercase mb-1" style={{ color: cats.find(c => c.id === selected.category_id)?.color }}>
              {cats.find(c => c.id === selected.category_id)?.name}
            </div>
            <div className="font-display text-lg font-black mb-2.5" style={{ color: cats.find(c => c.id === selected.category_id)?.color }}>
              {selected.name}
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge label={selected.cost_class} color={COST_COLOR[selected.cost_class] || "#666"} />
              <Badge label={selected.latency_class} color={LAT_COLOR[selected.latency_class] || "#666"} />
              <Badge label={`P${selected.priority}`} color={selected.priority === 1 ? "#ef4444" : selected.priority === 2 ? "#f59e0b" : "#6b7280"} />
              {selected.requires_auth && <Badge label="Auth" color="#f59e0b" />}
              {selected.stateful && <Badge label="Stateful" color="#8b5cf6" />}
              {selected.safe_for_parallel && <Badge label="Parallel" color="#10b981" />}
            </div>
          </div>
          <div className="p-4">
            {[
              { title: "Description", content: selected.description },
              { title: "Trigger", content: selected.trigger_condition },
              { title: "⚠ Boundary", content: selected.boundary },
            ].map(sec => (
              <div key={sec.title} className="mb-3.5">
                <div className="text-[9px] tracking-[0.12em] uppercase mb-1 font-bold" style={{ color: sec.title.includes("Boundary") ? "#ef4444" : cats.find(c => c.id === selected.category_id)?.color }}>
                  {sec.title}
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: sec.title.includes("Boundary") ? "#fca5a5" : "var(--muted-foreground)" }}>
                  {sec.content}
                </div>
              </div>
            ))}
            <div className="mb-3.5">
              <div className="text-[9px] tracking-[0.12em] uppercase mb-1 font-bold" style={{ color: cats.find(c => c.id === selected.category_id)?.color }}>Inputs</div>
              <div className="flex flex-wrap gap-1">
                {(selected.inputs || []).map((i: string) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground">{i}</span>
                ))}
              </div>
            </div>
            <div className="mb-3.5">
              <div className="text-[9px] tracking-[0.12em] uppercase mb-1 font-bold" style={{ color: cats.find(c => c.id === selected.category_id)?.color }}>Outputs</div>
              <div className="flex flex-wrap gap-1">
                {(selected.outputs || []).map((o: string) => (
                  <span key={o} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: (cats.find(c => c.id === selected.category_id)?.color || "#3b82f6") + "11", border: `1px solid ${(cats.find(c => c.id === selected.category_id)?.color || "#3b82f6")}33`, color: (cats.find(c => c.id === selected.category_id)?.color || "#3b82f6") + "cc" }}>{o}</span>
                ))}
              </div>
            </div>
            <div className="mb-3.5">
              <div className="text-[9px] tracking-[0.12em] uppercase mb-1 font-bold text-hub-text-dim">Skill ID</div>
              <code className="text-[10px] text-hub-text-dim">{selected.id}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
