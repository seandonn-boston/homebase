/**
 * Admiral Control Plane — Demo
 *
 * Simulates a multi-agent system to demonstrate all three MVP capabilities:
 * 1. Agent Event Stream — watch every action in real time
 * 2. Runaway Detection — see Admiral catch a looping agent
 * 3. Execution Trace — visualize the full reasoning tree
 *
 * Run: npm run example
 * Then open: http://localhost:4510
 */

import { createAdmiral } from "../src/index";
import { AdmiralServer } from "../src/server";

async function main() {
  // Create the Admiral control plane
  const admiral = createAdmiral({
    maxRepeatedToolCalls: 5,
    repeatWindowMs: 30_000,
    tokenSpikePerMinute: 50_000,
    onAlert: (alert) => {
      console.log(`\n⚠  ALERT [${alert.severity}]: ${alert.message}`);
      // Auto-pause on critical alerts
      return alert.severity === "critical";
    },
  });

  // Start the dashboard server
  const server = new AdmiralServer(admiral.stream, admiral.detector, admiral.trace);
  await server.start(4510);

  // --- Simulate a multi-agent system ---

  // Instrument each agent
  const planner = admiral.instrument("planner-1", "PlannerAgent");
  const researcher = admiral.instrument("researcher-1", "ResearchAgent");
  const writer = admiral.instrument("writer-1", "WriterAgent");

  console.log("\n--- Simulating multi-agent task execution ---\n");

  // PlannerAgent starts and creates a task
  planner.started();
  await delay(200);

  const taskId = "task-001";
  planner.taskAssigned(taskId, "Write article about AI governance");
  planner.tokenSpent(1200, "claude-sonnet-4-20250514", taskId);
  await delay(300);

  // PlannerAgent delegates to ResearchAgent
  planner.subtaskCreated(taskId, "subtask-001", "Research market data", "ResearchAgent");
  planner.subtaskCreated(taskId, "subtask-002", "Research industry growth", "ResearchAgent");
  await delay(200);

  // ResearchAgent starts researching
  researcher.started();
  researcher.taskAssigned("subtask-001", "Research market data");
  researcher.tokenSpent(800, "claude-sonnet-4-20250514", "subtask-001");
  await delay(150);

  // Normal tool calls
  researcher.toolCalled("web_search", { query: "AI governance market size 2026" }, "subtask-001");
  researcher.tokenSpent(2100, "claude-sonnet-4-20250514", "subtask-001");
  await delay(200);

  researcher.toolCalled("web_search", { query: "enterprise AI adoption rate" }, "subtask-001");
  researcher.tokenSpent(1800, "claude-sonnet-4-20250514", "subtask-001");
  await delay(200);

  // ResearchAgent starts looping (this will trigger runaway detection)
  console.log("--- ResearchAgent enters a loop ---\n");

  for (let i = 0; i < 8; i++) {
    researcher.toolCalled("web_search", { query: "AI governance market data" }, "subtask-001");
    researcher.tokenSpent(1500, "claude-sonnet-4-20250514", "subtask-001");
    await delay(100);

    // Check if agent got paused
    if (admiral.detector.isAgentPaused("researcher-1")) {
      console.log(`\n🛑 ResearchAgent paused by Admiral after ${i + 1} repeated calls`);
      break;
    }
  }

  await delay(500);

  // Simulate resolving the alert and resuming
  const alerts = admiral.detector.getActiveAlerts();
  if (alerts.length > 0) {
    console.log(`\n--- Resolving ${alerts.length} alert(s) and resuming agent ---\n`);
    for (const alert of alerts) {
      admiral.detector.resolveAlert(alert.id);
    }
    admiral.detector.resumeAgent("researcher-1");
  }

  // ResearchAgent completes properly this time
  researcher.toolCalled("summarize", { content: "market research results" }, "subtask-001");
  researcher.tokenSpent(900, "claude-sonnet-4-20250514", "subtask-001");
  researcher.taskCompleted("subtask-001", { summary: "Market data collected" });
  await delay(200);

  // PlannerAgent delegates to WriterAgent
  planner.subtaskCreated(taskId, "subtask-003", "Draft article", "WriterAgent");
  await delay(200);

  writer.started();
  writer.taskAssigned("subtask-003", "Draft article on AI governance");
  writer.tokenSpent(3200, "claude-sonnet-4-20250514", "subtask-003");
  await delay(300);

  writer.toolCalled("draft_article", { topic: "AI governance", sections: 4 }, "subtask-003");
  writer.tokenSpent(8500, "claude-sonnet-4-20250514", "subtask-003");
  await delay(400);

  writer.taskCompleted("subtask-003", { wordCount: 2400 });
  await delay(200);

  // PlannerAgent wraps up
  planner.taskCompleted(taskId, { status: "article drafted" });
  planner.stopped();
  researcher.stopped();
  writer.stopped();

  // Print the execution trace
  console.log("\n--- Execution Trace ---\n");
  console.log(admiral.trace.renderAscii());

  // Print stats
  console.log("\n--- Stats ---\n");
  const stats = admiral.trace.getStats();
  console.log(`  Agents:     ${stats.agentCount} (${stats.agents.join(", ")})`);
  console.log(`  Tool Calls: ${stats.toolCallCount}`);
  console.log(`  Tokens:     ${stats.totalTokens.toLocaleString()}`);
  console.log(`  Subtasks:   ${stats.subtaskCount}`);
  console.log(`  Failures:   ${stats.failureCount}`);
  console.log(`  Duration:   ${(stats.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Events:     ${stats.eventCount}`);

  console.log("\n--- Dashboard running at http://localhost:4510 ---");
  console.log("Press Ctrl+C to exit.\n");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
