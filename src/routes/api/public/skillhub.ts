import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature, X-Hub-Timestamp",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

function verify(signatureHex: string, expectedHex: string) {
  if (!signatureHex || signatureHex.length !== expectedHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signatureHex, "hex"), Buffer.from(expectedHex, "hex"));
  } catch {
    return false;
  }
}

export type SkillHubResult = { status: number; body: Record<string, unknown> };

export async function handleSkillHub(
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<SkillHubResult> {
  const secret = process.env.SKILL_HUB_SHARED_SECRET;
  if (!secret) return { status: 500, body: { ok: false, error: "server misconfigured" } };

  const ts = Number(timestamp);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return { status: 401, body: { ok: false, error: "stale or missing timestamp" } };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!verify(signature, expected)) {
    return { status: 401, body: { ok: false, error: "invalid signature" } };
  }

  let payload: { action?: string; skill?: string; input?: unknown };
  try { payload = JSON.parse(rawBody); } catch { return { status: 400, body: { ok: false, error: "invalid json" } }; }

  const action = payload.action || "invoke";
  try {
    await supabaseAdmin.from("api_endpoints").insert({
      url: `hub://${action}/${payload.skill ?? "unknown"}`,
      host: "skillhub",
      method: "POST",
      status_code: 200,
      resource_type: "skillhub",
      source: "skillhub-api",
      captured_at: new Date().toISOString(),
    });
  } catch {}

  if (action === "ping") return { status: 200, body: { ok: true, pong: true, at: Date.now() } };

  if (action === "list-skills") {
    const { data, error } = await supabaseAdmin
      .from("skills")
      .select("id,name,description,category_id,inputs,outputs")
      .limit(500);
    if (error) return { status: 500, body: { ok: false, error: error.message } };
    const skills = (data ?? []).map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      version: "1",
      category: (s.category_id as string) ?? "general",
      tags: [],
      input_schema: s.inputs ?? {},
      output_schema: s.outputs ?? null,
      enabled: true,
    }));
    return { status: 200, body: { ok: true, skills } };
  }

  if (action === "invoke") {
    if (!payload.skill || typeof payload.skill !== "string") {
      return { status: 400, body: { ok: false, error: "skill required" } };
    }
    // Synchronous meta-skill: return the categorized registry manifest in-band.
    if (payload.skill === "Skill-Registry-Manifest" || payload.skill === "sys-006") {
      const [{ data: cats }, { data: skillRows }] = await Promise.all([
        supabaseAdmin.from("categories").select("id,name,icon,color,sort_order").order("sort_order"),
        supabaseAdmin.from("skills").select("id,name,description,category_id,priority,cost_class,latency_class").limit(500),
      ]);
      const grouped = (cats ?? []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        icon: c.icon as string,
        color: c.color as string,
        skills: (skillRows ?? [])
          .filter((s) => s.category_id === c.id)
          .map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description ?? "",
            priority: s.priority ?? 2,
            cost_class: s.cost_class ?? "medium",
            latency_class: s.latency_class ?? "normal",
          })),
      }));
      return {
        status: 200,
        body: {
          ok: true,
          skill: "Skill-Registry-Manifest",
          result: {
            version: "v6",
            total: (skillRows ?? []).length,
            generated_at: new Date().toISOString(),
            categories: grouped,
          },
        },
      };
    }
    return { status: 202, body: { ok: true, accepted: true, skill: payload.skill, queued_at: Date.now() } };
  }

  return { status: 400, body: { ok: false, error: `unknown action: ${action}` } };
}

export const Route = createFileRoute("/api/public/skillhub")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const signature = request.headers.get("x-hub-signature") || "";
        const timestamp = request.headers.get("x-hub-timestamp") || "";
        const raw = await request.text();
        const result = await handleSkillHub(raw, signature, timestamp);
        return json(result.status, result.body);
      },
    },
  },
});