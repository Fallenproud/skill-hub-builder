import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import HubSidebar from "@/components/HubSidebar";
import HubTopBar from "@/components/HubTopBar";
import ChatPanel from "@/components/ChatPanel";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-black text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found in hub registry</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Skill Hub — Agent OS" },
      { name: "description", content: "Production-grade meta-agent skill registry with 88 skills" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="flex h-screen bg-background">
      <HubSidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <HubTopBar />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
