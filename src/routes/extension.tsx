import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/extension")({
  component: ExtensionPage,
  head: () => ({
    meta: [
      { title: "Extension — Skill Hub" },
      { name: "description", content: "Download the SkillHub Chrome extension to track API endpoints and route tasks from any tab" },
    ],
  }),
});

function download() {
  fetch("/skillhub-extension.zip")
    .then(res => {
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "skillhub-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(err => alert(err.message));
}

function ExtensionPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  return (
    <div className="p-7 max-w-[820px] mx-auto">
      <div className="mb-6">
        <div className="text-[9px] text-hub-text-dim tracking-[0.2em] uppercase mb-1.5">System</div>
        <h1 className="font-display text-2xl font-black text-foreground tracking-tight" style={{ color: "#f59e0b" }}>
          Chrome Extension
        </h1>
        <p className="text-[11px] text-hub-text-muted mt-1">
          Quick task routing from any tab + automatic API endpoint tracking while you browse.
        </p>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] text-hub-text-dim tracking-[0.15em] uppercase mb-1">v1.0.0</div>
            <div className="text-[14px] font-bold text-foreground">SkillHub Tracker</div>
            <div className="text-[11px] text-hub-text-muted mt-1">
              Captures URL, method, status, and timing for every API request on the active tab.
              Local-first; opt-in cloud sync to your hub.
            </div>
          </div>
          <button
            onClick={download}
            className="px-4 py-2 rounded text-[11px] font-bold cursor-pointer transition-all"
            style={{ background: "#f59e0b18", border: "1px solid #f59e0b44", color: "#f59e0b" }}
          >
            ⬇ Download .zip
          </button>
        </div>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-5 mb-5">
        <div className="text-[10px] text-hub-text-dim tracking-[0.15em] uppercase mb-3 font-bold">Install</div>
        <ol className="text-[11.5px] text-foreground space-y-2 list-decimal list-inside">
          <li>Unzip the downloaded file.</li>
          <li>Open <code className="font-mono text-hub-pink">chrome://extensions</code> in Chrome (or any Chromium browser).</li>
          <li>Enable <strong>Developer mode</strong> (top-right toggle).</li>
          <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
          <li>Pin the SkillHub icon to your toolbar.</li>
        </ol>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-5 mb-5">
        <div className="text-[10px] text-hub-text-dim tracking-[0.15em] uppercase mb-3 font-bold">What it does</div>
        <ul className="text-[11.5px] text-foreground space-y-1.5">
          <li>◎ <strong>Quick route</strong> — type a task in the popup, sends it to <code className="font-mono text-hub-pink">/agent</code></li>
          <li>⊕ <strong>API tracker</strong> — logs URL · method · status · duration locally</li>
          <li>☁ <strong>Optional sync</strong> — toggle to push captures to <code className="font-mono">/api/public/extension-sync</code></li>
          <li>⊘ <strong>Local-first</strong> — buffer stays in <code className="font-mono">chrome.storage</code> until you sync or export</li>
        </ul>
      </div>

      <div className="bg-hub-surface border border-hub-border rounded-lg p-5">
        <div className="text-[10px] text-hub-text-dim tracking-[0.15em] uppercase mb-2 font-bold">Hub endpoint</div>
        <code className="text-[11px] text-hub-pink font-mono break-all">{origin}/api/public/extension-sync</code>
        <div className="text-[10px] text-hub-text-muted mt-2">Pre-filled in the extension popup. Change it in Options if you self-host.</div>
      </div>
    </div>
  );
}