import { describe, expect, it, vi } from "vitest";
import { capabilitiesOf, type RestaurantConnector } from "./connector.js";
import { ConnectorRegistry } from "./registry.js";
import { VendorHttp, VendorHttpError } from "./http.js";

const stubReads = {
  listLocations: async () => [],
  getSalesSummary: async () => ({}) as never,
  getMenu: async () => [],
};

describe("capabilitiesOf", () => {
  it("advertises only methods the vendor actually implements", () => {
    const readOnly: RestaurantConnector = { vendor: "SQUARE", ...stubReads };
    expect(capabilitiesOf(readOnly)).toEqual([]);

    const withLabor: RestaurantConnector = {
      vendor: "SEVENSHIFTS",
      ...stubReads,
      getLaborSummary: async () => ({}) as never,
      createShift: async () => ({}) as never,
    };
    expect(capabilitiesOf(withLabor).sort()).toEqual(["createShift", "getLaborSummary"]);
  });
});

describe("ConnectorRegistry", () => {
  it("resolves a registered connector and throws for an unregistered vendor", () => {
    const reg = new ConnectorRegistry().register({ vendor: "SQUARE", ...stubReads });
    expect(reg.get("SQUARE").vendor).toBe("SQUARE");
    expect(reg.has("TOAST")).toBe(false);
    expect(() => reg.get("TOAST")).toThrow(/No connector registered/);
  });
});

describe("VendorHttp", () => {
  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

  it("returns parsed JSON on success and sends the bearer token", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => ok({ hello: "world" }));
    const http = new VendorHttp({ baseUrl: "https://api.test", fetchImpl: fetchImpl as never });

    await expect(http.request("/x", { token: "at_1" })).resolves.toEqual({ hello: "world" });
    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer at_1");
  });

  it("retries a 500 and succeeds on a later attempt", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n++;
      return n < 3 ? new Response("boom", { status: 500 }) : ok({ ok: true });
    });
    const http = new VendorHttp({
      baseUrl: "https://api.test",
      fetchImpl: fetchImpl as never,
      maxRetries: 3,
    });
    await expect(http.request("/x")).resolves.toEqual({ ok: true });
    expect(n).toBe(3);
  });

  it("does NOT retry a 4xx — a bad request stays bad", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 403 }));
    const http = new VendorHttp({ baseUrl: "https://api.test", fetchImpl: fetchImpl as never });

    await expect(http.request("/x")).rejects.toBeInstanceOf(VendorHttpError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses the call when the local rate limiter is exhausted", async () => {
    const fetchImpl = vi.fn(async () => ok({}));
    const http = new VendorHttp({
      baseUrl: "https://api.test",
      fetchImpl: fetchImpl as never,
      rateKey: "square:brand_1",
      rateLimiter: { acquire: async () => false },
    });

    await expect(http.request("/x")).rejects.toThrow(/rate limit/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("classifies retriability by status", () => {
    expect(new VendorHttpError("", 429).retriable).toBe(true);
    expect(new VendorHttpError("", 503).retriable).toBe(true);
    expect(new VendorHttpError("", 401).retriable).toBe(false);
  });
});
