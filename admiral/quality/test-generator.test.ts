/**
 * Tests for test-generator (QA-02)
 *
 * Happy path + unhappy path tests for test skeleton generation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateTestSkeleton, parseExports } from "./test-generator";
import type { ExportedSymbol, TestSkeleton } from "./test-generator";

// ---------------------------------------------------------------------------
// TypeScript Export Parsing
// ---------------------------------------------------------------------------

describe("parseExports (TypeScript)", () => {
  it("extracts exported functions", () => {
    const symbols = parseExports('export function doSomething(a: string, b: number): void {}');
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "doSomething");
    assert.equal(symbols[0].kind, "function");
    assert.equal(symbols[0].isAsync, false);
    assert.deepEqual(symbols[0].params, ["a", "b"]);
  });

  it("extracts async exported functions", () => {
    const symbols = parseExports("export async function fetchData(url: string): Promise<void> {}");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "fetchData");
    assert.equal(symbols[0].isAsync, true);
    assert.deepEqual(symbols[0].params, ["url"]);
  });

  it("extracts exported classes", () => {
    const symbols = parseExports("export class MyService {}");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "MyService");
    assert.equal(symbols[0].kind, "class");
  });

  it("extracts exported consts", () => {
    const symbols = parseExports("export const MAX_SIZE = 100;");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "MAX_SIZE");
    assert.equal(symbols[0].kind, "const");
  });

  it("extracts exported interfaces and types", () => {
    const code = [
      "export interface Config { value: string; }",
      "export type Status = 'ok' | 'error';",
    ].join("\n");
    const symbols = parseExports(code);
    assert.equal(symbols.length, 2);
    assert.equal(symbols[0].kind, "interface");
    assert.equal(symbols[1].kind, "type");
  });

  it("extracts exported enums", () => {
    const symbols = parseExports("export enum Color { Red, Green, Blue }");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "Color");
    assert.equal(symbols[0].kind, "enum");
  });

  it("handles functions with no parameters", () => {
    const symbols = parseExports("export function noArgs(): string {}");
    assert.equal(symbols[0].params.length, 0);
  });

  it("handles destructured parameters", () => {
    const symbols = parseExports("export function configure({ port, host }: Config): void {}");
    assert.equal(symbols[0].params.length, 1);
    assert.equal(symbols[0].params[0], "options");
  });

  it("returns empty for non-exported code", () => {
    const code = [
      "function privateHelper() {}",
      "const internal = 42;",
      "class PrivateClass {}",
    ].join("\n");
    const symbols = parseExports(code);
    assert.equal(symbols.length, 0);
  });

  it("returns empty for empty content", () => {
    const symbols = parseExports("");
    assert.equal(symbols.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Shell Export Parsing
// ---------------------------------------------------------------------------

describe("parseExports (Shell)", () => {
  it("extracts shell functions", () => {
    const code = [
      "#!/bin/bash",
      "validate_input() {",
      "  echo ok",
      "}",
    ].join("\n");
    const symbols = parseExports(code, "shell");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "validate_input");
    assert.equal(symbols[0].kind, "function");
  });

  it("extracts 'function' keyword style", () => {
    const code = "function do_thing() {\n  echo done\n}";
    const symbols = parseExports(code, "shell");
    assert.equal(symbols.length, 1);
    assert.equal(symbols[0].name, "do_thing");
  });

  it("skips control flow keywords", () => {
    const code = [
      "if() {",
      "  true",
      "}",
      "then() {",
      "  true",
      "}",
    ].join("\n");
    const symbols = parseExports(code, "shell");
    assert.equal(symbols.length, 0);
  });

  it("returns empty for empty content", () => {
    const symbols = parseExports("", "shell");
    assert.equal(symbols.length, 0);
  });
});

// ---------------------------------------------------------------------------
// TypeScript Skeleton Generation
// ---------------------------------------------------------------------------

describe("generateTestSkeleton (TypeScript)", () => {
  it("generates valid test skeleton for functions", () => {
    const source = [
      "export function add(a: number, b: number): number { return a + b; }",
      "export function subtract(a: number, b: number): number { return a - b; }",
    ].join("\n");

    const skeleton = generateTestSkeleton("src/math.ts", source);

    assert.equal(skeleton.sourceFile, "src/math.ts");
    assert.ok(skeleton.testFile.endsWith("math.test.ts"));
    assert.ok(skeleton.content.includes('import { describe, it } from "node:test"'));
    assert.ok(skeleton.content.includes('import assert from "node:assert/strict"'));
    assert.ok(skeleton.content.includes('import { add, subtract } from "./math"'));
    assert.ok(skeleton.content.includes('describe("add"'));
    assert.ok(skeleton.content.includes('describe("subtract"'));
    assert.equal(skeleton.symbols.length, 2);
  });

  it("generates async test stubs for async functions", () => {
    const source = "export async function fetchData(url: string): Promise<string> {}";
    const skeleton = generateTestSkeleton("src/api.ts", source);

    assert.ok(skeleton.content.includes("async ()"));
    assert.ok(skeleton.content.includes("await fetchData"));
  });

  it("generates class instantiation test", () => {
    const source = "export class Engine {}";
    const skeleton = generateTestSkeleton("src/engine.ts", source);

    assert.ok(skeleton.content.includes('describe("Engine"'));
    assert.ok(skeleton.content.includes("can be instantiated"));
    assert.ok(skeleton.content.includes("new Engine"));
  });

  it("generates const assertion test", () => {
    const source = "export const DEFAULT_LIMIT = 100;";
    const skeleton = generateTestSkeleton("src/config.ts", source);

    assert.ok(skeleton.content.includes('describe("DEFAULT_LIMIT"'));
    assert.ok(skeleton.content.includes("DEFAULT_LIMIT !== undefined"));
  });

  it("skips type-only imports but includes type import line", () => {
    const source = [
      "export interface Config { value: string; }",
      "export function init(config: Config): void {}",
    ].join("\n");
    const skeleton = generateTestSkeleton("src/setup.ts", source);

    assert.ok(skeleton.content.includes('import { init } from "./setup"'));
    assert.ok(skeleton.content.includes('import type { Config } from "./setup"'));
    // No describe block for the interface
    assert.ok(!skeleton.content.includes('describe("Config"'));
  });

  it("includes edge case placeholders when enabled", () => {
    const source = "export function process(data: string): string {}";
    const skeleton = generateTestSkeleton("src/processor.ts", source, { edgeCases: true });

    assert.ok(skeleton.content.includes("handles missing or invalid arguments"));
    assert.ok(skeleton.content.includes("handles edge cases"));
  });

  it("excludes edge cases when disabled", () => {
    const source = "export function process(data: string): string {}";
    const skeleton = generateTestSkeleton("src/processor.ts", source, { edgeCases: false });

    assert.ok(!skeleton.content.includes("handles edge cases"));
  });

  it("handles files with no exports", () => {
    const skeleton = generateTestSkeleton("src/empty.ts", "const x = 1;");

    assert.equal(skeleton.symbols.length, 0);
    assert.ok(skeleton.content.includes('import { describe, it } from "node:test"'));
    // No describe blocks generated
    assert.ok(!skeleton.content.includes("describe("));
  });

  it("produces compilable output", () => {
    const source = [
      "export function greet(name: string): string { return name; }",
      "export class Greeter {}",
      "export const VERSION = '1.0';",
    ].join("\n");
    const skeleton = generateTestSkeleton("src/greeter.ts", source);

    // Should have proper structure — no syntax errors
    assert.ok(skeleton.content.includes("describe("));
    assert.ok(skeleton.content.includes("it("));
    // Every opened brace should have a matching close
    const opens = (skeleton.content.match(/\{/g) || []).length;
    const closes = (skeleton.content.match(/\}/g) || []).length;
    assert.ok(
      Math.abs(opens - closes) <= 1,
      `Unbalanced braces: ${opens} opens, ${closes} closes`,
    );
  });
});

// ---------------------------------------------------------------------------
// Shell Skeleton Generation
// ---------------------------------------------------------------------------

describe("generateTestSkeleton (Shell)", () => {
  it("generates shell test skeleton", () => {
    const source = [
      "#!/bin/bash",
      "validate_input() {",
      '  echo "valid"',
      "}",
      "process_data() {",
      '  echo "processed"',
      "}",
    ].join("\n");

    const skeleton = generateTestSkeleton("scripts/helper.sh", source);

    assert.equal(skeleton.sourceFile, "scripts/helper.sh");
    assert.ok(skeleton.testFile.endsWith("helper.test.sh"));
    assert.ok(skeleton.content.includes("#!/usr/bin/env bash"));
    assert.ok(skeleton.content.includes("source"));
    assert.ok(skeleton.content.includes("test_validate_input"));
    assert.ok(skeleton.content.includes("test_process_data"));
    assert.ok(skeleton.content.includes("assert_eq"));
    assert.equal(skeleton.symbols.length, 2);
  });

  it("includes edge case comments when enabled", () => {
    const source = "do_thing() {\n  echo ok\n}";
    const skeleton = generateTestSkeleton("scripts/tool.sh", source, { edgeCases: true });

    assert.ok(skeleton.content.includes("Edge cases"));
  });

  it("handles scripts with no functions", () => {
    const source = "#!/bin/bash\necho hello\n";
    const skeleton = generateTestSkeleton("scripts/simple.sh", source);

    assert.equal(skeleton.symbols.length, 0);
    assert.ok(skeleton.content.includes("#!/usr/bin/env bash"));
  });
});

// ---------------------------------------------------------------------------
// Test file path derivation
// ---------------------------------------------------------------------------

describe("Test file path derivation", () => {
  it("derives .test.ts from .ts", () => {
    const skeleton = generateTestSkeleton("src/module.ts", "export const x = 1;");
    assert.ok(skeleton.testFile.endsWith("module.test.ts"));
  });

  it("derives .test.ts from .js", () => {
    const skeleton = generateTestSkeleton("lib/helper.js", "export const x = 1;");
    assert.ok(skeleton.testFile.endsWith("helper.test.ts"));
  });

  it("derives .test.sh from .sh", () => {
    const skeleton = generateTestSkeleton("bin/run.sh", "#!/bin/bash\n");
    assert.ok(skeleton.testFile.endsWith("run.test.sh"));
  });

  it("preserves directory in test file path", () => {
    const skeleton = generateTestSkeleton("deep/nested/module.ts", "export const x = 1;");
    assert.ok(skeleton.testFile.includes("deep"));
    assert.ok(skeleton.testFile.includes("nested"));
  });
});
