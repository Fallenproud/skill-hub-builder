// SkillHub Tracker — background service worker
// Captures API requests on the active tab, buffers locally, optional cloud sync.

const MAX_BUFFER = 500;
const SYNC_INTERVAL_MS = 30 * 1000;

const startTimes = new Map(); // requestId -> startMs

function isApiLike(details) {
  // Only track XHR / fetch and main subframes that look like APIs
  return ["xmlhttprequest", "fetch"].includes(details.type);
}

chrome.webRequest.onBeforeRequest.addListener(
  details => { startTimes.set(details.requestId, Date.now()); },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onCompleted.addListener(
  async details => {
    if (!isApiLike(details)) return;
    const start = startTimes.get(details.requestId);
    startTimes.delete(details.requestId);
    const duration = start ? Date.now() - start : null;

    let tabUrl = null;
    try {
      if (details.tabId >= 0) {
        const tab = await chrome.tabs.get(details.tabId);
        tabUrl = tab?.url || null;
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
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  details => { startTimes.delete(details.requestId); },
  { urls: ["<all_urls>"] }
);

// Periodic sync (only when sync_enabled)
async function syncNow() {
  const { sync_enabled, hub_url, buffer = [] } = await chrome.storage.local.get(["sync_enabled", "hub_url", "buffer"]);
  if (!sync_enabled || !hub_url || buffer.length === 0) return;
  try {
    const resp = await fetch(`${hub_url.replace(/\/$/, "")}/api/public/extension-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoints: buffer }),
    });
    if (resp.ok) {
      // Drain buffer on success
      await chrome.storage.local.set({ buffer: [], last_sync_at: new Date().toISOString() });
    }
  } catch (e) {
    console.warn("[SkillHub] sync failed", e);
  }
}

chrome.alarms.create?.("skillhub-sync", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener?.(alarm => {
  if (alarm.name === "skillhub-sync") syncNow();
});

// Allow manual sync from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SYNC_NOW") {
    syncNow().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "CLEAR_BUFFER") {
    chrome.storage.local.set({ buffer: [] }).then(() => sendResponse({ ok: true }));
    return true;
  }
});

// Fallback timer (in case alarms perm missing)
setInterval(syncNow, SYNC_INTERVAL_MS);