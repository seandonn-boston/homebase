import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { RateLimiter } from "./rate-limiter";
import { RunawayDetector } from "./runaway-detector";
import { AdmiralServer } from "./server";
import { httpGet } from "./test-helpers";
import { ExecutionTrace } from "./trace";

describe("RateLimiter", () => {
  describe("tier classification", () => {
    const limiter = new RateLimiter();

    it("classifies /health as high tier", () => {
      assert.equal(limiter.getTier("/health"), "high");
    });

    it("classifies /api/events as high tier", () => {
      assert.equal(limiter.getTier("/api/events"), "high");
    });

    it("classifies /api/stats as high tier", () => {
      assert.equal(limiter.getTier("/api/stats"), "high");
    });

    it("classifies /api/config as medium tier", () => {
      assert.equal(limiter.getTier("/api/config"), "medium");
    });

    it("classifies /api/alerts as medium tier", () => {
      assert.equal(limiter.getTier("/api/alerts"), "medium");
    });

    it("classifies /api/session as medium tier", () => {
      assert.equal(limiter.getTier("/api/session"), "medium");
    });

    it("classifies agent resume as admin tier", () => {
      assert.equal(limiter.getTier("/api/agents/agent-1/resume"), "admin");
    });

    it("classifies alert resolve as admin tier", () => {
      assert.equal(limiter.getTier("/api/alerts/alert-1/resolve"), "admin");
    });

    it("classifies unknown paths as medium tier", () => {
      assert.equal(limiter.getTier("/api/unknown"), "medium");
    });
  });

  describe("sliding window", () => {
    it("allows requests within limit", () => {
      const limiter = new RateLimiter({ high: { maxRequests: 3, windowMs: 1000 } });
      const r1 = limiter.check("client1", "/health", 1000);
      const r2 = limiter.check("client1", "/health", 1001);
      const r3 = limiter.check("client1", "/health", 1002);
      assert.equal(r1.allowed, true);
      assert.equal(r2.allowed, true);
      assert.equal(r3.allowed, true);
      assert.equal(r1.remaining, 2);
      assert.equal(r2.remaining, 1);
      assert.equal(r3.remaining, 0);
    });

    it("blocks requests exceeding limit", () => {
      const limiter = new RateLimiter({ high: { maxRequests: 2, windowMs: 1000 } });
      limiter.check("client1", "/health", 1000);
      limiter.check("client1", "/health", 1001);
      const r3 = limiter.check("client1", "/health", 1002);
      assert.equal(r3.allowed, false);
      assert.equal(r3.remaining, 0);
      assert.ok(r3.retryAfterMs > 0);
    });

    it("allows requests after window expires", () => {
      const limiter = new RateLimiter({ high: { maxRequests: 2, windowMs: 1000 } });
      limiter.check("client1", "/health", 1000);
      limiter.check("client1", "/health", 1001);
      // Window expires at 2001
      const r3 = limiter.check("client1", "/health", 2002);
      assert.equal(r3.allowed, true);
      assert.equal(r3.remaining, 1);
    });

    it("tracks different clients independently", () => {
      const limiter = new RateLimiter({ high: { maxRequests: 1, windowMs: 1000 } });
      const r1 = limiter.check("client1", "/health", 1000);
      const r2 = limiter.check("client2", "/health", 1000);
      assert.equal(r1.allowed, true);
      assert.equal(r2.allowed, true);
    });

    it("tracks different tiers independently", () => {
      const limiter = new RateLimiter({
        high: { maxRequests: 1, windowMs: 1000 },
        medium: { maxRequests: 1, windowMs: 1000 },
      });
      const r1 = limiter.check("client1", "/health", 1000);
      const r2 = limiter.check("client1", "/api/config", 1000);
      assert.equal(r1.allowed, true);
      assert.equal(r2.allowed, true);
    });
  });

  describe("violations tracking", () => {
    it("starts with zero violations", () => {
      const limiter = new RateLimiter();
      assert.equal(limiter.getViolationCount(), 0);
    });

    it("increments violations on blocked requests", () => {
      const limiter = new RateLimiter({ high: { maxRequests: 1, windowMs: 1000 } });
      limiter.check("c1", "/health", 1000);
      limiter.check("c1", "/health", 1001);
      assert.equal(limiter.getViolationCount(), 1);
    });
  });

  describe("configuration", () => {
    it("accepts tier overrides", () => {
      const limiter = new RateLimiter({ admin: { maxRequests: 5 } });
      const config = limiter.getTierConfig();
      assert.equal(config.admin.maxRequests, 5);
      assert.equal(config.admin.windowMs, 60_000); // default preserved
    });

    it("reset clears all state", () => {
      const limiter = new RateLimiter({ high: { maxRequests: 1, windowMs: 1000 } });
      limiter.check("c1", "/health", 1000);
      limiter.check("c1", "/health", 1001); // violation
      limiter.reset();
      assert.equal(limiter.getViolationCount(), 0);
      const result = limiter.check("c1", "/health", 1002);
      assert.equal(result.allowed, true);
    });
  });
});

describe("AdmiralServer rate limiting integration", () => {
  let stream: EventStream;
  let detector: RunawayDetector;
  let trace: ExecutionTrace;
  let server: AdmiralServer;
  let baseUrl: string;

  beforeEach(async () => {
    stream = new EventStream();
    detector = new RunawayDetector(stream);
    trace = new ExecutionTrace(stream);
    // Set very low rate limits for testing
    process.env.RATE_LIMIT_HIGH_MAX = "3";
    process.env.RATE_LIMIT_MEDIUM_MAX = "2";
    process.env.RATE_LIMIT_ADMIN_MAX = "1";
    server = new AdmiralServer(stream, detector, trace);
    const port = await server.start(0);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await server.stop();
    delete process.env.RATE_LIMIT_HIGH_MAX;
    delete process.env.RATE_LIMIT_MEDIUM_MAX;
    delete process.env.RATE_LIMIT_ADMIN_MAX;
  });

  it("allows requests within rate limit", async () => {
    const res = await httpGet(`${baseUrl}/health`);
    assert.equal(res.status, 200);
  });

  it("returns 429 when rate limit exceeded", async () => {
    // High tier limit is 3
    await httpGet(`${baseUrl}/health`);
    await httpGet(`${baseUrl}/health`);
    await httpGet(`${baseUrl}/health`);
    const res = await httpGet(`${baseUrl}/health`);
    assert.equal(res.status, 429);
    const data = JSON.parse(res.body);
    assert.equal(data.error, "Too Many Requests");
    assert.equal(data.status, 429);
    assert.ok(data.retryAfter > 0);
  });

  it("includes Retry-After header on 429", async () => {
    await httpGet(`${baseUrl}/health`);
    await httpGet(`${baseUrl}/health`);
    await httpGet(`${baseUrl}/health`);
    const res = await httpGet(`${baseUrl}/health`);
    assert.equal(res.status, 429);
    assert.ok(res.headers["retry-after"]);
  });

  it("applies admin tier to agent resume endpoint", async () => {
    // Admin tier limit is 1
    await httpGet(`${baseUrl}/api/agents/a1/resume`);
    const res = await httpGet(`${baseUrl}/api/agents/a2/resume`);
    assert.equal(res.status, 429);
  });
});
