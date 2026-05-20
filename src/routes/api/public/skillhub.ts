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

export const Route = createFileRoute("/api/public/skillhub")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const secret = process.env.SKILL_HUB_SHARED_SECRET;
        if (!secret) return json(500, { ok: false, error: "server misconfigured" });

        const signature = request.headers.get("x-hub-signature") || "";
        const timestamp = request.headers.get("x-hub-timestamp") || "";
        const ts = Number(timestamp);
        if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
          return json(401, { ok: false, error: "stale or missing timestamp" });
        }

        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
        if (!verify(signature, expected)) return json(401, { ok: false, error: "invalid signature" });

        let payload: { action?: string; skill?: string; input?: unknown; meta?: Record<string, unknown> };
        try { payload = JSON.parse(raw); } catch { return json(400, { ok: false, error: "invalid json" }); }

        const action = payload.action || "invoke";
        await supabaseAdmin.from("api_endpoints").insert({
          url: `hub://${action}/${payload.skill ?? "unknown"}`,
          host: "skillhub",
          method: "POST",
          status_code: 200,
          resource_type: "skillhub",
          source: "skillhub-api",
          captured_at: new Date().toISOString(),
        });

        if (action === "ping") return json(200, { ok: true, pong: true, at: Date.now() });

        if (action === "list-skills") {
          const { data, error } = await supabaseAdmin.from("skills").select("id,name,category,description").limit(500);
          if (error) return json(500, { ok: false, error: error.message });
          return json(200, { ok: true, skills: data });
        }

        if (action === "invoke") {
          if (!payload.skill || typeof payload.skill !== "string") {
            return json(400, { ok: false, error: "skill required" });
          }
          return json(202, { ok: true, accepted: true, skill: payload.skill, queued_at: Date.now() });
        }

        return json(400, { ok: false, error: `unknown action: ${action}` });
      },
    },
  },
});