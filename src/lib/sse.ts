/**
 * Helper that consumes an OpenAI-style SSE stream and forwards extracted
 * `delta.content` chunks to a callback.
 */
export async function consumeSSE(
  body: ReadableStream<Uint8Array> | null,
  onChunk: (text: string) => void,
) {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
      const json = line.slice(6).trim();
      if (json === "[DONE]") return;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch {
        /* partial */
      }
    }
  }
}

export function functionsUrl(name: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${name}`;
}

export async function functionsAuthHeader(): Promise<Record<string, string>> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You must be signed in to invoke this endpoint.");
  }
  return {
    Authorization: `Bearer ${token}`,
    apikey: key,
  };
}