const $ = id => document.getElementById(id);

async function refresh() {
  const { buffer = [], hub_url = "", sync_enabled = false, last_sync_at } =
    await chrome.storage.local.get(["buffer", "hub_url", "sync_enabled", "last_sync_at"]);
  $("bufCount").textContent = buffer.length;
  $("hub").value = hub_url;
  $("sync").checked = !!sync_enabled;
  $("lastSync").textContent = last_sync_at ? new Date(last_sync_at).toLocaleString() : "never";
}

function setStatus(msg, ok = true) {
  const el = $("status");
  el.textContent = msg;
  el.className = ok ? "ok" : "err";
  setTimeout(() => { el.textContent = ""; }, 4000);
}

$("hub").addEventListener("change", async e => {
  await chrome.storage.local.set({ hub_url: e.target.value.trim() });
  setStatus("Hub URL saved");
});

$("sync").addEventListener("change", async e => {
  await chrome.storage.local.set({ sync_enabled: e.target.checked });
  setStatus(e.target.checked ? "Auto-sync ON" : "Auto-sync OFF");
});

$("syncNow").addEventListener("click", async () => {
  setStatus("Syncing…");
  chrome.runtime.sendMessage({ type: "SYNC_NOW" }, async () => {
    await refresh();
    setStatus("Sync requested");
  });
});

$("clear").addEventListener("click", async () => {
  chrome.runtime.sendMessage({ type: "CLEAR_BUFFER" }, async () => {
    await refresh();
    setStatus("Buffer cleared");
  });
});

$("route").addEventListener("click", async () => {
  const task = $("task").value.trim();
  const { hub_url } = await chrome.storage.local.get(["hub_url"]);
  if (!task) { setStatus("Enter a task first", false); return; }
  if (!hub_url) { setStatus("Set hub URL first", false); return; }
  const url = `${hub_url.replace(/\/$/, "")}/agent?task=${encodeURIComponent(task)}`;
  await chrome.tabs.create({ url });
});

$("openHub").addEventListener("click", async e => {
  e.preventDefault();
  const { hub_url } = await chrome.storage.local.get(["hub_url"]);
  if (hub_url) await chrome.tabs.create({ url: hub_url });
});

refresh();
setInterval(refresh, 2000);