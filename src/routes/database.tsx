import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/database")({
  component: DatabasePage,
  head: () => ({
    meta: [
      { title: "Database — Skill Hub" },
      { name: "description", content: "Inspect raw rows in Skill Hub registry tables — skills, categories, sessions, execution logs, and memories." },
      { property: "og:title", content: "Database Browser — Skill Hub" },
      { property: "og:description", content: "Inspect raw rows in Skill Hub registry tables." },
      { property: "og:url", content: "https://my-agenthub.lovable.app/database" },
    ],
    links: [
      { rel: "canonical", href: "https://my-agenthub.lovable.app/database" },
    ],
  }),
});

const TABLES = ["categories", "skills", "agent_sessions", "execution_log", "memories", "agent_config", "hub_pages", "audit_log"];

function DatabasePage() {
  const [selected, setSelected] = useState("categories");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadTable(selected);
  }, [selected]);

  const loadTable = async (table: string) => {
    setLoading(true);
    const { data: rows, count: total } = await (supabase as any)
      .from(table)
      .select("*", { count: "exact" })
      .limit(100);
    
    const result = rows || [];
    setData(result);
    setCount(total || 0);
    setColumns(result.length > 0 ? Object.keys(result[0]) : []);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      <h1 className="sr-only">Database Browser</h1>
      {/* Table tabs */}
      <div className="p-3 px-5 border-b border-border bg-sidebar flex gap-1.5 flex-wrap items-center flex-shrink-0">
        {TABLES.map(t => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className="px-2.5 py-1.5 rounded text-[10px] cursor-pointer transition-all"
            style={{
              background: selected === t ? "#10b98118" : "transparent",
              border: `1px solid ${selected === t ? "#10b98144" : "transparent"}`,
              color: selected === t ? "#10b981" : "var(--muted-foreground)",
              fontWeight: selected === t ? 700 : 400,
            }}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-[9px] text-hub-text-dim">
          <span className="text-hub-green font-bold">{count}</span> rows
        </span>
      </div>

      {/* Table data */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-hub-text-dim text-center p-10 text-[11px]">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-hub-text-dim text-center p-10 text-[11px]">No data in this table</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px] font-mono">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} className="text-left p-2 border-b border-border text-hub-text-muted font-bold uppercase tracking-wider text-[9px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-hub-surface-hover transition-colors">
                    {columns.map(col => (
                      <td key={col} className="p-2 border-b border-border text-muted-foreground max-w-[200px] truncate">
                        {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
