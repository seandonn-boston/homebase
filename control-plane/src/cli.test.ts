import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArgs } from "./cli";

describe("parseArgs", () => {
  it("returns defaults when no args", () => {
    const result = parseArgs([]);
    assert.equal(result.port, 4510);
    assert.equal(result.projectDir, process.cwd());
  });

  it("parses --project-dir", () => {
    const result = parseArgs(["--project-dir", "/tmp/myproject"]);
    assert.equal(result.projectDir, "/tmp/myproject");
    assert.equal(result.port, 4510);
  });

  it("parses --port", () => {
    const result = parseArgs(["--port", "8080"]);
    assert.equal(result.port, 8080);
  });

  it("parses both --project-dir and --port", () => {
    const result = parseArgs(["--project-dir", "/tmp", "--port", "9000"]);
    assert.equal(result.projectDir, "/tmp");
    assert.equal(result.port, 9000);
  });

  it("handles --port with non-numeric value (throws)", () => {
    assert.throws(() => parseArgs(["--port", "abc"]), {
      message: "Invalid port: must be between 1 and 65535",
    });
  });

  it("ignores unknown flags", () => {
    const result = parseArgs(["--verbose", "--project-dir", "/tmp"]);
    assert.equal(result.projectDir, "/tmp");
    assert.equal(result.port, 4510);
  });

  it("handles --project-dir as last arg (missing value)", () => {
    const result = parseArgs(["--project-dir"]);
    assert.equal(result.projectDir, process.cwd());
  });
});
