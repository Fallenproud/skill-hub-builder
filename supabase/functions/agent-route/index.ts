import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAuth(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (!token || token === anon) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  if (!SUPABASE_URL || !anon) {
    return new Response(JSON.stringify({ error: "Auth not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
  });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

function sanitizePromptText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/[`\u0000-\u001F\u007F]/g, " ").slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authError = await verifyAuth(req);
  if (authError) return authError;

  try {
    const { task, skills, memories, config, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const safePersona = sanitizePromptText(config?.agent_persona, 1000) || "Be precise and thorough.";
    const safeMemories = Array.isArray(memories)
      ? memories.slice(0, 10).map((m: { content?: unknown }) => sanitizePromptText(m?.content, 500)).filter(Boolean)
      : [];
    const safeContext = sanitizePromptText(context, 4000);
    const safePreferredCost = ["low", "medium", "high"].includes(config?.preferred_cost) ? config.preferred_cost : "medium";

    const systemPrompt = `You are an AI agent router for Skill Hub. Given a task, analyze it and select the best skills to execute from the available skill registry.

${safePersona}

AVAILABLE SKILLS:
${skills?.map((s: any) => `- ${s.name} (${s.category_id}, cost:${s.cost_class}, latency:${s.latency_class}): ${s.description}`).join('\n') || 'No skills loaded'}

${safeMemories.length ? `RELEVANT MEMORIES:\n${safeMemories.map(m => `- ${m}`).join('\n')}` : ''}

${safeContext ? `ADDITIONAL CONTEXT:\n${safeContext}` : ''}

You MUST respond with a JSON object containing:
{
  "reasoning": "Your analysis of the task and why you chose these skills",
  "plan": {
    "steps": [
      {
        "sequence": 1,
        "skill": "Skill-Name",
        "reason": "Why this skill is needed",
        "parallel_group": 1,
        "estimated_cost": "low|medium|high",
        "fallback_chain": ["Alternative-Skill"]
      }
    ],
    "estimated_total_cost": "low|medium|high",
    "confidence": 0.85
  }
}

Prefer cost: ${safePreferredCost}. Group parallel-safe skills into the same parallel_group number.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: task },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
