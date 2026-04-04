import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { ContextAssembler, ContextLayer } from "./context-assembly";

describe("ContextAssembler", () => {
	let assembler: ContextAssembler;

	beforeEach(() => {
		assembler = new ContextAssembler(10_000);
	});

	describe("constructor", () => {
		it("throws on zero budget", () => {
			assert.throws(() => new ContextAssembler(0), /positive/);
		});

		it("throws on negative budget", () => {
			assert.throws(() => new ContextAssembler(-100), /positive/);
		});

		it("stores the budget", () => {
			const a = new ContextAssembler(5000);
			assert.equal(a.getBudget(), 5000);
		});
	});

	describe("estimateTokens", () => {
		it("estimates ~4 chars per token", () => {
			assert.equal(assembler.estimateTokens("abcdefgh"), 2); // 8 / 4 = 2
		});

		it("returns minimum of 1 for empty string", () => {
			assert.equal(assembler.estimateTokens(""), 1);
		});

		it("rounds up fractional tokens", () => {
			assert.equal(assembler.estimateTokens("abc"), 1); // ceil(3/4) = 1
		});

		it("handles long content", () => {
			const text = "x".repeat(4000);
			assert.equal(assembler.estimateTokens(text), 1000);
		});
	});

	describe("addBlock", () => {
		it("adds a block and computes tokenEstimate", () => {
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "identity.md",
				content: "I am the helm agent.",
				priority: 100,
				required: true,
			});
			assert.equal(assembler.getBlockCount(), 1);
		});

		it("adds multiple blocks across layers", () => {
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "aa",
				priority: 90,
				required: true,
			});
			assembler.addBlock({
				layer: ContextLayer.Project,
				source: "b",
				content: "bb",
				priority: 50,
				required: false,
			});
			assembler.addBlock({
				layer: ContextLayer.Task,
				source: "c",
				content: "cc",
				priority: 30,
				required: false,
			});
			assert.equal(assembler.getBlockCount(), 3);
		});
	});

	describe("assemble", () => {
		it("orders Fleet first, Project second, Task third", () => {
			assembler.addBlock({
				layer: ContextLayer.Task,
				source: "task",
				content: "task content",
				priority: 80,
				required: false,
			});
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "fleet",
				content: "fleet content",
				priority: 100,
				required: true,
			});
			assembler.addBlock({
				layer: ContextLayer.Project,
				source: "project",
				content: "project content",
				priority: 60,
				required: false,
			});

			const result = assembler.assemble();
			assert.equal(result.layers[ContextLayer.Fleet].length, 1);
			assert.equal(result.layers[ContextLayer.Project].length, 1);
			assert.equal(result.layers[ContextLayer.Task].length, 1);
			assert.equal(result.layers[ContextLayer.Fleet][0].source, "fleet");
		});

		it("sorts blocks within a layer by priority descending", () => {
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "low",
				content: "low pri",
				priority: 10,
				required: false,
			});
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "high",
				content: "high pri",
				priority: 90,
				required: true,
			});

			const result = assembler.assemble();
			assert.equal(result.layers[ContextLayer.Fleet][0].source, "high");
			assert.equal(result.layers[ContextLayer.Fleet][1].source, "low");
		});

		it("calculates total tokens correctly", () => {
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "x".repeat(400),
				priority: 50,
				required: true,
			});
			assembler.addBlock({
				layer: ContextLayer.Task,
				source: "b",
				content: "y".repeat(800),
				priority: 50,
				required: false,
			});

			const result = assembler.assemble();
			assert.equal(result.totalTokens, 100 + 200); // 400/4 + 800/4
		});

		it("computes budgetUsed as percentage", () => {
			const a = new ContextAssembler(1000);
			a.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "x".repeat(2000),
				priority: 50,
				required: true,
			});
			const result = a.assemble();
			assert.equal(result.budgetUsed, 50); // 500/1000 * 100
		});

		it("warns when budget exceeds 75%", () => {
			const a = new ContextAssembler(100);
			a.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "x".repeat(320),
				priority: 50,
				required: true,
			});
			const result = a.assemble();
			assert.ok(result.warnings.length > 0);
			assert.ok(result.warnings[0].includes("warning"));
		});

		it("warns critically when budget exceeds 90%", () => {
			const a = new ContextAssembler(100);
			a.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "x".repeat(380),
				priority: 50,
				required: true,
			});
			const result = a.assemble();
			assert.ok(result.warnings.some((w) => w.includes("critically")));
		});

		it("returns no warnings when under 75%", () => {
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "short",
				priority: 50,
				required: true,
			});
			const result = assembler.assemble();
			assert.equal(result.warnings.length, 0);
		});
	});

	describe("trimToFit", () => {
		it("removes lowest-priority non-required blocks to fit budget", () => {
			const a = new ContextAssembler(50); // 50 token budget
			a.addBlock({
				layer: ContextLayer.Fleet,
				source: "identity",
				content: "x".repeat(80),
				priority: 100,
				required: true,
			}); // 20 tokens
			a.addBlock({
				layer: ContextLayer.Task,
				source: "low",
				content: "y".repeat(80),
				priority: 10,
				required: false,
			}); // 20 tokens
			a.addBlock({
				layer: ContextLayer.Task,
				source: "high",
				content: "z".repeat(80),
				priority: 90,
				required: false,
			}); // 20 tokens
			// Total: 60 tokens, budget: 50
			const result = a.trimToFit();
			assert.ok(result.totalTokens <= 50);
			// The low-priority block should have been removed
			assert.equal(result.layers[ContextLayer.Task].length, 1);
			assert.equal(result.layers[ContextLayer.Task][0].source, "high");
		});

		it("never removes required blocks", () => {
			const a = new ContextAssembler(10); // very tight budget
			a.addBlock({
				layer: ContextLayer.Fleet,
				source: "identity",
				content: "x".repeat(60),
				priority: 100,
				required: true,
			}); // 15 tokens
			a.addBlock({
				layer: ContextLayer.Task,
				source: "task",
				content: "y".repeat(20),
				priority: 10,
				required: false,
			}); // 5 tokens
			const result = a.trimToFit();
			// identity block is required, must remain even if over budget
			assert.ok(result.layers[ContextLayer.Fleet].length >= 1);
		});

		it("does nothing when already within budget", () => {
			assembler.addBlock({
				layer: ContextLayer.Fleet,
				source: "a",
				content: "short",
				priority: 50,
				required: true,
			});
			const result = assembler.trimToFit();
			assert.equal(result.totalTokens, assembler.estimateTokens("short"));
		});

		it("removes multiple blocks if needed", () => {
			const a = new ContextAssembler(30);
			a.addBlock({
				layer: ContextLayer.Fleet,
				source: "req",
				content: "x".repeat(40),
				priority: 100,
				required: true,
			}); // 10 tokens
			a.addBlock({
				layer: ContextLayer.Task,
				source: "t1",
				content: "y".repeat(40),
				priority: 20,
				required: false,
			}); // 10
			a.addBlock({
				layer: ContextLayer.Task,
				source: "t2",
				content: "z".repeat(40),
				priority: 30,
				required: false,
			}); // 10
			a.addBlock({
				layer: ContextLayer.Task,
				source: "t3",
				content: "w".repeat(40),
				priority: 40,
				required: false,
			}); // 10
			// Total 40, budget 30 — need to remove 10 tokens
			const result = a.trimToFit();
			assert.ok(result.totalTokens <= 30);
		});
	});
});
