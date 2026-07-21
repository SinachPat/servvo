/**
 * Shared vendor HTTP client: retries, timeouts, and rate-limit awareness in ONE place
 * so every adapter inherits them. This is a large slice of the reusable ~40%.
 */

export interface RateLimiter {
  /** Atomically reserve one request slot; false when the ceiling is reached. */
  acquire(key: string): Promise<boolean>;
}

export interface VendorHttpOptions {
  baseUrl: string;
  /** Logical key for rate limiting, e.g. `square:${brandId}`. */
  rateKey?: string;
  rateLimiter?: RateLimiter;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export class VendorHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly vendorBody?: unknown,
  ) {
    super(message);
    this.name = "VendorHttpError";
  }

  /** 5xx and 429 are worth retrying; 4xx generally are not. */
  get retriable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const RETRIABLE_NETWORK = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"]);

export class VendorHttp {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly doFetch: typeof fetch;

  constructor(private readonly opts: VendorHttpOptions) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.doFetch = opts.fetchImpl ?? fetch;
  }

  async request<T>(
    path: string,
    init: RequestInit & { token?: string } = {},
  ): Promise<T> {
    const { token, ...rest } = init;

    if (this.opts.rateLimiter && this.opts.rateKey) {
      const ok = await this.opts.rateLimiter.acquire(this.opts.rateKey);
      if (!ok) throw new VendorHttpError("Local rate limit reached for vendor", 429);
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.doFetch(`${this.opts.baseUrl}${path}`, {
          ...rest,
          signal: controller.signal,
          headers: {
            accept: "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(rest.headers ?? {}),
          },
        });

        if (!res.ok) {
          const body = await safeJson(res);
          const err = new VendorHttpError(`Vendor responded ${res.status}`, res.status, body);
          if (!err.retriable || attempt === this.maxRetries) throw err;
          lastErr = err;
          await backoff(attempt, res.headers.get("retry-after"));
          continue;
        }

        return (await safeJson(res)) as T;
      } catch (e) {
        if (e instanceof VendorHttpError) {
          if (!e.retriable || attempt === this.maxRetries) throw e;
          lastErr = e;
        } else if (isRetriableNetworkError(e) && attempt < this.maxRetries) {
          lastErr = e;
        } else {
          throw e;
        }
        await backoff(attempt, null);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("vendor request failed");
  }
}

function isRetriableNetworkError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") return true;
  const code = (e as { code?: string } | undefined)?.code;
  return typeof code === "string" && RETRIABLE_NETWORK.has(code);
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Exponential backoff with jitter; honors Retry-After when the vendor sends one. */
async function backoff(attempt: number, retryAfter: string | null): Promise<void> {
  const headerMs = retryAfter ? Number(retryAfter) * 1000 : NaN;
  const ms = Number.isFinite(headerMs)
    ? headerMs
    : Math.min(2 ** attempt * 250, 4_000) + Math.random() * 250;
  await new Promise((r) => setTimeout(r, ms));
}
