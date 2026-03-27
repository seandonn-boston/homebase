/**
 * Test Generation Framework (QA-02)
 *
 * Generates test skeletons for .ts and .sh files with describe/it blocks
 * for each public function, edge case placeholders, and project convention
 * adherence. Skeletons compile/parse without errors.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportedSymbol {
  name: string;
  kind: "function" | "class" | "const" | "type" | "interface" | "enum";
  isAsync: boolean;
  params: string[];
  line: number;
}

export interface TestSkeleton {
  sourceFile: string;
  testFile: string;
  content: string;
  symbols: ExportedSymbol[];
}

export interface GeneratorOptions {
  overwrite?: boolean;
  edgeCases?: boolean;
}

// ---------------------------------------------------------------------------
// TypeScript Source Parser
// ---------------------------------------------------------------------------

function extractExportedSymbols(content: string): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // export async function name(params): returnType
    const asyncFuncMatch = line.match(/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/);
    if (asyncFuncMatch) {
      symbols.push({
        name: asyncFuncMatch[1],
        kind: "function",
        isAsync: true,
        params: parseParams(asyncFuncMatch[2]),
        line: i + 1,
      });
      continue;
    }

    // export function name(params): returnType
    const funcMatch = line.match(/export\s+function\s+(\w+)\s*\(([^)]*)\)/);
    if (funcMatch) {
      symbols.push({
        name: funcMatch[1],
        kind: "function",
        isAsync: false,
        params: parseParams(funcMatch[2]),
        line: i + 1,
      });
      continue;
    }

    // export class ClassName
    const classMatch = line.match(/export\s+class\s+(\w+)/);
    if (classMatch) {
      symbols.push({
        name: classMatch[1],
        kind: "class",
        isAsync: false,
        params: [],
        line: i + 1,
      });
      continue;
    }

    // export const name
    const constMatch = line.match(/export\s+const\s+(\w+)/);
    if (constMatch) {
      symbols.push({
        name: constMatch[1],
        kind: "const",
        isAsync: false,
        params: [],
        line: i + 1,
      });
      continue;
    }

    // export interface / export type / export enum — skip (not testable)
    const typeMatch = line.match(/export\s+(interface|type|enum)\s+(\w+)/);
    if (typeMatch) {
      symbols.push({
        name: typeMatch[2],
        kind: typeMatch[1] as "interface" | "type" | "enum",
        isAsync: false,
        params: [],
        line: i + 1,
      });
    }
  }

  return symbols;
}

function parseParams(paramString: string): string[] {
  if (!paramString.trim()) return [];

  const params: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of paramString) {
    if (ch === "(" || ch === "<" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === ">" || ch === "}" || ch === "]") depth--;

    if (ch === "," && depth === 0) {
      const name = extractParamName(current);
      if (name) params.push(name);
      current = "";
    } else {
      current += ch;
    }
  }

  const lastParam = extractParamName(current);
  if (lastParam) params.push(lastParam);

  return params;
}

function extractParamName(raw: string): string {
  const trimmed = raw.trim();
  // Handle destructured params like { a, b }: Type
  if (trimmed.startsWith("{")) return "options";
  if (trimmed.startsWith("[")) return "items";
  // name: Type = default
  const match = trimmed.match(/^(\w+)/);
  return match ? match[1] : "";
}

// ---------------------------------------------------------------------------
// Shell Script Parser
// ---------------------------------------------------------------------------

function extractShellFunctions(content: string): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // function name() { or name() {
    const funcMatch = line.match(/^(?:function\s+)?(\w+)\s*\(\s*\)\s*\{?/);
    if (funcMatch) {
      const name = funcMatch[1];
      // Skip common non-function patterns
      if (["if", "then", "else", "fi", "do", "done", "case", "esac", "main"].includes(name)) continue;
      symbols.push({
        name,
        kind: "function",
        isAsync: false,
        params: [],
        line: i + 1,
      });
    }
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// TypeScript Test Skeleton Generator
// ---------------------------------------------------------------------------

function generateTsTestSkeleton(
  sourceFile: string,
  symbols: ExportedSymbol[],
  edgeCases: boolean,
): string {
  const lines: string[] = [];
  const moduleName = basename(sourceFile).replace(/\.(ts|js)$/, "");

  // Header
  lines.push("/**");
  lines.push(` * Tests for ${moduleName}`);
  lines.push(" *");
  lines.push(" * Auto-generated test skeleton. Fill in assertions.");
  lines.push(" */");
  lines.push("");

  // Imports
  lines.push('import { describe, it } from "node:test";');
  lines.push('import assert from "node:assert/strict";');

  // Build import list from testable symbols
  const importable = symbols.filter((s) => s.kind !== "type" && s.kind !== "interface");
  const typeImportable = symbols.filter((s) => s.kind === "type" || s.kind === "interface");

  if (importable.length > 0) {
    const names = importable.map((s) => s.name).join(", ");
    lines.push(`import { ${names} } from "./${moduleName}";`);
  }
  if (typeImportable.length > 0) {
    const names = typeImportable.map((s) => s.name).join(", ");
    lines.push(`import type { ${names} } from "./${moduleName}";`);
  }

  lines.push("");

  // Generate describe/it blocks per symbol
  for (const symbol of symbols) {
    if (symbol.kind === "type" || symbol.kind === "interface") continue;

    if (symbol.kind === "class") {
      lines.push(`describe("${symbol.name}", () => {`);
      lines.push(`  it("can be instantiated", () => {`);
      lines.push(`    // TODO: construct ${symbol.name} with valid arguments`);
      lines.push(`    // const instance = new ${symbol.name}();`);
      lines.push(`    // assert.ok(instance);`);
      lines.push("  });");
      lines.push("");

      if (edgeCases) {
        lines.push(`  it("handles invalid constructor arguments", () => {`);
        lines.push(`    // TODO: test with missing/invalid args`);
        lines.push("  });");
        lines.push("");
      }

      lines.push("  // TODO: add tests for public methods");
      lines.push("});");
      lines.push("");
      continue;
    }

    if (symbol.kind === "function") {
      lines.push(`describe("${symbol.name}", () => {`);

      // Happy path
      const paramList = symbol.params.length > 0 ? `(${symbol.params.join(", ")})` : "()";
      if (symbol.isAsync) {
        lines.push(`  it("returns expected result", async () => {`);
        lines.push(`    // TODO: call ${symbol.name}${paramList} with valid inputs`);
        lines.push(`    // const result = await ${symbol.name}(/* args */);`);
        lines.push(`    // assert.ok(result);`);
      } else {
        lines.push(`  it("returns expected result", () => {`);
        lines.push(`    // TODO: call ${symbol.name}${paramList} with valid inputs`);
        lines.push(`    // const result = ${symbol.name}(/* args */);`);
        lines.push(`    // assert.ok(result);`);
      }
      lines.push("  });");
      lines.push("");

      // Edge cases
      if (edgeCases) {
        if (symbol.params.length > 0) {
          lines.push(`  it("handles missing or invalid arguments", () => {`);
          lines.push(`    // TODO: test with undefined, null, empty values`);
          lines.push("  });");
          lines.push("");
        }

        lines.push(`  it("handles edge cases", () => {`);
        lines.push(`    // TODO: test boundary conditions, empty inputs, large inputs`);
        lines.push("  });");
        lines.push("");
      }

      lines.push("});");
      lines.push("");
      continue;
    }

    if (symbol.kind === "const") {
      lines.push(`describe("${symbol.name}", () => {`);
      lines.push(`  it("is defined and has expected shape", () => {`);
      lines.push(`    assert.ok(${symbol.name} !== undefined);`);
      lines.push("  });");
      lines.push("});");
      lines.push("");
      continue;
    }

    if (symbol.kind === "enum") {
      lines.push(`describe("${symbol.name}", () => {`);
      lines.push(`  it("has expected members", () => {`);
      lines.push(`    // TODO: verify enum members`);
      lines.push(`    assert.ok(${symbol.name});`);
      lines.push("  });");
      lines.push("});");
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Shell Test Skeleton Generator
// ---------------------------------------------------------------------------

function generateShTestSkeleton(
  sourceFile: string,
  symbols: ExportedSymbol[],
  edgeCases: boolean,
): string {
  const lines: string[] = [];
  const moduleName = basename(sourceFile).replace(/\.sh$/, "");

  lines.push("#!/usr/bin/env bash");
  lines.push(`# Tests for ${moduleName}.sh`);
  lines.push("# Auto-generated test skeleton. Fill in assertions.");
  lines.push("");
  lines.push("set -euo pipefail");
  lines.push("");
  lines.push("SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"");
  lines.push(`# shellcheck source=${moduleName}.sh`);
  lines.push(`source "\${SCRIPT_DIR}/${moduleName}.sh"`);
  lines.push("");

  // Test counter
  lines.push("PASS=0");
  lines.push("FAIL=0");
  lines.push("");

  // Assert helper
  lines.push("assert_eq() {");
  lines.push('  local expected="$1" actual="$2" msg="${3:-}"');
  lines.push('  if [[ "$expected" == "$actual" ]]; then');
  lines.push('    PASS=$((PASS + 1))');
  lines.push('    echo "  PASS: $msg"');
  lines.push("  else");
  lines.push('    FAIL=$((FAIL + 1))');
  lines.push('    echo "  FAIL: $msg (expected: $expected, got: $actual)"');
  lines.push("  fi");
  lines.push("}");
  lines.push("");

  lines.push("assert_ok() {");
  lines.push('  local exit_code="$1" msg="${2:-}"');
  lines.push('  if [[ "$exit_code" -eq 0 ]]; then');
  lines.push('    PASS=$((PASS + 1))');
  lines.push('    echo "  PASS: $msg"');
  lines.push("  else");
  lines.push('    FAIL=$((FAIL + 1))');
  lines.push('    echo "  FAIL: $msg (exit code: $exit_code)"');
  lines.push("  fi");
  lines.push("}");
  lines.push("");

  // Test functions
  for (const symbol of symbols) {
    lines.push(`test_${symbol.name}() {`);
    lines.push(`  echo "Testing ${symbol.name}..."`);
    lines.push(`  # TODO: call ${symbol.name} with valid arguments`);
    lines.push(`  # local result; result="$(${symbol.name})"');`);
    lines.push(`  # assert_eq "expected" "$result" "${symbol.name} returns expected value"`);
    lines.push("");

    if (edgeCases) {
      lines.push(`  # Edge cases:`);
      lines.push(`  # TODO: test with empty input`);
      lines.push(`  # TODO: test with missing arguments`);
    }

    lines.push("}");
    lines.push("");
  }

  // Runner
  lines.push("# Run all tests");
  lines.push('echo "=== Tests for ' + moduleName + '.sh ==="');
  for (const symbol of symbols) {
    lines.push(`test_${symbol.name}`);
  }
  lines.push("");
  lines.push('echo ""');
  lines.push('echo "Results: $PASS passed, $FAIL failed"');
  lines.push('if [[ "$FAIL" -gt 0 ]]; then exit 1; fi');
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a test skeleton for a source file.
 * Returns the skeleton without writing to disk.
 */
export function generateTestSkeleton(
  sourceFile: string,
  content?: string,
  options: GeneratorOptions = {},
): TestSkeleton {
  const ext = extname(sourceFile);
  const fileContent = content ?? readFileSync(sourceFile, "utf-8");
  const edgeCases = options.edgeCases ?? true;

  let symbols: ExportedSymbol[];
  let testContent: string;
  let testFile: string;

  if (ext === ".sh") {
    symbols = extractShellFunctions(fileContent);
    testContent = generateShTestSkeleton(sourceFile, symbols, edgeCases);
    testFile = join(dirname(sourceFile), `${basename(sourceFile, ".sh")}.test.sh`);
  } else {
    symbols = extractExportedSymbols(fileContent);
    testContent = generateTsTestSkeleton(sourceFile, symbols, edgeCases);
    const nameWithoutExt = basename(sourceFile).replace(/\.(ts|js|tsx|jsx)$/, "");
    testFile = join(dirname(sourceFile), `${nameWithoutExt}.test.ts`);
  }

  return {
    sourceFile,
    testFile,
    content: testContent,
    symbols,
  };
}

/**
 * Generate and write a test skeleton to disk.
 * Returns the skeleton. Skips if test file already exists unless overwrite is true.
 */
export function generateAndWriteTestSkeleton(
  sourceFile: string,
  options: GeneratorOptions = {},
): TestSkeleton {
  const skeleton = generateTestSkeleton(sourceFile, undefined, options);

  if (existsSync(skeleton.testFile) && !options.overwrite) {
    return skeleton;
  }

  writeFileSync(skeleton.testFile, skeleton.content, "utf-8");
  return skeleton;
}

/**
 * Extract exported symbols from source content (for external use).
 */
export function parseExports(
  content: string,
  language: "typescript" | "shell" = "typescript",
): ExportedSymbol[] {
  if (language === "shell") return extractShellFunctions(content);
  return extractExportedSymbols(content);
}
