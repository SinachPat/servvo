import { describe, expect, it, vi } from "vitest";
import { authenticate, protectedResourceMetadata, send401, type AuthConfig } from "./auth.js";
import type { Request, Response } from "express";

const cfg: AuthConfig = {
  resourceUrl: "https://mcp.servvo.test",
  issuerUrl: "https://idp.servvo.test",
  audience: "https://mcp.servvo.test",
  jwksUrl: "https://idp.servvo.test/.well-known/jwks.json",
};

function mockRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    set(k: string, v: string) {
      this.headers[k] = v;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  return res as unknown as Response & typeof res;
}

describe("protected resource metadata (RFC 9728)", () => {
  it("advertises this resource and its authorization server", () => {
    const meta = protectedResourceMetadata(cfg);
    expect(meta.resource).toBe(cfg.resourceUrl);
    expect(meta.authorization_servers).toEqual([cfg.issuerUrl]);
  });
});

describe("401 responses", () => {
  it("carries a WWW-Authenticate header pointing at resource metadata", () => {
    const res = mockRes();
    send401(res, cfg);
    expect(res.statusCode).toBe(401);
    const header = res.headers["WWW-Authenticate"];
    expect(header).toContain("Bearer");
    expect(header).toContain("resource_metadata=");
    expect(header).toContain(cfg.resourceUrl);
  });
});

describe("authenticate — fails closed", () => {
  const req = (headers: Record<string, string>) =>
    ({ header: (n: string) => headers[n.toLowerCase()] }) as unknown as Request;

  it("rejects a missing Authorization header", async () => {
    await expect(authenticate(req({}), cfg)).resolves.toBeNull();
  });

  it("rejects a non-Bearer scheme", async () => {
    await expect(authenticate(req({ authorization: "Basic abc" }), cfg)).resolves.toBeNull();
  });

  it("rejects when the IdP is unconfigured rather than allowing through", async () => {
    const unconfigured = { ...cfg, jwksUrl: "", issuerUrl: "" };
    await expect(
      authenticate(req({ authorization: "Bearer anything" }), unconfigured),
    ).resolves.toBeNull();
  });

  it("does not accept an arbitrary bearer token while unimplemented", async () => {
    await expect(authenticate(req({ authorization: "Bearer forged" }), cfg)).resolves.toBeNull();
  });
});
