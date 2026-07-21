/**
 * Agent-leg OAuth: Servvo as an OAuth 2.1 RESOURCE SERVER.
 *
 * Per the MCP authorization spec (Nov 2025 revision):
 *  - PKCE S256 only (enforced at the authorization server / IdP)
 *  - RFC 9728 protected-resource metadata for AS discovery
 *  - RFC 8707 resource indicators, so a token minted for another server can't be
 *    replayed against Servvo
 *  - 401 responses MUST carry a WWW-Authenticate header pointing at the AS
 *
 * The authorization server itself is delegated to a managed IdP — do not hand-roll one.
 */

import type { Request, Response } from "express";

export interface AuthConfig {
  /** Public URL of THIS resource server (the `resource` value clients must request). */
  resourceUrl: string;
  /** Issuer URL of the managed IdP acting as authorization server. */
  issuerUrl: string;
  audience: string;
  jwksUrl: string;
}

export interface AgentIdentity {
  /** Token subject — the audited actor. */
  sub: string;
  /** The ONLY brand this token may reach. Never read a brandId from tool args. */
  brandId: string;
  scopes: string[];
}

export function loadAuthConfig(): AuthConfig {
  return {
    resourceUrl: process.env.MCP_PUBLIC_URL ?? "http://localhost:8787",
    issuerUrl: process.env.OAUTH_ISSUER_URL ?? "",
    audience: process.env.OAUTH_AUDIENCE ?? "https://mcp.servvo.local",
    jwksUrl: process.env.OAUTH_JWKS_URL ?? "",
  };
}

/** RFC 9728 — served at /.well-known/oauth-protected-resource. */
export function protectedResourceMetadata(cfg: AuthConfig) {
  return {
    resource: cfg.resourceUrl,
    authorization_servers: [cfg.issuerUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["servvo:read", "servvo:write"],
  };
}

/**
 * The 401 every unauthenticated request must receive. Omitting or malforming
 * WWW-Authenticate breaks client discovery — it is not optional.
 */
export function send401(res: Response, cfg: AuthConfig, error = "invalid_token"): void {
  res
    .status(401)
    .set(
      "WWW-Authenticate",
      `Bearer realm="servvo", error="${error}", ` +
        `resource_metadata="${cfg.resourceUrl}/.well-known/oauth-protected-resource"`,
    )
    .json({ error });
}

/**
 * Verify the bearer token and resolve the agent's identity.
 *
 * TODO(Prompt 6): replace the stub with real JWKS verification (signature, exp, iss,
 * and — critically — that `aud`/`resource` matches THIS server per RFC 8707). Until
 * then this refuses every request rather than allowing unauthenticated access:
 * failing closed is the only acceptable placeholder on an auth path.
 */
export async function authenticate(
  req: Request,
  cfg: AuthConfig,
): Promise<AgentIdentity | null> {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  if (!cfg.jwksUrl || !cfg.issuerUrl) return null;

  // Intentionally unimplemented — see TODO above. Fail closed.
  return null;
}
