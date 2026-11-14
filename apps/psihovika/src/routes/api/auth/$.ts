import { createFileRoute } from "@tanstack/react-router";
import { getAuthReady } from "@/lib/auth/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => (await getAuthReady()).handler(request),
      POST: async ({ request }) => (await getAuthReady()).handler(request),
    },
  },
});
