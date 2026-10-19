import handler from "vinext/server/app-router-entry";

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const visitor = request.headers.get("cf-visitor") ?? "";
    const fwd = request.headers.get("x-forwarded-proto") ?? "";
    if (url.hostname === "www.imtryingtodesign.com") {
      url.hostname = "imtryingtodesign.com";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    if (url.protocol === "http:" || fwd.startsWith("http,") || fwd === "http" || visitor.includes('"scheme":"http"')) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
