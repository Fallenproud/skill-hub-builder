// SkillHub Tracker — MV3 background service worker
// Captures API-like requests on browsed tabs, buffers locally, optional cloud sync.

const MAX_BUFFER = 500;
const ALARM_NAME = "skillhub-sync";
const ALARM_PERIOD_MIN = 0.5; // 30s — minimum allowed by Chrome
const MAX_BACKOFF_MS = 15 * 60 * 1000; // 15 min cap

// Skip noisy / sensitive hosts even though host_permissions is <all_urls>.
// We only need to *observe* requests on tabs the user actively browses; we
// never read bodies or headers, only URL + method + status + timing.
const SENSITIVE_HOST_RE = /(^|\.)(accounts\.google\.com|login\.live\.com|appleid\.apple\.com|okta\.com|auth0\.com|id\.atlassian\.com)$/i;
const SENSITIVE_PATH_RE = /(\/oauth|\/login|\/signin|\/token|\/authorize|\/sso)/i;

const startTimes = new Map(); // requestId -> startMs

function isApiLike(type) {
  return type === "xmlhttprequest" || type === "fetch";
}

function isSensitive(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    if (SENSITIVE_HOST_RE.test(u.hostname)) return true;
    if (SENSITIVE_PATH_RE.test(u.pathname)) return true;
    return false;
  } catch {
    return true;
  }
}

// Tighter URL filter: only http(s) — skips chrome://, file://, ws://, data:, etc.
const REQ_FILTER = { urls: ["http://*/*", "https://*/*"], types: ["xmlhttprequest", "fetch"] };

chrome.webRequest.onBeforeRequest.addListener(
  details => { startTimes.set(details.requestId, Date.now()); },
  REQ_FILTER
);

chrome.webRequest.onCompleted.addListener(
  async details => {
    if (!isApiLike(details.type)) return;
    const start = startTimes.get(details.requestId);
    startTimes.delete(details.requestId);
    if (isSensitive(details.url)) return;

    const duration = start ? Date.now() - start : null;

    let tabUrl = null;
    try {
      if (details.tabId >= 0) {
        const tab = await chrome.tabs.get(details.tabId);
        tabUrl = tab?.url && !isSensitive(tab.url) ? tab.url : null;
      }
    } catch (_) { /* ignore */ }

    const entry = {
      url: details.url,
      method: details.method,
      status_code: details.statusCode,
      resource_type: details.type,
      duration_ms: duration,
      tab_url: tabUrl,
      captured_at: new Date().toISOString(),
    };

    const { buffer = [] } = await chrome.storage.local.get(["buffer"]);
    buffer.push(entry);
    while (buffer.length > MAX_BUFFER) buffer.shift();
    await chrome.storage.local.set({ buffer });
  },
  REQ_FILTER
);

chrome.webRequest.onErrorOccurred.addListener(
  details => { startTimes.delete(details.requestId); },
  REQ_FILTER
);

// ---------- Sync with exponential backoff ----------
async function syncNow(trigger = "manual") {
  const {
    sync_enabled,
    hub_url,
    buffer = [],
    backoff_ms = 0,
    next_attempt_at = 0,
  } = await chrome.storage.local.get([
    "sync_enabled", "hub_url", "buffer", "backoff_ms", "next_attempt_at",
  ]);

  if (!sync_enabled || !hub_url || buffer.length === 0) {
    await setStatus({ last_trigger: trigger, last_skip_reason: !sync_enabled ? "disabled" : !hub_url ? "no_hub" : "empty" });
    return { ok: true, skipped: true };
  }
  if (Date.now() < next_attempt_at) {
    return { ok: false, deferred: true, retry_in_ms: next_attempt_at - Date.now() };
  }

  try {
    const resp = await fetch(`${hub_url.replace(/\/$/, "")}/api/public/extension-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoints: buffer }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await chrome.storage.local.set({
      buffer: [],
      last_sync_at: new Date().toISOString(),
      last_sync_count: buffer.length,
      backoff_ms: 0,
      next_attempt_at: 0,
      last_error: null,
    });
    await setStatus({ last_trigger: trigger });
    return { ok: true, count: buffer.length };
  } catch (e) {
    const next = Math.min(backoff_ms ? backoff_ms * 2 : 5000, MAX_BACKOFF_MS);
    await chrome.storage.local.set({
      backoff_ms: next,
      next_attempt_at: Date.now() + next,
      last_error: String(e?.message || e),
    });
    console.warn("[SkillHub] sync failed; backing off", next, "ms", e);
    return { ok: false, error: String(e?.message || e), backoff_ms: next };
  }
}

async function setStatus(patch) {
  const prev = (await chrome.storage.local.get(["status"])).status || {};
  await chrome.storage.local.set({
    status: { ...prev, ...patch, updated_at: new Date().toISOString() },
  });
}

// ---------- Alarm bootstrap (hardened) ----------
async function ensureAlarm() {
  if (!chrome.alarms?.create) {
    console.error("[SkillHub] chrome.alarms unavailable — check 'alarms' permission");
    await setStatus({ alarm_ok: false, alarm_error: "alarms API unavailable" });
    return;
  }
  try {
    const existing = await chrome.alarms.get(ALARM_NAME);
    if (!existing || existing.periodInMinutes !== ALARM_PERIOD_MIN) {
      await chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MIN });
      console.log("[SkillHub] alarm (re)created", ALARM_PERIOD_MIN, "min");
    }
    const verify = await chrome.alarms.get(ALARM_NAME);
    await setStatus({
      alarm_ok: !!verify,
      alarm_period_min: verify?.periodInMinutes ?? null,
      alarm_next_fire: verify?.scheduledTime ? new Date(verify.scheduledTime).toISOString() : null,
      sw_started_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[SkillHub] alarm setup failed", e);
    await setStatus({ alarm_ok: false, alarm_error: String(e?.message || e) });
  }
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); });
// Also reschedule whenever the SW wakes — guarantees recovery if alarm was lost.
ensureAlarm();

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== ALARM_NAME) return;
  setStatus({ last_alarm_at: new Date().toISOString() });
  syncNow("alarm");
});

// ---------- Messaging ----------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SYNC_NOW") {
    syncNow("manual").then(r => sendResponse(r));
    return true;
  }
  if (msg?.type === "CLEAR_BUFFER") {
    chrome.storage.local.set({ buffer: [] }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "GET_STATUS") {
    chrome.storage.local.get([
      "status", "buffer", "sync_enabled", "hub_url",
      "last_sync_at", "last_sync_count", "last_error",
      "backoff_ms", "next_attempt_at",
    ]).then(async data => {
      const alarm = await chrome.alarms.get(ALARM_NAME).catch(() => null);
      sendResponse({
        ...data,
        buffer_size: (data.buffer || []).length,
        alarm: alarm ? {
          name: alarm.name,
          periodInMinutes: alarm.periodInMinutes,
          scheduledTime: alarm.scheduledTime,
          next_fire_iso: new Date(alarm.scheduledTime).toISOString(),
        } : null,
      });
    });
    return true;
  }
  if (msg?.type === "RESCHEDULE_ALARM") {
    chrome.alarms.clear(ALARM_NAME).then(() => ensureAlarm()).then(() => sendResponse({ ok: true }));
    return true;
  }
});