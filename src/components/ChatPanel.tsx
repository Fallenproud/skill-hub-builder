import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { consumeSSE, functionsAuthHeader, functionsUrl } from "@/lib/sse";

interface Msg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}

const SUGGESTIONS = [
  "What skills are available in the 'research' category?",
  "Summarize my last 3 agent sessions",
  "Propose a new skill registry entry for translating audio files",
  "What's my current agent config?",
];

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const streamBufRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "New chat" })
      .select()
      .single();
    if (error || !data) throw error || new Error("session create failed");
    setSessionId(data.id);
    return data.id;
  };

  const loadContext = async (): Promise<string> => {
    const [skillsRes, sessionsRes, configRes, memoriesRes] = await Promise.all([
      supabase.from("skills").select("id, name, category_id, description, cost_class").limit(120),
      supabase.from("agent_sessions").select("task, status, total_skills, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("agent_config").select("key, value"),
      supabase.from("memories").select("content, importance").order("importance", { ascending: false }).limit(8),
    ]);

    const skillsTxt = (skillsRes.data || [])
      .map((s: any) => `- ${s.name} [${s.category_id}/${s.cost_class}]: ${s.description || ''}`)
      .join("\n");
    const sessionsTxt = (sessionsRes.data || [])
      .map((s: any) => `- "${s.task}" (${s.status}, ${s.total_skills || 0} skills)`)
      .join("\n") || '(none)';
    const configTxt = (configRes.data || [])
      .map((c: any) => `- ${c.key}: ${c.value}`)
      .join("\n") || '(defaults)';
    const memTxt = (memoriesRes.data || [])
      .map((m: any) => `- [${m.importance}] ${m.content}`)
      .join("\n") || '(none)';

    return `## Skills (${skillsRes.data?.length || 0})\n${skillsTxt}\n\n## Recent sessions\n${sessionsTxt}\n\n## Agent config\n${configTxt}\n\n## Memories\n${memTxt}`;
  };

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    setStreaming(true);

    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    streamBufRef.current = "";
    setMessages([...next, { role: "assistant", content: "" }]);

    try {
      const sId = await ensureSession();
      await supabase.from("chat_messages").insert({ session_id: sId, role: "user", content: text });

      const ctx = await loadContext();
      const resp = await fetch(functionsUrl("agent-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...functionsAuthHeader() },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          context: ctx,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        setMessages([...next, { role: "assistant", content: `⚠️ ${err.error || "Error"}` }]);
        setStreaming(false);
        return;
      }

      await consumeSSE(resp.body, chunk => {
        streamBufRef.current += chunk;
        setMessages([...next, { role: "assistant", content: streamBufRef.current }]);
      });

      await supabase.from("chat_messages").insert({
        session_id: sId,
        role: "assistant",
        content: streamBufRef.current,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setStreaming(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setCollapsed(false); }}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-full text-[11px] font-bold cursor-pointer transition-all"
        style={{
          background: "#ec489918",
          border: "1px solid #ec489944",
          color: "#ec4899",
          boxShadow: "0 8px 32px -8px #ec489955",
        }}
      >
        ◎ Ask SkillHub
      </button>
    );
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 bg-sidebar border-l border-sidebar-border transition-all duration-200 overflow-hidden"
      style={{ width: collapsed ? 0 : 360 }}
    >
      <div
        className="border-b border-sidebar-border flex items-center justify-between"
        style={{ padding: "12px 14px" }}
      >
        <div>
          <div className="font-display text-[13px] font-black text-hub-pink tracking-tight">SKILLHUB CHAT</div>
          <div className="text-[8px] text-hub-text-dim tracking-[0.15em] uppercase">read-only assistant</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setMessages([]); setSessionId(null); }}
            title="New chat"
            className="text-[10px] text-hub-text-dim hover:text-foreground bg-transparent border-none cursor-pointer px-1.5 py-0.5"
          >
            ↺
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close"
            className="text-[12px] text-hub-text-dim hover:text-foreground bg-transparent border-none cursor-pointer px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div>
            <div className="text-[10px] text-hub-text-dim tracking-[0.15em] uppercase mb-2">Try</div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-[10.5px] text-hub-text-muted bg-hub-surface border border-hub-border rounded p-2 cursor-pointer hover:border-hub-border-hover hover:bg-hub-surface-hover"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-6" : "mr-2"}>
            <div className="text-[8px] text-hub-text-dim tracking-[0.15em] uppercase mb-1">
              {m.role === "user" ? "You" : "SkillHub"}
            </div>
            <div
              className="text-[11px] text-foreground whitespace-pre-wrap font-mono leading-relaxed rounded p-2.5 border"
              style={{
                background: m.role === "user" ? "#3b82f612" : "var(--hub-surface)",
                borderColor: m.role === "user" ? "#3b82f633" : "var(--hub-border)",
              }}
            >
              {m.content || (streaming && i === messages.length - 1 ? "▎" : "")}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-2.5">
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={streaming ? "Streaming..." : "Ask anything…"}
            disabled={streaming}
            className="flex-1 bg-input border border-border rounded p-2 text-foreground text-[11px] outline-none font-mono disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer disabled:opacity-50"
            style={{ background: "#ec489918", border: "1px solid #ec489944", color: "#ec4899" }}
          >
            ↑
          </button>
        </div>
      </div>
    </aside>
  );
}