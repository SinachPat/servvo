/**
 * Servvo remote MCP server — the agent-facing endpoint.
 *
 * Transport: Streamable HTTP. Auth: OAuth 2.1 resource server (see auth.ts).
 * Per-brand: the brand comes from the verified token, NEVER from tool arguments.
 */

import express, { type Express } from "express";
import { loadAuthConfig, protectedResourceMetadata, send401, authenticate } from "./auth.js";

const app: Express = express();
app.use(express.json());

const cfg = loadAuthConfig();

// RFC 9728 — how MCP clients discover the authorization server.
app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json(protectedResourceMetadata(cfg));
});

// Data-free liveness probe (intentionally unauthenticated).
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "servvo-mcp", version: "0.1.0" });
});

/**
 * The MCP endpoint. Every request must present a valid, brand-scoped bearer token.
 *
 * TODO(Prompt 6): mount StreamableHTTPServerTransport + the McpServer built in
 * server.ts once tool registration lands. Auth is wired first, deliberately: an
 * endpoint that serves data before its auth works is how tenant leaks ship.
 */
app.all("/b/:brandId/mcp", async (req, res) => {
  const identity = await authenticate(req, cfg);
  if (!identity) return send401(res, cfg);

  // Tenancy invariant: the URL is a convenience; the TOKEN is the authority.
  if (identity.brandId !== req.params.brandId) {
    return res.status(403).json({ error: "brand_mismatch" });
  }

  return res.status(501).json({ error: "not_implemented", detail: "See Prompt 6." });
});

const port = Number(process.env.PORT ?? 8787);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`servvo mcp-server listening on :${port}`);
    if (!cfg.issuerUrl) {
      console.warn("⚠  OAUTH_ISSUER_URL unset — every MCP request will 401 (failing closed).");
    }
  });
}

export { app };
