import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BUILTIN_PAGES } from "@/lib/hub-registry";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Skill Hub — Agent OS" },
      { name: "description", content: "Production-grade meta-agent skill registry with 88 skills, live database, and AI routing" },
    ],
  }),
});

interface Stats {
  skills: number;
  categories: number;
  sessions: number;
  memories: number;
  byCategory: Array<{ name: string; color: string; count: number }>;
}

function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agentName, setAgentName] = useState("Skill Hub");

  useEffect(() => {
    async function load() {
      const [skillsRes, catsRes, sessionsRes, memoriesRes, configRes] = await Promise.all([
        supabase.from("skills").select("id, category_id", { count: "exact" }),
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("agent_sessions").select("id", { count: "exact" }),
        supabase.from("memories").select("id", { count: "exact" }),
        supabase.from("agent_config").select("*"),
      ]);

      const cats = catsRes.data || [];
      const skills = skillsRes.data || [];
      const byCategory = cats.map(c => ({
        name: c.name,
        color: c.color,
        count: skills.filter(s => s.category_id === c.id).length,
      }));

      setStats({
        skills: skillsRes.count || 0,
        categories: cats.length,
        sessions: sessionsRes.count || 0,
        memories: memoriesRes.count || 0,
        byCategory,
      });

      const nameConfig = (configRes.data || []).find(c => c.key === "agent_name");
      if (nameConfig) setAgentName(nameConfig.value);
    }
    load();
  }, []);

  const statCards = stats ? [
    { label: "Total Skills", val: stats.skills, color: "#3b82f6" },
    { label: "Categories", val: stats.categories, color: "#8b5cf6" },
    { label: "Sessions", val: stats.sessions, color: "#f59e0b" },
    { label: "Memories", val: stats.memories, color: "#ec4899" },
  ] : [];

  return (
    <div className="p-7 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">
          Agent OS · Skill Hub
        </div>
        <h1 className="font-display text-3xl font-black text-foreground tracking-tight leading-none">
          {agentName}
        </h1>
        <p className="text-[11px] text-hub-text-muted mt-2">
          Production-grade meta-agent skill registry with live database and AI routing
        </p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="bg-hub-surface border border-hub-border rounded-lg p-3.5 text-center">
              <div className="font-display text-3xl font-black leading-none" style={{ color: s.color }}>
                {s.val}
              </div>
              <div className="text-[9px] text-hub-text-dim mt-1.5 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick nav */}
      <div className="mb-8">
        <div className="text-[9px] text-hub-text-dim tracking-[0.15em] uppercase mb-3">Quick Access</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
          {BUILTIN_PAGES.filter(p => p.path !== "/").map(page => (
            <Link
              key={page.id}
              to={page.path}
              className="bg-hub-surface rounded-lg p-4 text-left no-underline transition-all duration-150 hover:bg-hub-surface-hover group"
              style={{ border: `1px solid ${page.color}22` }}
            >
              <div className="text-[22px] mb-2" style={{ color: page.color }}>{page.icon}</div>
              <div className="text-[13px] font-bold text-foreground mb-1">{page.label}</div>
              <div className="text-[10px] text-hub-text-muted leading-relaxed">{page.description}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      {stats && (
        <div>
          <div className="text-[9px] text-hub-text-dim tracking-[0.15em] uppercase mb-3">Skills by Category</div>
          <div className="flex flex-col gap-1.5">
            {stats.byCategory.map(cat => (
              <div key={cat.name} className="flex items-center gap-2.5">
                <div className="w-[120px] text-[10px] text-hub-text-muted text-right flex-shrink-0">{cat.name}</div>
                <div className="flex-1 h-1.5 bg-hub-border rounded-sm">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{ width: `${(cat.count / (stats.skills || 1)) * 100}%`, background: cat.color }}
                  />
                </div>
                <div className="w-6 text-[10px] font-bold text-right flex-shrink-0" style={{ color: cat.color }}>
                  {cat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
