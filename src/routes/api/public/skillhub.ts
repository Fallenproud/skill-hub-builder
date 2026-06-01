import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdapter, listExecutableSkills } from "@/lib/skill-adapters";

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
            version: "v7.0",
            total: (skillRows ?? []).length,
            executable: listExecutableSkills(),
            generated_at: new Date().toISOString(),
            categories: grouped,
          },
        },
      };
    }
    // v7.0 — synchronous dispatch via executable adapter registry.
    const adapter = getAdapter(payload.skill);
    if (adapter) {
      const requestId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = Date.now();
      await supabaseAdmin.from("skill_invocations").insert({
        request_id: requestId,
        skill: adapter.id,
        input: (payload.input ?? null) as never,
        status: "running",
        callback_url: null,
      });
      try {
        const result = await adapter.execute(
          (payload.input as Record<string, unknown>) ?? {},
          { requestId },
        );
        const durationMs = Date.now() - startedAt;
        await supabaseAdmin
          .from("skill_invocations")
          .update({
            status: "success",
            output: result as never,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq("request_id", requestId);
        return {
          status: 200,
          body: { ok: true, skill: adapter.id, request_id: requestId, duration_ms: durationMs, result },
        };
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        await supabaseAdmin
          .from("skill_invocations")
          .update({
            status: "error",
            error: msg,
            duration_ms: Date.now() - startedAt,
            completed_at: new Date().toISOString(),
          })
          .eq("request_id", requestId);
        return { status: 500, body: { ok: false, skill: adapter.id, request_id: requestId, error: msg } };
      }
    }
    // Async runner: persist invocation, simulate work, dispatch signed callback with retry.
    const requestId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const callbackUrl = process.env.SOPHIE_CALLBACK_URL || null;
    const startedAt = Date.now();

    await supabaseAdmin.from("skill_invocations").insert({
      request_id: requestId,
      skill: payload.skill,
      input: (payload.input ?? null) as never,
      status: "running",
      callback_url: callbackUrl,
    });

    // Stub execution result — real adapters will plug in here.
    const execOutput = { accepted: true, skill: payload.skill, note: "stub-runner: no executor wired" };
    const durationMs = Date.now() - startedAt;

    let cbDelivered = false;
    let cbAttempts = 0;
    let cbLastStatus: number | null = null;
    let cbLastResponse = "";

    if (callbackUrl) {
      const cbBody = JSON.stringify({
        request_id: requestId,
        status: "success",
        output: execOutput,
        duration_ms: durationMs,
      });
      const backoff = [0, 400, 1200]; // ms before attempts 1,2,3
      for (let i = 0; i < backoff.length; i++) {
        if (backoff[i] > 0) await new Promise((r) => setTimeout(r, backoff[i]));
        cbAttempts++;
        const ts = Math.floor(Date.now() / 1000);
        const sig = createHmac("sha256", secret).update(`${ts}.${cbBody}`).digest("hex");
        try {
          const res = await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Hub-Signature": sig, "X-Hub-Timestamp": String(ts) },
            body: cbBody,
          });
          cbLastStatus = res.status;
          cbLastResponse = (await res.text()).slice(0, 500);
          if (res.status >= 200 && res.status < 300) { cbDelivered = true; break; }
          if (res.status === 404) { cbDelivered = false; break; } // unknown request_id — won't recover
          if (res.status < 500 && res.status !== 408 && res.status !== 429) break; // 4xx non-retryable
        } catch (e) {
          cbLastStatus = null;
          cbLastResponse = String((e as Error)?.message ?? e).slice(0, 500);
        }
      }
    }

    await supabaseAdmin
      .from("skill_invocations")
      .update({
        status: "success",
        output: execOutput as never,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
        callback_attempts: cbAttempts,
        callback_last_status: cbLastStatus,
        callback_last_response: cbLastResponse,
        callback_last_at: cbAttempts > 0 ? new Date().toISOString() : null,
        callback_delivered: cbDelivered,
      })
      .eq("request_id", requestId);

    return {
      status: 202,
      body: {
        ok: true,
        accepted: true,
        skill: payload.skill,
        request_id: requestId,
        queued_at: startedAt,
        callback: callbackUrl
          ? { dispatched: true, delivered: cbDelivered, attempts: cbAttempts, last_status: cbLastStatus }
          : { dispatched: false, reason: "SOPHIE_CALLBACK_URL not configured" },
      },
    };
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