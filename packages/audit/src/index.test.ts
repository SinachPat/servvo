import { describe, expect, it } from "vitest";
import { redact } from "./index.js";

describe("redact", () => {
  it("strips secrets at any depth and through arrays", () => {
    const out = redact({
      locationId: "L1",
      confirmationToken: "tok_live_abc",
      nested: { accessToken: "at_123", keep: "visible" },
      list: [{ client_secret: "cs_1" }, { fine: true }],
    }) as Record<string, any>;

    expect(out.locationId).toBe("L1");
    expect(out.confirmationToken).toBe("[redacted]");
    expect(out.nested.accessToken).toBe("[redacted]");
    expect(out.nested.keep).toBe("visible");
    expect(out.list[0].client_secret).toBe("[redacted]");
    expect(out.list[1].fine).toBe(true);
  });

  it("matches keys regardless of snake/camel/kebab casing", () => {
    const out = redact({ API_KEY: "x", "refresh-token": "y", ClientSecret: "z" }) as Record<
      string,
      unknown
    >;
    expect(Object.values(out)).toEqual(["[redacted]", "[redacted]", "[redacted]"]);
  });

  it("passes primitives and null through untouched", () => {
    expect(redact(null)).toBeNull();
    expect(redact(42)).toBe(42);
    expect(redact("plain")).toBe("plain");
  });
});
