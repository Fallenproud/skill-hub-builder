import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

type TestMode = "valid" | "bad-signature" | "stale-timestamp" | "missing-secret-check";

async function callHub(mode: TestMode) {
  const secret = process.env.SKILL_HUB_SHARED_SECRET;
  const base = process.env.SKILL_HUB_BASE_URL || "https://my-agenthub.lovable.app";

  if (mode === "missing-secret-check") {
    return { ok: !!secret, status: secret ? 200 : 500, message: secret ? "secret present" : "SKILL_HUB_SHARED_SECRET missing" };
  }
  if (!secret) return { ok: false, status: 0, message: "SKILL_HUB_SHARED_SECRET missing" };

  const body = JSON.stringify({ action: "ping" });
  let ts = Math.floor(Date.now() / 1000);
  if (mode === "stale-timestamp") ts -= 600;
  let sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  if (mode === "bad-signature") sig = "0".repeat(sig.length);

  try {
    const res = await fetch(`${base}/api/public/skillhub`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature": sig,
        "X-Hub-Timestamp": String(ts),
      },
      body,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch {}
    const msg =
      typeof parsed === "object" && parsed && "error" in (parsed as any)
        ? String((parsed as any).error)
        : typeof parsed === "object" && parsed && "pong" in (parsed as any)
        ? "pong"
        : text.slice(0, 120);
    return { ok: res.ok, status: res.status, message: msg };
  } catch (e) {
    return { ok: false, status: 0, message: e instanceof Error ? e.message : "network error" };
  }
}

export const testSkillHubPing = createServerFn({ method: "POST" })
  .inputValidator((input: { mode?: TestMode }) => ({ mode: input?.mode ?? "valid" }))
  .handler(async ({ data }) => callHub(data.mode));
