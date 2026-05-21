import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

export type SophieCallbackResult = {
  action: "callback-valid" | "callback-bad-signature" | "callback-config-check";
  callback_url: string;
  request_status: number | null;
  response_body: string;
  parsed_body: Record<string, string | number | boolean | null | object> | null;
  result: string;
  ok: boolean;
  expected: string;
};

type Mode = "valid" | "bad-signature" | "config-check";

async function run(mode: Mode): Promise<SophieCallbackResult> {
  const url = process.env.SOPHIE_CALLBACK_URL;
  const secret = process.env.SKILL_HUB_SHARED_SECRET;
  const callback_url = url ?? "(SOPHIE_CALLBACK_URL not set)";

  if (mode === "config-check") {
    return {
      action: "callback-config-check",
      callback_url,
      request_status: null,
      response_body: "",
      parsed_body: { url_present: !!url, secret_present: !!secret },
      result: url && secret ? "config present" : !url ? "SOPHIE_CALLBACK_URL missing" : "SKILL_HUB_SHARED_SECRET missing",
      ok: !!(url && secret),
      expected: "both present",
    };
  }

  if (!url || !secret) {
    return {
      action: mode === "valid" ? "callback-valid" : "callback-bad-signature",
      callback_url,
      request_status: null,
      response_body: "",
      parsed_body: null,
      result: !url ? "SOPHIE_CALLBACK_URL missing" : "SKILL_HUB_SHARED_SECRET missing",
      ok: false,
      expected: mode === "valid" ? "404 unknown request_id" : "401 invalid signature",
    };
  }

  const payload = {
    request_id: `callback-test-${Date.now()}`,
    status: "success" as const,
    output: { test: true, note: "skillhub contract test" },
    duration_ms: 0,
  };
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  let sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  if (mode === "bad-signature") sig = "0".repeat(sig.length);

  console.log(`[sophie-callback-test] mode=${mode} url=${url}`);

  let status: number | null = null;
  let text = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature": sig,
        "X-Hub-Timestamp": String(ts),
      },
      body,
    });
    status = res.status;
    text = await res.text();
  } catch (e) {
    return {
      action: mode === "valid" ? "callback-valid" : "callback-bad-signature",
      callback_url,
      request_status: null,
      response_body: String((e as Error)?.message ?? e),
      parsed_body: null,
      result: "network error",
      ok: false,
      expected: mode === "valid" ? "404 unknown request_id" : "401 invalid signature",
    };
  }

  let parsed: Record<string, string | number | boolean | null | object> | null = null;
  try { parsed = JSON.parse(text); } catch {}

  const action: SophieCallbackResult["action"] =
    mode === "valid" ? "callback-valid" : "callback-bad-signature";
  const expected = mode === "valid" ? "404 unknown request_id" : "401 invalid signature";
  const ok = mode === "valid" ? status === 404 : status === 401;
  const result = ok
    ? mode === "valid" ? "contract ok — unknown request_id rejected" : "contract ok — invalid signature rejected"
    : `unexpected ${status}`;

  return {
    action,
    callback_url,
    request_status: status,
    response_body: text.slice(0, 500),
    parsed_body: parsed,
    result,
    ok,
    expected,
  };
}

export const testSophieCallback = createServerFn({ method: "POST" })
  .inputValidator((input: { mode?: Mode }) => ({ mode: input?.mode ?? "valid" }))
  .handler(async ({ data }) => run(data.mode));