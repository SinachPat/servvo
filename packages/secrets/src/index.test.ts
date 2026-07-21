import { beforeAll, describe, expect, it } from "vitest";
import { LocalKeyWrapper, needsRefresh, seal, unseal } from "./index.js";
import { randomBytes } from "node:crypto";

let wrapper: LocalKeyWrapper;

beforeAll(() => {
  wrapper = new LocalKeyWrapper(randomBytes(32).toString("base64"));
});

describe("envelope encryption", () => {
  it("round-trips a token set", async () => {
    const tokens = { accessToken: "at_1", refreshToken: "rt_1", expiresAt: 123, scopes: ["a"] };
    const sealed = await seal(tokens, wrapper);
    expect(sealed.ciphertext).not.toContain("at_1");
    await expect(unseal(sealed, wrapper)).resolves.toEqual(tokens);
  });

  it("fails closed when the ciphertext is tampered with", async () => {
    const sealed = await seal({ accessToken: "at_1" }, wrapper);
    const flipped = Buffer.from(sealed.ciphertext, "base64");
    flipped[0] = (flipped[0]! ^ 0xff) & 0xff;
    await expect(
      unseal({ ...sealed, ciphertext: flipped.toString("base64") }, wrapper),
    ).rejects.toThrow();
  });

  it("cannot be unsealed with a different master key", async () => {
    const sealed = await seal({ accessToken: "at_1" }, wrapper);
    const other = new LocalKeyWrapper(randomBytes(32).toString("base64"));
    await expect(unseal(sealed, other)).rejects.toThrow();
  });

  it("rejects a master key that isn't 32 bytes", () => {
    expect(() => new LocalKeyWrapper(Buffer.from("short").toString("base64"))).toThrow();
  });
});

describe("needsRefresh", () => {
  it("refreshes ahead of expiry, not at it", () => {
    const now = 1_000_000;
    expect(needsRefresh({ accessToken: "a", expiresAt: now + 90_000 }, 60_000, now)).toBe(false);
    expect(needsRefresh({ accessToken: "a", expiresAt: now + 30_000 }, 60_000, now)).toBe(true);
  });

  it("treats a token with no expiry as durable", () => {
    expect(needsRefresh({ accessToken: "a" })).toBe(false);
  });
});
