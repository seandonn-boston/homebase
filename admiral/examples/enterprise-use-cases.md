# Enterprise Use Cases — Admiral Framework in Production

**Date:** 2026-03-17
**Purpose:** Realistic enterprise deployments showing Admiral governing AI agent fleets across industries, using technology stacks that Fortune 500 companies actually run today.

---

## Use Case 1: Multi-Agent Claims Processing — National Health Insurer

**Company profile:** Top-10 US health insurer, 25M+ members, $90B+ revenue, 40,000+ employees
**Admiral profile:** Governed (B3/F3/E2/CP3/S2/P2/DE3)

### What They Already Have

This insurer is not starting from scratch. Over the past three years and $40M+ in investment, they have built a production AI stack that processes 50,000 claims per day. Microsoft Semantic Kernel (.NET) is their agent framework — the natural choice for an organization where 80% of backend services are C#, and where Semantic Kernel integrates directly with their existing dependency injection containers and Azure identity stack. Azure OpenAI (GPT-4o) handles structured extraction under HIPAA BAA coverage, while Anthropic Claude via AWS Bedrock provides the complex medical reasoning that GPT-4o struggles with on multi-comorbidity cases.

The orchestration layer is Azure Durable Functions — already battle-tested for non-AI workflows, providing event-driven claim routing with built-in retry, compensation, and saga patterns. Snowflake serves as the claims warehouse (with Cortex running LLM functions directly against claims data without egress), and Azure Cosmos DB handles sub-10ms agent session state reads. Azure AI Search indexes 4.2M policy documents with hybrid BM25 + vector search and document-level RBAC via Azure AD. Azure Document Intelligence extracts fields from CMS-1500 and UB-04 forms at 97%+ accuracy.

On the monitoring and compliance side, IBM watsonx.governance provides model monitoring, bias detection on denial rates by demographic, and automated AI Factsheet generation for OIG audits. Datadog APM handles infrastructure observability and distributed tracing. Azure Entra ID manages identity, with each agent role receiving a managed identity scoped to specific Snowflake schemas and Cosmos containers. This stack works. It processes claims, extracts medical records, matches policies, and routes decisions. But it has no governance layer for the 11 AI agents making those decisions.

### The Governance Gap

Without agent governance, the insurer faces risks that no component of their existing stack addresses. Agents hallucinate ICD-10 codes — not just an accuracy problem, but a fraudulent billing risk that the OIG investigates and penalizes. A misconfigured agent loop can burn $40K+ in LLM spend before any human notices, because Datadog tracks infrastructure metrics but not agent-level token budgets. There is no audit trail that connects an agent's decision chain to the governance constraints it operated under — Datadog shows that a tool was called, not whether the agent had authority to call it. Most critically, there are no decision authority tiers: a routine $500 dental claim and a $500K experimental oncology procedure receive identical levels of autonomous oversight.

The insurer passed their last HIPAA audit, but auditors are now asking pointed questions about AI governance specifically. How does the organization ensure that AI-generated claim decisions are auditable? What controls prevent an agent from accessing data outside its authorized scope? What happens when an agent enters an error loop? The existing stack has no answers to these questions. HIPAA §164.530 requires complete audit trails for algorithmic decisions, and the current architecture cannot produce them at the agent level.

IBM watsonx.governance monitors models but not agent behavior. It tracks model performance metrics, bias indicators, and drift — valuable capabilities that Admiral does not replicate. But watsonx.governance cannot detect that a Policy Matcher agent has entered a deny-resubmit-deny loop, cannot enforce a per-claim token budget, and cannot gate a decision based on claim value. The gap is not model governance — it is agent governance.

### Where Admiral Plugs In

Admiral integrates into the existing stack without replacing any component:

| Admiral Hook / Component | Integrates With | What It Adds |
|---|---|---|
| `identity_validation` (SessionStart, SO-01) | Azure Entra ID managed identities | Validates agent identity token at session start. Each agent's managed identity is verified before any tool call executes |
| `scope_boundary_guard` (PreToolUse, SO-03) | Semantic Kernel filter pipeline (`IFunctionInvocationFilter`) | Validates every file and tool operation against the agent's declared scope. Native .NET integration via Semantic Kernel's middleware pattern |
| `token_budget_checkpoint` (PreToolUse, SO-10) | Azure cost management | Hard-blocks at per-claim and per-session budget ceilings. Exit code 2 — no "try to stay within budget" |
| `loop_detector` (PostToolUse, SO-06) | Datadog APM correlation | Detects retry loops after 3 identical error signatures. Triggers recovery ladder. Loop events correlate with Datadog distributed traces |
| `pre_work_validator` (PreToolUse, SO-15) | Azure DevOps deployment gates | Validates that Standing Orders are loaded and budget is defined before the first write operation. Deployment gate ensures governance is active before agents process claims |
| Brain (B3) | Snowflake claims warehouse via MCP server | Multi-hop vector search across millions of claims precedents. Agents query Brain before PROPOSE or ESCALATE decisions (SO-11) |
| Control Plane (CP3) | Datadog dashboard integration | Agent-specific governance metrics — token budgets, decision audit trails, loop detection — alongside Datadog's infrastructure observability |

### Technology Stack

| Layer | Technology | Admiral Integration | Why |
|---|---|---|---|
| **LLM Provider** | Azure OpenAI (GPT-4o) + Anthropic Claude via AWS Bedrock | `token_budget_checkpoint` enforces per-model, per-agent spend limits | Azure for HIPAA BAA coverage on structured extraction; Bedrock for complex medical reasoning where Claude excels |
| **Agent Framework** | Microsoft Semantic Kernel (.NET) | Hook adapters map to `IFunctionInvocationFilter` pipeline. Same deterministic enforcement, native .NET integration | Existing .NET estate, 80% of backend is C#. Semantic Kernel integrates natively with their dependency injection and Azure identity stack |
| **Orchestration** | Azure Durable Functions | `pre_work_validator` fires on workflow activation. Governance state persists independently of Durable Function state | Event-driven, serverless claim routing with built-in retry, compensation, and saga patterns. Already used for non-AI workflows |
| **Data Platform** | Snowflake (claims warehouse) + Azure Cosmos DB (session state) | Brain (B3) MCP server queries Snowflake for claims precedents. Cosmos stores Admiral session governance state | Snowflake Cortex for running LLM functions directly against claims data without egress. Cosmos for sub-10ms agent state reads |
| **Vector Store** | Azure AI Search (formerly Cognitive Search) | `scope_boundary_guard` enforces document-level access per agent role | Hybrid search (BM25 + vector) over 4.2M indexed policy documents. Integrated with Azure AD for document-level RBAC |
| **Document Processing** | Azure Document Intelligence (formerly Form Recognizer) | Extraction outputs validated by Hallucination Auditor before claim advances | Pre-trained models for CMS-1500, UB-04, EOBs. 97%+ field extraction accuracy on standardized medical forms |
| **Compliance** | IBM watsonx.governance + internal HIPAA audit pipeline | Admiral JSONL event logs feed watsonx.governance dashboards. Hook telemetry provides agent-level detail that model-level monitoring lacks | Model monitoring, bias detection on denial rates by demographic, automated AI Factsheet generation for OIG audits |
| **Observability** | Datadog APM + Admiral Control Plane (CP3) | CP3 governance metrics (token budgets, loop detections, decision authority tiers) correlate with Datadog distributed traces | Datadog for infrastructure metrics and distributed tracing; Admiral CP for agent-specific governance |
| **CI/CD** | Azure DevOps Pipelines + Terraform | `pre_work_validator` integrated as deployment gate. Standing Orders deployed alongside agent code | Blue-green deployment of agent fleet updates. Terraform manages Bedrock/Azure AI resource provisioning |
| **Identity** | Azure Entra ID (formerly Azure AD) + managed identities | `identity_validation` hook verifies managed identity at SessionStart (SO-01) | Each agent role gets a managed identity with least-privilege access to specific Snowflake schemas and Cosmos containers |

### Agent Fleet (11 agents)

| Agent | Model | Role | Governed By |
|---|---|---|---|
| **Triage Agent** | GPT-4o-mini | Classifies incoming claims by type, complexity, and routing priority | `token_budget_checkpoint` (E2), `identity_validation` hook (SO-01) |
| **Medical Record Extractor** | Claude Opus 4.6 | Extracts diagnoses (ICD-10), procedures (CPT/HCPCS), and clinical notes from unstructured medical records | HIPAA data handling guardrails, hallucination auditor |
| **Policy Matcher** | GPT-4o | Matches extracted medical data against member's specific plan benefits, exclusions, and prior authorizations | SO-03 (Scope Boundaries) via `scope_boundary_guard` hook, deterministic policy lookup |
| **Provider Verifier** | GPT-4o-mini | Validates provider credentials, network status, and billing codes against CMS NPI registry and internal credentialing DB | Read-only tool access, no write permissions |
| **Fraud Detection Agent** | Claude Sonnet 4.6 | Flags anomalous billing patterns, upcoding, unbundling, and impossible day surgery combinations | High-sensitivity mode, human referral on all flags |
| **Adjudication Agent** | Claude Opus 4.6 | Makes pay/deny/pend determination with reasoning chain and regulatory citation | SO-05 Decision Authority: AUTONOMOUS for claims <$10K, PROPOSE for >$10K (requires human approval) |
| **Appeal Prep Agent** | GPT-4o | When a claim is denied, pre-generates the member explanation letter with appeal rights per state regulations | Output reviewed by QA Agent before send |
| **QA Agent** | Claude Sonnet 4.6 | Reviews all agent outputs for accuracy, completeness, and regulatory compliance | Never routes to itself, conflict-of-interest guardrail |
| **Compliance Logger** | GPT-4o-mini | Generates immutable audit records for every claim decision, mapping to HIPAA §164.530 requirements | Write-only to append-only audit log |
| **Orchestrator** | Claude Opus 4.6 | Routes claims through the pipeline, manages handoffs, escalates edge cases | All 15 Standing Orders loaded via `pre_work_validator` (SO-15), `token_budget_checkpoint`, `loop_detector` |
| **Hallucination Auditor** | Claude Sonnet 4.6 | Validates that extracted medical codes and policy citations are real, not fabricated | Cross-references all codes against CMS and plan databases |

### Why B3 (Brain Level 3)

At 50,000 claims/day, the system generates millions of precedent records within months. B1 (JSON/grep) cannot scale past hundreds of entries. B2 (SQLite + embeddings) caps at thousands. B3 (Postgres + pgvector + MCP) provides: multi-hop vector search across millions of claims precedents, concurrent access from 11 agents without lock contention, and entry decay awareness so stale precedents (e.g., outdated billing codes) are flagged rather than silently served. The Brain also supports SO-11 (Context Discovery) — agents must query Brain before making PROPOSE or ESCALATE decisions.

### Admiral Governance in Action

**Why Admiral matters here (not just the agents):**

1. **Deterministic budget enforcement** — Each claim costs ~$0.12-$0.85 in LLM spend depending on complexity. At 50,000 claims/day, a runaway agent loop could burn $40K+ before anyone notices. Admiral's `token_budget_checkpoint` hook (PreToolUse, SO-10) hard-blocks at the per-claim and per-session budget ceiling. No "try to stay within budget" — exit code 2, tool blocked.

2. **Four-tier decision authority (SO-05)** — The Adjudication Agent operates under Admiral's four-tier decision authority model, calibrated per claim category:
   - **ENFORCED**: Token budget limits, tool permission boundaries — hooks handle these, agent doesn't decide
   - **AUTONOMOUS**: Standard claims <$10K with common procedure codes — auto-approve, log decision
   - **PROPOSE**: Claims >$10K, experimental procedures, out-of-network emergency — draft determination with reasoning chain, await human approval
   - **ESCALATE**: Suspected fraud indicators, patterns matching OIG hot-list — stop immediately, flag to compliance team
   This isn't a prompt instruction the agent can override under pressure — the PreToolUse hook inspects the adjudication payload and enforces the tier boundary before the write executes.

3. **Hallucination is a compliance violation** — If the Medical Record Extractor fabricates an ICD-10 code that doesn't exist in CMS's published code set, it's not just wrong — it's potentially fraudulent billing. Admiral's Hallucination Auditor validates every extracted code against the canonical CMS database before the claim advances.

4. **Audit trail for OIG** — The Office of Inspector General requires complete audit trails for algorithmic claim decisions. Admiral's event log (JSONL) + Brain (B3 with Postgres + pgvector) provide an immutable record of every agent decision, the context it operated on, and the governance hooks that fired. This isn't optional — it's the difference between passing and failing a federal audit.

5. **Loop detection prevents cascading denials** — Without loop detection, a misconfigured Policy Matcher can enter a deny-resubmit-deny cycle on a class of claims. Admiral's `loop_detector` hook (PostToolUse, SO-06) catches this after 3 identical error signatures and triggers the recovery ladder (SO-06: retry -> fallback -> backtrack -> isolate -> escalate).

6. **SO-14 safety gap and mitigation** — SO-14 (Compliance, Ethics, Legal) is currently advisory-only — no deterministic hook enforcement exists in the Admiral spec. For a HIPAA-regulated claims operation, this is a known gap. The enterprise compensates by: (a) IBM watsonx.governance providing external model monitoring and bias detection, (b) the internal HIPAA audit pipeline validating all agent outputs against §164.530 requirements, and (c) the QA Agent functioning as a soft enforcement layer reviewing every decision before it reaches the claims system. The spec roadmap targets a `compliance_boundary_check` hook for E3.

### Data Ecosystem Streams (DE3)

The claims operation generates four data streams that Admiral's DE3 captures and correlates:

| Stream | Source | Example Data | Admiral Use |
|---|---|---|---|
| **Stream 1: Engagement** | Incoming claims, member interactions, provider submissions | Claim volume, denial rates by demographic, appeal frequency | Bias detection, capacity planning |
| **Stream 2: Trend** | CMS regulatory updates, code set revisions, payer policy changes | New CPT codes, coverage policy amendments, state regulation changes | Regulatory Intelligence Agent alerting, Brain entry updates |
| **Stream 3: AI Decision** | Agent reasoning chains, confidence scores, tool call logs | Adjudication rationale, extraction confidence, fraud detection scores | OIG audit evidence, decision quality tracking |
| **Stream 4: Governance** | Hook events, budget utilization, loop detections, escalation logs | Token spend per claim, hook exit codes, recovery ladder activations | Fleet health monitoring, cost optimization, runaway prevention |

### Measured Outcomes

- Claims cycle time: 14 days -> 2.1 days (85% reduction)
- Cost per claim adjudication: $7.40 -> $1.20 (84% reduction)
- Denial accuracy: 91% -> 97.3% (fewer erroneous denials = fewer appeals)
- OIG audit compliance: 100% automated documentation
- Agent runaway incidents caught by Admiral: 47 in first 90 days (zero reached production)

---

## Use Case 2: Autonomous Trading Risk Governance — Global Investment Bank

**Company profile:** Top-5 global investment bank, $50B+ revenue, 60,000+ employees, SEC/FINRA/FCA/MAS regulated
**Admiral profile:** Production (B3/F3/E3/CP4/S2/P3/DE4)

### What They Already Have

This bank has spent $100M+ building one of the most sophisticated AI trading infrastructures in the industry. LangGraph (Python) orchestrates their agent workflows — graph-based pipelines that map naturally to trading signal generation, where conditional routing and parallel fan-out across asset classes are the core pattern. The Python ecosystem matches their quant team's existing toolchain. Apache Kafka handles real-time event streaming for market data, signals, and risk alerts, while Kubernetes (EKS) scales agent pods dynamically based on market volatility to meet a sub-100ms p99 latency requirement.

The model tier strategy is deliberate. Self-hosted Llama 3.3 70B, served via vLLM, handles latency-critical FX signal generation at under 10ms inference — no external API call is fast enough. Anthropic Claude (direct API, self-hosted on AWS) provides the complex reasoning needed for risk narratives, portfolio construction, and regulatory interpretation. Databricks Lakehouse (Delta Lake) powers feature engineering, model training, and batch analytics, while kdb+/q — the industry standard for time-series financial data — handles real-time tick-level market data. Pinecone indexes 200M+ vectors across 15 years of research reports, earnings call transcripts, and regulatory filings for semantic search.

The risk and compliance infrastructure is equally mature. An internal C++ risk engine paired with QuantLib provides real-time VaR, Greeks, and stress testing. Bloomberg Vault captures all communications for MiFID II and SEC Rule 17a-4 surveillance. Grafana and Prometheus handle latency and throughput monitoring. HashiCorp Vault manages API keys and trading credentials with mTLS between all agent-to-agent communication. Trading agents are physically network-isolated from internet-facing systems. GitLab CI, ArgoCD, and MLflow manage the CI/CD pipeline with canary deployments and automated rollback. Adding Admiral does not touch any of it.

### The Governance Gap

Without agent governance, this infrastructure has blind spots that its individual components cannot address. A compromised or hallucinating signal agent could theoretically access execution tools — the separation between signal generation and trade execution is enforced by convention, not by deterministic control. There is no VaR budget coordination across the Alpha fleet (equities and fixed income) and Beta fleet (FX and derivatives) — each fleet manages its own risk limits independently, meaning both could simultaneously consume 60% of the portfolio's VaR budget, totaling 120%. Model tier violations go undetected: a Signal Agent can silently upgrade from Sonnet to Opus for "harder thinking," blowing the cost budget without any alert.

SEC's March 2025 AI trading guidance creates new compliance requirements that the existing stack was not designed to meet. Regulators now want to know not just that a trade was made, but why an AI agent decided to make it, what governance constraints it operated under, and whether it had authority to act. Bloomberg Vault captures communications — agent-generated trade rationale included — but it captures the output, not the decision chain. It cannot tell an examiner which governance hooks fired, whether the agent's scope was validated, or what decision authority tier governed the action.

Bloomberg Vault monitors communications. Grafana monitors infrastructure. MLflow tracks model versions. None of them monitor agent behavior. None can detect that a signal agent entered a retry loop generating spurious signals during volatile markets. None can enforce that a Portfolio Construction Agent's proposed trade list must pass two independent ENFORCED gates before reaching the Execution Agent. None can propagate VaR budget consumption across fleet boundaries in real-time. The infrastructure to run trading agents is world-class. The infrastructure to govern them does not exist.

### Where Admiral Plugs In

Admiral integrates into the existing stack without replacing any component:

| Admiral Hook / Component | Integrates With | What It Adds |
|---|---|---|
| `scope_boundary_guard` (PreToolUse, SO-03) | LangGraph node configuration | Signal agents have no execution tools in their tool list — enforced at config time, not by prompt instruction. Exit code 2 blocks any out-of-scope tool call |
| `prohibitions_enforcer` (PreToolUse, SO-10) | Pre-Trade Compliance Agent | Restricted list violations blocked before execution reaches the trading venue. Deterministic, not advisory |
| `token_budget_checkpoint` (PreToolUse, SO-10) | Per-trade size validation | Inspects Execution Agent's tool call payload, extracts order size, blocks if exceeding $50M notional. Catches fat-finger errors and hallucinated position sizes |
| Cross-fleet coordination (P3, A2A over JSON-RPC 2.0 + mTLS) | Alpha and Beta orchestrators via HashiCorp Vault mTLS | Shared VaR limits propagated in real-time. If Alpha consumes 70%, Beta sees the updated ceiling immediately |
| Brain (B3) | Databricks Lakehouse via MCP server | Semantic search across regulatory interpretations and trading precedents. Agents query Brain before PROPOSE or ESCALATE decisions |
| `loop_detector` (PostToolUse, SO-06) | Grafana alert correlation | Loop detection events correlate with Grafana dashboards. Recovery ladder triggers before spurious signals reach downstream agents |
| Model tier validation hook | MLflow model registry | Prevents silent model upgrades. Agent-to-model assignment is enforced, not suggested |
| `identity_validation` (SessionStart, SO-01) | HashiCorp Vault identity tokens | Agent identity verified at session start before any tool call executes |

### Technology Stack

| Layer | Technology | Admiral Integration | Why |
|---|---|---|---|
| **LLM Provider** | Anthropic Claude (direct API, self-hosted on AWS) + internal fine-tuned Llama 3.3 models | Model tier validation hook enforces agent-to-model assignment. `token_budget_checkpoint` tracks per-model spend | Claude for complex reasoning on risk narratives; Llama for high-frequency, low-latency signal classification (self-hosted for data sovereignty) |
| **Agent Framework** | LangGraph (Python) | Hook adapters translate between LangGraph callbacks and Admiral hook contracts. `scope_boundary_guard` validates tool access at every graph node | Graph-based workflow orchestration maps naturally to trading signal pipelines. Conditional routing, parallel fan-out for multi-asset analysis. Python ecosystem matches quant team's existing stack |
| **Orchestration** | Apache Kafka + Kubernetes (EKS) | PostToolUse hooks publish governance events to Kafka topics for real-time compliance streaming. K8s pod scaling does not affect hook enforcement | Kafka for real-time event streaming (market data, signals, risk alerts). K8s for scaling agent pods based on market volatility. Sub-100ms p99 latency requirement |
| **Data Platform** | Databricks Lakehouse (Delta Lake) + kdb+/q (tick data) | Brain (B3) MCP server queries Databricks for regulatory interpretations and trading precedents | Databricks for feature engineering, model training, and batch analytics. kdb+ for real-time tick-level market data — the industry standard for time-series financial data |
| **Vector Store** | Pinecone (Serverless) | Brain (B3) augments Pinecone search with governance-aware context (entry decay, access scope) | Semantic search across 15 years of research reports, earnings call transcripts, and regulatory filings. 200M+ vectors. Serverless eliminates capacity planning |
| **Risk Engine** | Internal C++ risk engine + QuantLib | `scope_boundary_guard` enforces that agents cannot bypass the risk engine — hard gate, not convention | Real-time VaR, Greeks, stress testing. Agents cannot bypass the risk engine — Admiral enforces this as a hard gate |
| **Compliance** | Bloomberg Vault (communications surveillance) + internal reg-tech stack | Admiral JSONL event logs provide the agent decision chain that Bloomberg Vault captures but cannot generate | All agent-generated trade rationale captured for MiFID II and SEC Rule 17a-4 recordkeeping |
| **Observability** | Grafana + Prometheus + Admiral Control Plane (CP4) | CP4 provides agent-level governance metrics: cost forecasting, trend analysis, cross-strategy VaR coordination. `loop_detector` events correlate with Grafana alerts | Grafana for latency/throughput dashboards. Admiral CP4 for agent-level governance |
| **CI/CD** | GitLab CI + Argo CD + model registry (MLflow) | `pre_work_validator` integrated as GitLab CI gate. Standing Orders deployed alongside agent code via ArgoCD | GitOps for agent deployment. MLflow tracks model versions powering each agent. Canary deployments with automated rollback |
| **Security** | HashiCorp Vault + mTLS + network segmentation | `identity_validation` hook verifies Vault-issued identity tokens at SessionStart. Cross-fleet A2A messages use existing mTLS infrastructure | Vault manages API keys and trading credentials. mTLS between all agent-to-agent communication. Trading agents physically network-isolated from internet-facing systems |

### Agent Fleet (14 agents, multi-orchestrator)

| Agent | Model | Role | Decision Authority |
|---|---|---|---|
| **Market Data Ingestion Agent** | Llama 3.3 70B (self-hosted) | Normalizes and enriches real-time feeds from Bloomberg, Reuters, exchange direct | Read-only. No trade authority |
| **Signal Generation Agent (Equities)** | Claude Sonnet 4.6 | Generates long/short signals from fundamental + technical + alternative data | AUTONOMOUS — signal output only, no execution tools available |
| **Signal Generation Agent (Fixed Income)** | Claude Sonnet 4.6 | Yield curve analysis, credit spread signals, duration risk assessment | AUTONOMOUS — signal output only |
| **Signal Generation Agent (FX)** | Llama 3.3 70B (vLLM) | High-frequency FX pair signals. Self-hosted via vLLM for latency (<10ms inference) | AUTONOMOUS — signal output only |
| **Sentiment Agent** | Claude Haiku 4.5 | Processes news feeds, social media, earnings calls for sentiment scores | Read-only. Sentiment score output only |
| **Research Synthesis Agent** | Claude Opus 4.6 | Reads analyst reports, SEC filings, conference call transcripts. Produces investment theses | Advisory. No trade authority |
| **Portfolio Construction Agent** | Claude Opus 4.6 | Aggregates signals into portfolio-level positions, optimizes for risk-adjusted returns | PROPOSE — drafts trade list with rationale, awaits Risk + Compliance gates |
| **Risk Validation Agent** | Claude Sonnet 4.6 + QuantLib | Validates proposed trades against VaR limits, concentration limits, drawdown thresholds | ENFORCED gate — `scope_boundary_guard` hook blocks trades exceeding risk limits (exit code 2) |
| **Pre-Trade Compliance Agent** | Claude Sonnet 4.6 | Checks proposed trades against restricted lists, insider trading windows, position limits | ENFORCED gate — `prohibitions_enforcer` hook blocks restricted-list violations (exit code 2) |
| **Execution Agent** | Llama 3.3 70B (vLLM, self-hosted) | Routes validated trades to execution venues (DMA, dark pools, algo wheels) | AUTONOMOUS only after both gates pass. `token_budget_checkpoint` enforces per-trade size limits |
| **Post-Trade Reconciliation Agent** | GPT-4o-mini | Matches executed trades against intended positions, flags breaks | Read + report. Cannot modify positions |
| **Regulatory Reporting Agent** | Claude Sonnet 4.6 | Generates MiFID II best execution reports, SEC 13F filings, CFTC position reports | Write-only to regulatory systems. Human sign-off required |
| **Orchestrator (Alpha)** | Claude Opus 4.6 | Manages signal -> portfolio -> execution pipeline for equity + FI | All 15 Standing Orders via `pre_work_validator` (SO-15). `token_budget_checkpoint`: $5K/day |
| **Orchestrator (Beta)** | Claude Opus 4.6 | Manages FX + derivatives pipeline | All 15 Standing Orders. Independent budget, shared VaR limit via cross-fleet protocol (F3) |

### Why B3 (Brain Level 3)

15 years of research reports, regulatory interpretations, and trading precedents — easily millions of entries requiring multi-hop vector search. Multiple agent teams (Alpha fleet: equities + FI, Beta fleet: FX + derivatives) need concurrent read/write access without lock contention. B3's Postgres + pgvector + MCP architecture provides: semantic search across regulatory guidance (e.g., "find SEC interpretations relevant to this novel instrument type"), cross-strategy knowledge sharing (Alpha's credit analysis informing Beta's credit derivative signals), and entry decay awareness flagging stale regulatory guidance when rules change.

### Admiral Governance in Action

1. **Four-tier decision authority prevents unauthorized trades (SO-05)** — Admiral's decision authority model maps precisely to trading controls:
   - **ENFORCED**: `scope_boundary_guard` and `prohibitions_enforcer` hooks block trades that breach VaR limits or hit restricted lists — the agent never sees the decision
   - **AUTONOMOUS**: Signal agents generate signals and log them — no approval needed, no execution authority
   - **PROPOSE**: Portfolio Construction Agent drafts trade lists with rationale — must pass both ENFORCED gates before execution
   - **ESCALATE**: Anomalous market conditions, novel instrument types, or model disagreements — stop work, flag to risk committee
   A compromised or hallucinating signal agent cannot execute a trade because it has no execution tools in its tool list — enforced by `scope_boundary_guard` at configuration time.

2. **Position size hard limits** — Admiral's `token_budget_checkpoint` hook (adapted for trade size validation) inspects the Execution Agent's tool call payload, extracts the order size, and blocks (exit code 2) if it exceeds $50M notional without human approval. This catches fat-finger errors and agent hallucinations about position sizes. The hook fires on every PreToolUse event — no exceptions, no overrides.

3. **Cross-fleet coordination (F3+)** — The Alpha and Beta orchestrators operate independently but share risk limits. Admiral's cross-fleet coordination protocol (P3, A2A over JSON-RPC 2.0 with mTLS) ensures that if Alpha consumes 70% of the portfolio's VaR budget, Beta's Risk Validation Agent sees the updated limit in real-time. Without this, two independent fleets could each take 60% of the risk budget, totaling 120%.

4. **Cost governance across model tiers** — Claude Opus for complex reasoning, Sonnet for validation, Haiku for high-volume sentiment, self-hosted Llama (served via vLLM) for latency-critical paths. Admiral's model tier validation hook ensures agents use their assigned model — a Signal Agent cannot silently upgrade to Opus to "think harder" and blow the cost budget. The `token_budget_checkpoint` tracks spend per agent, per fleet, and per day.

5. **Regulatory recordkeeping** — Every agent decision, including the full reasoning chain, is logged to Admiral's Brain (B3) and simultaneously to Bloomberg Vault. SEC examiners can reconstruct exactly why a trade was made, which agents contributed to the decision, and what governance checks it passed.

6. **SO-14 safety gap and mitigation** — SO-14 (Compliance, Ethics, Legal) lacks deterministic hook enforcement in the current spec. For an SEC/FINRA-regulated trading operation, this means ethical judgment calls (e.g., should this trade be flagged for potential market manipulation even though it passes all quantitative checks?) rely on advisory guidance, not hard blocks. The enterprise compensates with: (a) Bloomberg Vault capturing all agent communications for surveillance review, (b) the Pre-Trade Compliance Agent serving as a soft enforcement layer with explicit ESCALATE authority on ethical edge cases, and (c) human sign-off required on all regulatory reporting output.

### Data Ecosystem Streams (DE4)

| Stream | Source | Example Data | Admiral Use |
|---|---|---|---|
| **Stream 1: Engagement** | Market data feeds, client orders, counterparty interactions | Trade volumes, signal hit rates, portfolio P&L | Strategy performance attribution |
| **Stream 2: Trend** | Market conditions, regulatory changes, macroeconomic indicators | Volatility regimes, new SEC guidance, rate expectations | Adaptive risk limit calibration |
| **Stream 3: AI Decision** | Agent reasoning chains, signal confidence, trade rationale | Why a trade was proposed, risk model outputs, compliance check results | SEC/FINRA evidence, decision quality scoring |
| **Stream 4: Governance** | Hook events, budget utilization, cross-fleet coordination logs | Position limit breaches caught, model tier violations, VaR budget allocation | Fleet optimization, cost forecasting (CP4), runaway prevention |

### Measured Outcomes

- Trading signal generation: 4 hours (human analyst) -> 12 minutes (agent fleet)
- Risk validation coverage: 60% of trades (human) -> 100% (agent fleet, no exceptions)
- Regulatory reporting cycle: 5 business days -> same-day automated
- Annual compliance cost reduction: $18M
- Agent governance incidents caught: 312 in first year (position limit breaches, model tier violations, loop detections)

---

## Use Case 3: Intelligent Manufacturing Quality Control — Automotive OEM

**Company profile:** Top-3 global automaker, $160B+ revenue, 75 manufacturing plants, 300,000+ employees
**Admiral profile:** Team (B2/F2/E1/CP2/S1/P2/DE2)
**Problem:** Defect detection across 75 plants using a patchwork of legacy vision systems, manual inspection, and disconnected quality databases. Average defect escape rate of 450 PPM (parts per million). Target: <50 PPM.

### Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **LLM Provider** | Google Vertex AI (Gemini 2.5 Pro) + AWS Bedrock (Claude) | Gemini for multimodal vision-language tasks (inspecting images + reasoning about defects). Claude via Bedrock for root cause analysis narratives and supplier communication |
| **Agent Framework** | Google Agent Development Kit (ADK) + CrewAI | ADK for vision-heavy agents that leverage Vertex AI's native multimodal pipeline. CrewAI for the collaborative root-cause-analysis crew where agents debate failure modes |
| **Orchestration** | Google Cloud Workflows + Pub/Sub | Event-driven: camera captures trigger inspection agents. Pub/Sub for plant-to-cloud event streaming at 10,000+ events/second per plant |
| **Data Platform** | Google BigQuery (analytics) + Snowflake (cross-cloud warehouse) + Historian (OSIsoft PI / AVEVA) | BigQuery for real-time defect analytics. Snowflake as the cross-plant data mesh. OSIsoft PI for time-series sensor data from PLCs and SCADA systems |
| **Vision Pipeline** | Google Cloud Vision AI + custom YOLO v9 models on NVIDIA Jetson AGX | Cloud Vision for general defect classification. Edge-deployed YOLO models on Jetson for real-time (<50ms) inline inspection at line speed |
| **Vector Store** | Weaviate (self-hosted on GKE) | Stores embeddings of 12M+ historical defect images for similarity search. Self-hosted for data residency requirements (no defect images leave the private cloud) |
| **MES Integration** | Siemens Opcenter + OPC-UA | Manufacturing Execution System integration via OPC-UA protocol. Agents read real-time production parameters and write quality holds |
| **Observability** | Splunk (plant IT) + Admiral Control Plane (CP2) | Splunk for operational technology monitoring. Admiral CP2 web dashboard for fleet-wide agent health, defect detection rates, and false positive tracking |
| **CI/CD** | Jenkins + Helm + Harbor (container registry) | Jenkins for building agent containers. Helm charts for deploying agent updates to plant-edge Kubernetes clusters. Harbor for air-gapped container registry in plants |
| **Edge Compute** | NVIDIA Jetson AGX Orin + AWS Outposts (select plants) | Jetson for real-time vision inference on the production line. Outposts for running cloud-native agent workloads in plants with poor connectivity |

### Agent Fleet (8 agents)

| Agent | Model | Location | Role |
|---|---|---|---|
| **Visual Inspection Agent** | Gemini 2.5 Pro (Vision) + YOLO v9 | Edge (Jetson) + Cloud | Captures and analyzes images from 200+ cameras per plant. YOLO for real-time pass/fail; Gemini for detailed defect classification on flagged parts |
| **Sensor Correlation Agent** | Claude Sonnet 4.6 | Cloud | Correlates defect occurrences with sensor data (temperature, pressure, torque, vibration) from the Historian to identify process drift |
| **Root Cause Analysis Agent** | Claude Opus 4.6 | Cloud | Synthesizes visual defect data, sensor correlations, and historical patterns to generate root cause hypotheses. Uses CrewAI to debate hypotheses with the Sensor Correlation Agent |
| **Supplier Quality Agent** | Gemini 2.5 Pro | Cloud | Analyzes incoming material inspection data, correlates supplier lots with downstream defects, generates supplier corrective action requests |
| **Predictive Maintenance Agent** | Claude Sonnet 4.6 | Cloud | Monitors equipment sensor trends and predicts failures before they cause defects. Triggers preventive work orders in the CMMS |
| **Quality Hold Agent** | Claude Haiku 4.5 | Edge | Makes real-time hold/release decisions on production lots. Writes quality holds to Siemens Opcenter MES via OPC-UA |
| **QA Agent** | Claude Sonnet 4.6 | Cloud | Reviews all defect classifications for false positives/negatives. Validates root cause analyses against known failure mode libraries (FMEA) |
| **Orchestrator** | Claude Opus 4.6 | Cloud | Routes inspection events, manages cross-plant defect pattern detection, escalates systemic issues |

### Admiral Governance in Action

1. **Edge agent budget isolation** — The Visual Inspection Agent and Quality Hold Agent run at the edge on Jetson hardware. Admiral's token budget gate ensures edge agents cannot consume cloud LLM capacity beyond their allocation. If Gemini's API quota is exhausted, the YOLO fallback model continues inline inspection without interruption. The agent doesn't decide this — the hook enforces it.

2. **Quality hold authority** — Only the Quality Hold Agent can write holds to the MES. The Root Cause Analysis Agent can recommend a hold, but Admiral's tool permission enforcement ensures it cannot directly invoke the MES write tool. This separation prevents a hallucinating analysis agent from shutting down a production line.

3. **Cross-plant pattern detection** — When the same defect signature appears in 3+ plants within 48 hours, the Orchestrator escalates to the global quality team. Admiral's Brain (B2) stores defect patterns with semantic search, enabling the Orchestrator to query "similar defects across all plants this week" rather than relying on exact string matches.

4. **Loop detection on false positive spirals** — A miscalibrated camera can cause the Visual Inspection Agent to flag every part as defective. Admiral's loop detector catches this after 3 consecutive identical "defect detected" outputs with the same signature, pausing the agent and alerting the plant quality engineer.

5. **Standing Order enforcement for safety** — SO 2 (Scope Discipline) prevents the Predictive Maintenance Agent from directly modifying equipment parameters. It can predict failures and generate work orders, but cannot send commands to PLCs. This isn't a suggestion — the agent's tool list explicitly excludes OPC-UA write operations, enforced at configuration validation time.

### Measured Outcomes

- Defect escape rate: 450 PPM → 38 PPM (92% reduction)
- False positive rate: 12% → 2.1% (QA Agent feedback loop)
- Mean time to root cause: 72 hours → 4 hours
- Unplanned downtime (quality-related): 340 hours/year → 45 hours/year
- Supplier corrective actions: 3x faster cycle time

---

## Use Case 4: Enterprise Knowledge Operations — Global Professional Services Firm

**Company profile:** Big Four accounting/consulting firm, $60B+ revenue, 400,000+ employees, operating in 150+ countries
**Admiral profile:** Enterprise (B3/F4/E3/CP5/S3/P3/DE5)
**Problem:** 400,000 professionals each spending 2+ hours/day searching for precedents, templates, methodologies, and regulatory guidance across 40+ internal knowledge systems. Fragmented knowledge across regional practices. Inconsistent quality of client deliverables.

### Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **LLM Provider** | Anthropic Claude (direct API) + Google Gemini (Vertex AI) + Azure OpenAI | Claude for complex analysis and report generation. Gemini for multimodal document understanding (scanned PDFs, diagrams). Azure OpenAI for bulk summarization (cost optimization on high-volume, low-complexity tasks) |
| **Agent Framework** | OpenAI Agents SDK (Python) + MCP (Model Context Protocol) servers | Agents SDK for clean tool-use patterns and handoff orchestration. MCP servers expose internal knowledge systems as structured tool interfaces — each knowledge repository becomes an MCP server the agents can query |
| **Orchestration** | Temporal.io (self-hosted on K8s) | Long-running, durable workflows for multi-day engagement planning. Built-in retry, timeout, and compensation. Handles the reality that some knowledge retrieval takes hours (e.g., cross-border regulatory queries requiring human expert confirmation) |
| **Data Platform** | Databricks Unity Catalog + SharePoint Online + Confluence | Unity Catalog as the governed data mesh — every dataset has an owner, lineage, and access policy. SharePoint and Confluence are the primary knowledge repositories (not replaceable — too much institutional inertia) |
| **Vector Store** | Elasticsearch 8.x (self-hosted) with ELSER v2 | Hybrid search (sparse + dense) over 850M+ documents. Self-hosted for client confidentiality. ELSER (Elastic Learned Sparse EncodeR) outperforms pure vector search on professional services terminology |
| **Document Generation** | Apache POI (Java) + LaTeX + internal template engine | Agents generate structured content; template engines produce client-ready Word/PDF/PowerPoint. No raw LLM output goes to clients — every deliverable passes through branded templates |
| **Compliance** | ServiceNow GRC + internal ethics review pipeline | ServiceNow for engagement risk management. Ethics review pipeline validates that agent-generated advice doesn't conflict with independence requirements (critical for audit engagements) |
| **Observability** | Elastic APM + Admiral Control Plane (CP5) | Elastic APM for distributed tracing across the MCP server mesh. Admiral CP5 Federation Dashboard for multi-region, multi-practice fleet governance |
| **CI/CD** | GitHub Actions + ArgoCD + Backstage (developer portal) | GitHub Actions for agent CI. ArgoCD for GitOps deployment to regional K8s clusters. Backstage for agent catalog — every agent has a service card with owner, SLO, and runbook |
| **Identity & Access** | Okta (SSO) + Open Policy Agent (OPA) | Okta for user identity. OPA for fine-grained authorization — which agents can access which client engagement data. Engagement-level data isolation enforced by policy, not convention |
| **Protocol** | MCP (Model Context Protocol) + A2A (Agent-to-Agent, Google) | MCP for tool integration (knowledge repos, template engines, compliance APIs). A2A for cross-practice agent communication (e.g., tax agent in Germany requesting transfer pricing precedents from US practice) |

### Agent Fleet (20+ agents, multi-orchestrator, federated)

**Command Layer (4 agents):**

| Agent | Model | Role |
|---|---|---|
| **Global Orchestrator** | Claude Opus 4.6 | Routes cross-practice, cross-region requests. Manages federation across regional orchestrators |
| **Regional Orchestrator (×4)** | Claude Sonnet 4.6 | Manages agent fleet within Americas / EMEA / APAC / Japan. Enforces regional data residency |
| **Triage Agent** | Claude Sonnet 4.6 | Classifies incoming requests by service line (Audit, Tax, Advisory, Consulting), complexity, and urgency |
| **Context Curator** | Claude Sonnet 4.6 | Assembles engagement-specific context packages from multiple knowledge sources before routing to specialists |

**Specialist Layer (16+ agents):**

| Agent | Model | Role |
|---|---|---|
| **Audit Methodology Agent** | Claude Opus 4.6 | Retrieves and applies audit standards (ISA, PCAOB, local GAAP) to specific engagement scenarios |
| **Tax Research Agent** | Claude Opus 4.6 | Multi-jurisdiction tax research across 150+ tax codes. Cross-references treaties, rulings, and precedents |
| **Transfer Pricing Agent** | Claude Opus 4.6 | Analyzes intercompany transactions, benchmarks against comparable transactions, generates TP documentation |
| **Regulatory Intelligence Agent** | Gemini 2.5 Pro | Monitors regulatory changes across jurisdictions. Alerts affected engagements when regulations change mid-engagement |
| **Proposal Generator Agent** | Claude Sonnet 4.6 | Generates engagement proposals by combining templates, past proposals, pricing models, and team bios |
| **Deliverable Drafter Agent** | Claude Opus 4.6 | Writes first drafts of client reports, memos, and presentations using firm methodology and templates |
| **Quality Review Agent** | Claude Opus 4.6 | Reviews deliverables for accuracy, consistency with firm standards, and regulatory compliance |
| **Independence Check Agent** | Claude Sonnet 4.6 | Validates that engagement activities don't create independence conflicts (critical for audit clients) |
| **Training & Development Agent** | Claude Haiku 4.5 | Generates personalized learning paths based on employee skills gaps and upcoming engagement needs |
| **Client Communication Agent** | Claude Sonnet 4.6 | Drafts client communications, meeting summaries, and status updates in firm voice |
| **Data Analytics Agent** | Claude Sonnet 4.6 + Databricks | Performs data analytics on client financial data for audit procedures and advisory insights |
| **ESG Reporting Agent** | Claude Sonnet 4.6 | Assists with sustainability reporting against GRI, SASB, TCFD, and ISSB frameworks |
| **M&A Due Diligence Agent** | Claude Opus 4.6 | Analyzes target companies across financial, operational, legal, and market dimensions |
| **Forensic Analysis Agent** | Claude Opus 4.6 | Detects anomalies in financial data, transaction patterns, and communications for forensic investigations |
| **Multi-Language Agent** | Gemini 2.5 Pro | Translates deliverables and handles multilingual client communications across 40+ languages |
| **Hallucination Auditor** | Claude Sonnet 4.6 | Validates all regulatory citations, standard references, and precedent citations against canonical sources |

### Admiral Governance in Action

1. **Federation across regions (F4, CP5)** — Four regional orchestrators operate independently under different data residency laws (GDPR in EMEA, PIPL in China, APPI in Japan). The Global Orchestrator coordinates cross-region requests through Admiral's federation protocol. A German tax question about a US subsidiary routes through EMEA → Global → Americas, with data residency validated at each hop by Admiral's security hooks (S3). Client engagement data never leaves its region — only the query and the synthesized answer cross boundaries.

2. **Independence enforcement is non-negotiable** — For audit engagements, the Independence Check Agent must return exit code 0 before any specialist agent can access client data. Admiral's pre-tool-use hook intercepts every data access, checks the engagement type, and enforces independence rules. If the firm audits Company X, advisory agents cannot access Company X's data without independence clearance. This is a career-ending compliance violation if breached — no amount of "but the agent thought it was fine" matters to regulators.

3. **Engagement-level data isolation** — OPA policies enforced by Admiral's security layer (S3) ensure that agents working on Engagement A cannot access Engagement B's data, even if the same agent instance serves both. The injection detection system (S3 Layer 3) catches attempts to trick agents into retrieving data from other engagements via prompt manipulation.

4. **MCP server mesh for knowledge access** — Instead of giving agents direct database access to 40+ knowledge systems, each system exposes an MCP server with structured tools (search, retrieve, validate). Admiral validates MCP server availability at session start and monitors tool call patterns. If an MCP server goes down, the orchestrator reroutes to fallback knowledge sources rather than letting agents hallucinate answers.

5. **Cost governance at scale** — 400,000 potential users × multiple agent interactions/day = massive LLM spend. Admiral's model tier enforcement ensures that routine tasks (summarization, translation) use cost-efficient models (Haiku, GPT-4o-mini) while complex reasoning (tax analysis, due diligence) gets premium models (Opus). The Data Ecosystem (DE5) tracks cost-per-deliverable and identifies optimization opportunities through automated attribution loops.

6. **Hallucination is malpractice** — If the Tax Research Agent cites a tax code section that doesn't exist, and that advice reaches a client, the firm faces malpractice liability. The Hallucination Auditor validates every regulatory citation against canonical databases (IRC, IFRS, ISA). Admiral's Brain (B3) records every validated citation so subsequent queries can reuse verified references rather than regenerating them.

### Measured Outcomes

- Knowledge search time: 2.1 hours/day/person → 18 minutes (86% reduction)
- Proposal generation: 40 hours → 6 hours (85% reduction)
- Deliverable first-draft quality score: 62/100 → 84/100 (fewer revision cycles)
- Regulatory citation accuracy: 94% → 99.7% (Hallucination Auditor)
- Cross-practice knowledge reuse: 12% → 67%
- Annual productivity value: $2.1B estimated (across 400K professionals)
- Independence violations caught by Admiral: 23 in first quarter (zero reached client)

---

## Use Case 5: Energy Grid Optimization — Major Utility Company

**Company profile:** Top-5 US utility, $20B+ revenue, 11M+ customers, 50GW+ generation capacity across renewables, natural gas, and nuclear
**Admiral profile:** Governed (B3/F3/E2/CP3/S2/P2/DE3)
**Problem:** Integrating 15GW of intermittent renewable capacity (solar, wind) into the grid while maintaining 99.97% reliability. Legacy SCADA systems and manual dispatch processes cannot respond fast enough to renewable variability. NERC CIP compliance for all AI systems touching grid operations.

### Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **LLM Provider** | AWS Bedrock (Claude + Llama 3.3) | Bedrock for FedRAMP-authorized LLM access. Claude for complex optimization reasoning. Llama for latency-sensitive forecasting agents running on SageMaker endpoints |
| **Agent Framework** | LangGraph (Python) + custom C++ agents for real-time control | LangGraph for planning and analysis agents. Custom C++ for real-time dispatch agents that must meet <100ms response requirements for grid frequency regulation |
| **Orchestration** | AWS Step Functions + Amazon EventBridge | Step Functions for multi-step optimization workflows. EventBridge for event-driven triggers (weather changes, demand spikes, equipment trips) |
| **Data Platform** | AWS S3 + Apache Iceberg (lakehouse) + OSIsoft PI (real-time) | Iceberg tables for historical grid data (10+ years, petabyte scale). PI for real-time sensor data from 50,000+ grid monitoring points |
| **Weather Data** | Tomorrow.io API + NOAA GFS/HRRR models + internal met stations | Hyperlocal weather forecasting at solar/wind farm level. 15-minute resolution. Critical for renewable generation prediction |
| **Grid Modeling** | PSS/E (Siemens) + PowerWorld + custom Python power flow solvers | Industry-standard power system simulation. Agents propose dispatch changes; simulations validate grid stability before execution |
| **Compliance** | NERC CIP compliance platform + internal audit system | All AI systems accessing bulk electric system data must meet NERC CIP-003 through CIP-014. Admiral's audit trail maps to NERC evidence requirements |
| **Observability** | AWS CloudWatch + Admiral Control Plane (CP3) + PI Vision (real-time grid dashboards) | CloudWatch for infrastructure. Admiral CP3 for agent governance. PI Vision for real-time grid state visualization |
| **Edge Compute** | AWS Wavelength + NVIDIA Jetson (substation-level) | Wavelength for 5G-edge inference at substations. Jetson for local equipment monitoring agents |
| **Security** | AWS GovCloud + NERC CIP network segmentation + Admiral S2 | GovCloud for FISMA compliance. Network segmentation per NERC CIP-005. Admiral's deterministic security analysis (S2 Layer 3) for LLM-specific threats |

### Agent Fleet (12 agents)

| Agent | Model | Role | Safety Level |
|---|---|---|---|
| **Demand Forecast Agent** | Llama 3.3 70B (SageMaker) | 15-minute to 7-day demand forecasting using weather, calendar, economic, and historical data | Advisory — forecast only |
| **Renewable Generation Forecast Agent** | Llama 3.3 70B (SageMaker) | Solar irradiance and wind speed to generation output prediction per farm | Advisory — forecast only |
| **Economic Dispatch Agent** | Claude Opus 4.6 | Optimizes generator dispatch to minimize cost while meeting demand, reserves, and emission constraints | Tier 2 — proposes dispatch schedule, requires validation |
| **Unit Commitment Agent** | Claude Opus 4.6 | Day-ahead and real-time unit commitment decisions (which generators to start/stop) | Tier 2 — proposes commitments, requires human approval for nuclear/large thermal units |
| **Renewable Curtailment Agent** | Claude Sonnet 4.6 | Determines when renewable generation must be curtailed for grid stability | Tier 2 — can auto-curtail solar/wind, nuclear curtailment requires human |
| **Battery Storage Optimization Agent** | Claude Sonnet 4.6 | Charge/discharge scheduling for 5GW of battery storage based on price signals, demand forecast, and grid needs | Tier 2 — operates within pre-set charge/discharge limits |
| **Transmission Congestion Agent** | Claude Sonnet 4.6 | Identifies and resolves transmission congestion through re-dispatch and topology changes | Tier 3 — topology changes require operator approval |
| **Equipment Health Agent** | Claude Haiku 4.5 | Monitors transformer, breaker, and line sensor data for anomalies indicating impending failure | Advisory — generates alerts and work orders only |
| **NERC Compliance Agent** | Claude Sonnet 4.6 | Validates all dispatch decisions against NERC reliability standards and generates compliance evidence | Governance agent — can veto dispatch changes that violate standards |
| **Emissions Tracking Agent** | Claude Haiku 4.5 | Calculates real-time emissions per MWh by fuel source, tracks against EPA and state targets | Advisory + reporting |
| **QA Agent** | Claude Sonnet 4.6 | Validates forecast accuracy, dispatch optimality, and agent decision quality | Review agent — no operational authority |
| **Orchestrator** | Claude Opus 4.6 | Coordinates the generation-to-dispatch pipeline, manages inter-agent handoffs and escalations | Full Standing Orders, safety-critical mode |

### Admiral Governance in Action

1. **Safety-critical enforcement** — Grid operations are life-safety critical. A bad dispatch decision can cause cascading blackouts affecting millions. Admiral's enforcement (E2) operates in safety-critical mode: the NERC Compliance Agent has hard veto authority via pre-tool-use hooks. No dispatch change executes without NERC validation returning exit code 0. This is not advisory — it is a physical interlock implemented in software.

2. **Nuclear unit protection** — Nuclear generators have specific ramp rate and minimum runtime constraints. Admiral's enforcement hooks validate that no agent can propose a nuclear unit commitment change without human operator approval. The Unit Commitment Agent's tool call is inspected by the hook; if the payload contains a nuclear unit ID, the hook blocks with exit code 2 and escalates to the control room.

3. **Forecast accountability** — Admiral's Data Ecosystem (DE3) tracks forecast accuracy by agent over time. The Demand Forecast Agent's predictions are compared against actuals every 15 minutes. Persistent accuracy degradation triggers automated retraining alerts. This creates a feedback loop that human forecasters never had — every prediction is scored, and the scoring is automated.

4. **Cost governance on optimization** — The Economic Dispatch Agent runs complex optimization that can consume significant LLM tokens. Admiral's token budget ensures the agent doesn't spend $500 optimizing a dispatch decision that saves $200. The budget gate enforces a per-optimization-run ceiling tied to the expected value of the optimization.

5. **NERC CIP audit trail** — NERC auditors require evidence that AI systems accessing bulk electric system (BES) cyber assets comply with CIP standards. Admiral's event log provides a complete, immutable record of every agent action, the data it accessed, the decisions it made, and the governance hooks that validated those decisions. This maps directly to NERC CIP-003-8 R2 (cyber security plans for BES cyber assets).

### Measured Outcomes

- Renewable curtailment: 8.2% → 2.1% (saving $180M/year in wasted clean energy)
- Dispatch cost optimization: $45M/year savings through better unit commitment
- Demand forecast accuracy (MAPE): 3.8% → 1.9%
- NERC compliance audit time: 6 weeks → 2 weeks (automated evidence generation)
- Grid reliability: 99.97% → 99.993%
- Agent-proposed dispatch changes vetoed by NERC Compliance Agent: 89 in first year (all legitimate safety catches)

---

## Cross-Cutting Technology Patterns

These five use cases reveal consistent patterns in how enterprises deploy AI agent fleets with Admiral governance:

### 1. Multi-Model Strategy Is Universal
No enterprise uses a single LLM provider. Every use case deploys 2-3 providers, routing by task characteristics:
- **High-reasoning tasks** → Claude Opus 4.6 (complex analysis, report generation, root cause analysis)
- **Validation and review** → Claude Sonnet 4.6 (strong enough for quality gates, cost-efficient at volume)
- **High-volume, low-complexity** → Claude Haiku 4.5 or GPT-4o-mini (sentiment, classification, logging)
- **Latency-critical or data-sovereign** → Self-hosted Llama 3.3 (trading signals, edge inference, regulated data)
- **Multimodal (vision + language)** → Gemini 2.5 Pro (manufacturing inspection, document understanding)

Admiral's model tier enforcement hooks ensure agents use their assigned model tier. Without this, agents default to the most capable (expensive) model available.

### 2. MCP Is the Integration Standard
Model Context Protocol has become the standard for connecting agents to enterprise systems. Rather than giving agents raw database access, enterprises expose knowledge systems, APIs, and tools as MCP servers with structured interfaces. This provides:
- Controlled access surface (agents call tools, not raw SQL)
- Audit trail at the tool level (which agent called which MCP tool, when)
- Hot-swappable backends (replace the MCP server implementation without changing agent code)

### 3. Edge + Cloud Is the Deployment Reality
Manufacturing, energy, and healthcare all require edge deployment for latency and data residency. The pattern is consistent:
- **Edge agents** handle real-time decisions (inspection, hold/release, grid frequency)
- **Cloud agents** handle complex reasoning (root cause analysis, optimization, compliance)
- Admiral governs both through the same hook infrastructure, with budget isolation preventing edge agents from consuming cloud capacity

### 4. Deterministic Enforcement Beats Advisory Guidance in Regulated Industries
Every regulated use case (healthcare, finance, energy, professional services) demonstrates the same finding: advisory instructions to agents ("try to stay compliant") fail under production pressure. Admiral's deterministic hooks — exit code 2 blocks the tool call, period — are what make these deployments auditable and insurable. Regulators don't accept "we told the AI to follow the rules." They accept "the AI physically cannot violate the rules because the enforcement layer blocks the action before it executes."

### 5. The Brain Enables Institutional Memory
Across all use cases, Admiral's Brain component (B2/B3) provides what agents fundamentally lack: memory across sessions. The health insurer's claims precedents, the bank's regulatory interpretations, the manufacturer's defect patterns, the consultancy's verified citations, the utility's forecast accuracy history — all stored in the Brain and queryable by agents in future sessions. This is the difference between an agent that starts from zero every session and one that builds on organizational knowledge.

---

## Admiral Profile Selection Guide

| Your Situation | Recommended Profile | Why |
|---|---|---|
| Single team, one product, <5 agents | **Starter** (B1/F1/E1/CP1/S1/P1/DE1) | Hooks + Standing Orders cover governance. No multi-agent coordination overhead |
| Engineering org, 5-11 agents, multiple repos | **Team** (B2/F2/E1/CP2/S1/P2/DE2) | Need semantic Brain search, fleet dashboard, structured handoffs |
| Regulated industry, audit requirements | **Governed** (B3/F3/E2/CP3/S2/P2/DE3) | Full audit trail, extended enforcement, governance agents, automated compliance evidence |
| Mission-critical, 24/7 operations, multiple teams | **Production** (B3/F3/E3/CP4/S2/P3/DE4) | Heartbeat monitoring, trend analysis, cost forecasting, full protocol automation |
| Global enterprise, multiple fleets, federation | **Enterprise** (B3/F4/E3/CP5/S3/P3/DE5) | Multi-orchestrator, cross-fleet coordination, federation dashboard, zero-trust identity |
