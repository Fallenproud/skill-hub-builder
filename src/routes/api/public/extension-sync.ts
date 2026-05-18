import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Extension-Token",
};

interface SyncEndpoint {
  url: string;
  method?: string;
  status_code?: number;
  resource_type?: string;
  duration_ms?: number;
  tab_url?: string;
  captured_at?: string;
}

export const Route = createFileRoute("/api/public/extension-sync")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const expected = process.env.EXTENSION_SYNC_TOKEN;
          if (!expected) {
            console.error("extension-sync: EXTENSION_SYNC_TOKEN not configured");
            return new Response(JSON.stringify({ ok: false, error: "server misconfigured" }), {
              status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          const provided = request.headers.get("x-extension-token") || "";
          // constant-time-ish compare
          if (provided.length !== expected.length || provided !== expected) {
            return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          const body = await request.json() as { endpoints?: SyncEndpoint[] };
          const items = (body.endpoints || []).slice(0, 500);
          if (items.length === 0) {
            return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
              status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          // Load admin-managed host allowlist
          const { data: allowRows } = await supabaseAdmin
            .from("api_endpoint_allowlist")
            .select("pattern")
            .eq("enabled", true);
          const patterns = (allowRows || []).map(r => r.pattern as string);
          const matchHost = (host: string | null) => {
            if (!host) return false;
            for (const p of patterns) {
              if (p === "*") return true;
              if (p.startsWith("*.")) {
                const suffix = p.slice(1); // ".example.com"
                if (host === suffix.slice(1) || host.endsWith(suffix)) return true;
              } else if (p === host) {
                return true;
              }
            }
            return false;
          };

          const mapped = items
            .filter(e => typeof e.url === "string" && e.url.length < 2000)
            .map(e => {
              let host: string | null = null;
              try { host = new URL(e.url).host; } catch { /* keep null */ }
              return {
                url: e.url,
                host,
                method: typeof e.method === "string" ? e.method.slice(0, 10) : null,
                status_code: typeof e.status_code === "number" ? e.status_code : null,
                resource_type: typeof e.resource_type === "string" ? e.resource_type.slice(0, 32) : null,
                duration_ms: typeof e.duration_ms === "number" ? Math.round(e.duration_ms) : null,
                tab_url: typeof e.tab_url === "string" ? e.tab_url.slice(0, 2000) : null,
                captured_at: typeof e.captured_at === "string" ? e.captured_at : new Date().toISOString(),
                source: "extension",
              };
            });

          const rows = mapped.filter(r => matchHost(r.host));
          const skipped = mapped.length - rows.length;

          if (rows.length === 0) {
            return new Response(JSON.stringify({ ok: true, inserted: 0, skipped, reason: patterns.length === 0 ? "allowlist_empty" : "no_matches" }), {
              status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          const { error, count } = await supabaseAdmin
            .from("api_endpoints")
            .insert(rows, { count: "exact" });

          if (error) {
            console.error("extension-sync insert error:", error);
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          return new Response(JSON.stringify({ ok: true, inserted: count ?? rows.length, skipped }), {
            status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      },
    },
  },
});