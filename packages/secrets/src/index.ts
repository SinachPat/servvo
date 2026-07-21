/**
 * @servvo/secrets — vendor token custody.
 *
 * Envelope encryption: a per-brand data key encrypts the token set; the data key is
 * wrapped by a master key (cloud KMS in production). The database stores only a
 * `secretRef` and the wrapped ciphertext — never a plaintext token.
 *
 * The local provider is for development ONLY and says so loudly.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt?: number;
  scopes?: string[];
}

export interface SealedSecret {
  /** Wrapped data key. */
  wrappedKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  keyId: string;
}

/** Wraps/unwraps the per-secret data key. Swap for AWS/GCP KMS in production. */
export interface KeyWrapper {
  readonly keyId: string;
  wrap(dataKey: Buffer): Promise<string>;
  unwrap(wrapped: string): Promise<Buffer>;
}

/**
 * Development key wrapper. NOT FOR PRODUCTION — the master key sits in an env var, so
 * anything that can read the environment can decrypt every brand's vendor tokens.
 */
export class LocalKeyWrapper implements KeyWrapper {
  readonly keyId = "local-dev";
  private readonly master: Buffer;

  constructor(masterKeyBase64 = process.env.LOCAL_DEV_MASTER_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("LocalKeyWrapper must never be used in production — configure cloud KMS.");
    }
    if (!masterKeyBase64) {
      throw new Error(
        "LOCAL_DEV_MASTER_KEY is not set. Generate one with: openssl rand -base64 32",
      );
    }
    const key = Buffer.from(masterKeyBase64, "base64");
    if (key.length !== 32) throw new Error("LOCAL_DEV_MASTER_KEY must decode to 32 bytes");
    this.master = key;
  }

  async wrap(dataKey: Buffer): Promise<string> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.master, iv);
    const ct = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
  }

  async unwrap(wrapped: string): Promise<Buffer> {
    const [ivB64, tagB64, ctB64] = wrapped.split(".");
    if (!ivB64 || !tagB64 || !ctB64) throw new Error("malformed wrapped key");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.master,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
  }
}

export async function seal(tokens: TokenSet, wrapper: KeyWrapper): Promise<SealedSecret> {
  const dataKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(tokens), "utf8")),
    cipher.final(),
  ]);
  return {
    wrappedKey: await wrapper.wrap(dataKey),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    keyId: wrapper.keyId,
  };
}

export async function unseal(sealed: SealedSecret, wrapper: KeyWrapper): Promise<TokenSet> {
  const dataKey = await wrapper.unwrap(sealed.wrappedKey);
  const decipher = createDecipheriv("aes-256-gcm", dataKey, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8")) as TokenSet;
}

/** Refresh a minute before expiry so an in-flight request never races the boundary. */
export function needsRefresh(tokens: TokenSet, skewMs = 60_000, now = Date.now()): boolean {
  return tokens.expiresAt !== undefined && tokens.expiresAt - skewMs <= now;
}
