import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHmac } from "crypto";
import { handleSkillHub } from "@/routes/api/public/skillhub";

type TestMode = "valid" | "bad-signature" | "stale-timestamp" | "missing-secret-check";

export type TestResult = {
  action: "ping" | "invalid-hmac" | "stale" | "secret-check";
  button_request_status: number;
  skillhub_response_status: number | null;
  skillhub_response_body: Record<string, string | number | boolean | null>;
  resolved_url_used: string;
  used_origin_source: "request-origin" | "SKILL_HUB_BASE_URL" | "fallback";
  result: string;
  ok: boolean;
};

async function run(mode: TestMode): Promise<TestResult> {
  const secret = process.env.SKILL_HUB_SHARED_SECRET;

  // Resolve URL for display/debug (we no longer self-fetch — Workers can't
  // reliably reach their own hostname; calling handler logic directly).
  let resolved_url_used = "";
  let used_origin_source: TestResult["used_origin_source"] = "fallback";
  try {
    const req = getRequest();
    if (req) {
      resolved_url_used = `${new URL(req.url).origin}/api/public/skillhub`;
      used_origin_source = "request-origin";
    }
  } catch {}
  if (!resolved_url_used && process.env.SKILL_HUB_BASE_URL) {
    resolved_url_used = `${process.env.SKILL_HUB_BASE_URL}/api/public/skillhub`;
    used_origin_source = "SKILL_HUB_BASE_URL";
  }
  if (!resolved_url_used) {
    resolved_url_used = "https://my-agenthub.lovable.app/api/public/skillhub";
    used_origin_source = "fallback";
  }
  console.log(`[skillhub-test] mode=${mode} url=${resolved_url_used} source=${used_origin_source}`);

  if (mode === "missing-secret-check") {
    return {
      action: "secret-check",
      button_request_status: 200,
      skillhub_response_status: null,
      skillhub_response_body: { secret_present: !!secret },
      resolved_url_used,
      used_origin_source,
      result: secret ? "secret present true" : "secret missing",
      ok: !!secret,
    };
  }

  if (!secret) {
    return {
      action: mode === "valid" ? "ping" : mode === "bad-signature" ? "invalid-hmac" : "stale",
      button_request_status: 200,
      skillhub_response_status: 500,
      skillhub_response_body: { error: "SKILL_HUB_SHARED_SECRET missing" },
      resolved_url_used,
      used_origin_source,
      result: "server misconfigured",
      ok: false,
    };
  }

  const body = JSON.stringify({ action: "ping" });
  let ts = Math.floor(Date.now() / 1000);
  if (mode === "stale-timestamp") ts -= 600;
  let sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  if (mode === "bad-signature") sig = "0".repeat(sig.length);

  const inner = await handleSkillHub(body, sig, String(ts));
  const innerBody = inner.body as Record<string, string | number | boolean | null>;

  const action: TestResult["action"] =
    mode === "valid" ? "ping" : mode === "bad-signature" ? "invalid-hmac" : "stale";

  const result =
    "pong" in innerBody
      ? "ok"
      : "error" in innerBody
      ? String(innerBody.error)
      : String(inner.status);

  return {
    action,
    button_request_status: 200,
    skillhub_response_status: inner.status,
    skillhub_response_body: innerBody,
    resolved_url_used,
    used_origin_source,
    result,
    ok: inner.status >= 200 && inner.status < 300,
  };
}

export const testSkillHubPing = createServerFn({ method: "POST" })
  .inputValidator((input: { mode?: TestMode }) => ({ mode: input?.mode ?? "valid" }))
  .handler(async ({ data }) => run(data.mode));
