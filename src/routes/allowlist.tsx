import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/allowlist")({
  component: AllowlistPage,
  head: () => ({
    meta: [
      { title: "Sync Allowlist — Skill Hub" },
      { name: "description", content: "Admin-managed host patterns the extension is allowed to sync" },
    ],
  }),
});

interface Row {
  id: string;
  pattern: string;
  note: string | null;
  enabled: boolean;
  created_at: string;
}

function AllowlistPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pattern, setPattern] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_endpoint_allowlist")
      .select("id,pattern,note,enabled,created_at")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else { setRows(data as Row[]); setErr(null); }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      if (admin) await load();
      else setLoading(false);
    })();
  }, [load]);

  const add = async () => {
    const p = pattern.trim().toLowerCase();
    if (!p) return;
    const { error } = await supabase.from("api_endpoint_allowlist").insert({ pattern: p, note: note.trim() || null });
    if (error) { setErr(error.message); return; }
    setPattern(""); setNote(""); await load();
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase.from("api_endpoint_allowlist").update({ enabled: !r.enabled }).eq("id", r.id);
    if (error) setErr(error.message);
    else await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("api_endpoint_allowlist").delete().eq("id", id);
    if (error) setErr(error.message);
    else await load();
  };

  if (loading) return <div className="p-7 text-[12px] text-hub-text-muted">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="p-7 max-w-[620px] mx-auto">
        <div className="bg-hub-surface border border-hub-border rounded-lg p-5">
          <div className="text-[10px] tracking-[0.18em] uppercase text-hub-text-dim mb-2">Unauthorized</div>
          <div className="text-[13px] font-bold text-foreground mb-1">Admin access required</div>
          <div className="text-[11px] text-hub-text-muted">Sign in with an admin account to manage the extension sync allowlist.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 max-w-[820px] mx-auto">
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">System</div>
        <h1 className="font-display text-2xl font-black text-foreground tracking-tight" style={{ color: "#f43f5e" }}>
          Sync Allowlist
        </h1>
        <p className="text-[11px] text-hub-text-muted mt-1">
          Only endpoints whose host matches an enabled pattern below will be inserted by <code className="font-mono text-hub-pink">/api/public/extension-sync</code>.
        </p>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-5 mb-5">
        <div className="text-[10px] text-hub-text-dim tracking-[0.15em] uppercase mb-3 font-bold">Add pattern</div>
        <div className="flex gap-2 mb-2">
          <input
            value={pattern} onChange={e => setPattern(e.target.value)}
            placeholder="api.example.com or *.example.com or *"
            className="flex-1 bg-hub-bg border border-hub-border rounded px-3 py-2 text-[12px] font-mono text-foreground"
          />
          <input
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="note (optional)"
            className="w-[200px] bg-hub-bg border border-hub-border rounded px-3 py-2 text-[12px] text-foreground"
          />
          <button onClick={add} className="px-4 py-2 rounded text-[11px] font-bold cursor-pointer" style={{ background: "#f43f5e18", border: "1px solid #f43f5e44", color: "#f43f5e" }}>
            + Add
          </button>
        </div>
        <div className="text-[10px] text-hub-text-muted">
          Formats: exact host (<code>api.example.com</code>), wildcard subdomain (<code>*.example.com</code>), or <code>*</code> to allow all.
        </div>
      </div>

      {err && <div className="mb-4 text-[11px] text-red-400 font-mono">{err}</div>}

      <div className="bg-hub-surface border border-hub-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 text-[10px] text-hub-text-dim tracking-[0.15em] uppercase font-bold border-b border-hub-border">
          {rows.length} pattern{rows.length === 1 ? "" : "s"}
        </div>
        {rows.length === 0 ? (
          <div className="p-5 text-[11px] text-hub-text-muted">No patterns yet — the sync endpoint will reject everything until you add one.</div>
        ) : rows.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-5 py-3 border-b border-hub-border last:border-b-0">
            <button
              onClick={() => toggle(r)}
              className="px-2 py-1 rounded text-[9px] font-bold cursor-pointer tracking-[0.1em] uppercase"
              style={{
                background: r.enabled ? "#10b98118" : "#64748b18",
                border: `1px solid ${r.enabled ? "#10b98144" : "#64748b44"}`,
                color: r.enabled ? "#10b981" : "#94a3b8",
              }}
            >
              {r.enabled ? "On" : "Off"}
            </button>
            <code className="flex-1 text-[12px] font-mono text-foreground">{r.pattern}</code>
            <span className="text-[10px] text-hub-text-muted truncate max-w-[200px]">{r.note}</span>
            <button onClick={() => remove(r.id)} className="text-[10px] text-hub-text-dim hover:text-red-400 cursor-pointer">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
