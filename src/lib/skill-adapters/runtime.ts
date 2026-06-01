import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type LLMOpts = {
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
  json?: boolean;
};

export async function runLLM(opts: LLMOpts): Promise<{ text: string; model: string; raw?: unknown }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const model = opts.model ?? "google/gemini-2.5-flash";
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  const body: Record<string, unknown> = { model, messages };
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, model, raw: data };
}

export async function rememberLongTerm(content: string, importance = 3, tags: string[] = []) {
  const { data, error } = await supabaseAdmin
    .from("memories")
    .insert({ content, importance, tags: tags as never, source: "skill-adapter" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id;
}

export async function recallLongTerm(query: string, limit = 10) {
  // Naive ILIKE recall until pgvector is wired (core-008).
  const { data, error } = await supabaseAdmin
    .from("memories")
    .select("id,content,importance,tags,created_at")
    .ilike("content", `%${query}%`)
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}