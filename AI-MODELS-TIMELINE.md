# Comprehensive Timeline of Major AI Models (2020 – February 2026)

> Reverse chronological listing of known AI models available to public and private sectors, including major LLMs, open-source models, image generation models, and coding-specific models. Covers key specs, training data, improvements, benchmarks, builders, and data center locations.

---

## February 2026

### OpenAI GPT-5.3-Codex-Spark
- **Released:** February 12, 2026
- **Builder:** OpenAI
- **Type:** Distilled coding-specific LLM (research preview)
- **Parameters:** Distilled variant of Codex 5.3 (undisclosed)
- **Context Window:** 128K tokens
- **Key Innovations:** Cerebras Wafer Scale Engine 3-powered inference at 1,000+ tokens/sec (15x standard Codex 5.3); per-roundtrip overhead dropped 80%, per-token overhead fell 30%, time-to-first-token cut in half
- **Benchmarks:** Terminal-Bench 2.0: 58.4% | SWE-Bench Pro: ~16 pts below full Codex 5.3 | Matches Codex 5.3 accuracy in 2-3 min vs 15-17 min
- **Training Data:** Distilled from GPT-5.3-Codex (undisclosed specifics)
- **Data Centers:** OpenAI Stargate (Abilene, TX) + Cerebras partnership infrastructure; Microsoft Azure Fairwater sites (Wisconsin, Georgia, Arizona)
- **Availability:** ChatGPT Pro subscribers

### Anthropic Claude Opus 4.6
- **Released:** February 5, 2026
- **Builder:** Anthropic
- **Type:** Frontier multimodal LLM
- **Parameters:** Undisclosed
- **Context Window:** 200K+ tokens
- **Key Innovations:** Enhanced agentic coding, tool use, and long-running autonomous task capabilities; Constitutional AI safety framework
- **Training Data:** Web data, books, code, academic sources (specifics undisclosed); trained using Constitutional AI with RLHF
- **Data Centers:** AWS (primary — Project Rainier in Indiana/Pennsylvania/Mississippi, 500K+ Trainium2 chips); Google Cloud TPUs (up to 1M chips); Microsoft Azure ($30B commitment); own data centers planned in Texas and New York ($50B infrastructure plan)
- **Availability:** API, Claude.ai, Amazon Bedrock, Google Vertex AI

### Anthropic Claude Sonnet 4.6
- **Released:** February 17, 2026
- **Builder:** Anthropic
- **Type:** Mid-tier multimodal LLM
- **Key Innovations:** Priced same as Sonnet 4.5 with improved performance
- **Data Centers:** Same as Opus 4.6

### OpenAI GPT-5.3-Codex
- **Released:** February 5, 2026
- **Builder:** OpenAI
- **Type:** Frontier coding/agentic LLM
- **Key Innovations:** Designed to work autonomously for minutes or hours on complex programming tasks; native git operations, data analysis, and broad agentic capabilities
- **Benchmarks:** Terminal-Bench 2.0: 77.3% | SWE-Bench Pro: top tier
- **Training Data:** Undisclosed (likely similar to GPT-5 series with code-heavy emphasis)
- **Data Centers:** Microsoft Azure Fairwater sites + Stargate

### OpenAI GPT-5.2
- **Released:** Early 2026
- **Builder:** OpenAI
- **Type:** Frontier multimodal LLM
- **Parameters:** Undisclosed
- **Context Window:** 400K tokens (up from 128K in GPT-4)
- **Key Innovations:** AIME 2025: 100% score; hallucination rate reduced to 6.2% (~40% reduction from earlier generations)
- **Open-weight variants:** GPT-oss-120B and GPT-oss-20B released alongside
- **Data Centers:** Microsoft Azure + Stargate infrastructure

### Zhipu AI GLM-4.7
- **Released:** Early 2026
- **Builder:** Zhipu AI (China)
- **Type:** Frontier foundation model
- **Context Window:** 200K input / 128K output
- **Architecture:** MoE (Mixture of Experts)
- **Key Innovations:** "Vibe Coding" capabilities; massive output capacity
- **Data Centers:** China (Beijing and other domestic locations)

### NVIDIA Nemotron 3 Nano
- **Released:** Early 2026
- **Builder:** NVIDIA
- **Type:** Open-weight hybrid Mamba-Transformer MoE
- **Context Window:** 1M tokens
- **Key Innovations:** Hybrid Mamba-Transformer architecture; 4x faster inference; open weights
- **Data Centers:** NVIDIA DGX Cloud infrastructure

### Alibaba Qwen3-Max-Thinking
- **Released:** January 27, 2026
- **Builder:** Alibaba Cloud (Qwen Team)
- **Type:** Reasoning-enhanced LLM
- **Key Innovations:** Enhanced chain-of-thought reasoning on top of Qwen3-Max
- **Training Data:** Extended from Qwen3 training (36T+ tokens, 119 languages)
- **Data Centers:** Alibaba Cloud — Beijing (mainland China), Singapore (international); new facilities planned in Brazil, France, Netherlands, Mexico, Japan, South Korea, Malaysia, Dubai

---

## Late 2025 (October – December)

### Mistral Large 3 & Ministral 3
- **Released:** December 2025
- **Builder:** Mistral AI (Paris, France)
- **Type:** Open-weight sparse MoE (Large 3) + dense models (Ministral 3)
- **Parameters:** Large 3: 675B total / 41B active | Ministral 3: 3B, 7B, 14B dense
- **Architecture:** Sparse MoE (based on DeepSeek V3 architecture)
- **Key Innovations:** First Mistral model using DeepSeek V3 architecture
- **Training Data:** Undisclosed (web, code, books, multilingual data)
- **Data Centers:** Mistral Compute — 18,000 NVIDIA Grace Blackwell Superchips in 40MW facility in Essonne (outside Paris, France); Eclairion facility in Bruyeres-le-Chatel

### DeepSeek V3.2 / V3.2-Speciale
- **Released:** December 2025
- **Builder:** DeepSeek (Hangzhou, China)
- **Type:** Open-weight MoE reasoning model
- **Parameters:** 671B total / 37B active
- **Key Innovations:** Gold-level results on IMO, CMO, ICPC World Finals, IOI 2025; new massive agent training data synthesis (1,800+ environments, 85K+ complex instructions); first DeepSeek model integrating thinking into tool-use; Fine-Grained Sparse Attention improving compute efficiency by 50%
- **Data Centers:** Hangzhou (China); underwater data center off Hainan Island; desert data centers in Xinjiang; Southeast Asian facilities via partnerships; available on AWS, Google Cloud, Azure

### xAI Grok 4.1
- **Released:** November 2025
- **Builder:** xAI (Elon Musk)
- **Type:** Proprietary frontier LLM
- **Key Innovations:** #1 on LMArena Elo ranking (1483 Elo); hallucination rate dropped from ~12% (Grok 4) to ~4%
- **Benchmarks:** Top reasoning scores across multiple leaderboards
- **Data Centers:** Colossus — Memphis, Tennessee (200,000+ GPUs, expanding to 1M); 3 data center facilities total

### Google Gemini 3 Pro
- **Released:** November 18, 2025
- **Builder:** Google DeepMind
- **Type:** Frontier multimodal model (text, code, image, audio, video)
- **Context Window:** 1M tokens
- **Key Innovations:** "Reasoning-first" architecture; 50%+ improvement over Gemini 2.5 Pro in solved benchmark tasks; 35% higher accuracy in software engineering challenges
- **Benchmarks:** LMArena: 1501 Elo (top global) | Humanity's Last Exam: 37.5% | SWE-bench Verified: 76.2% | Terminal-Bench 2.0: 54.2%
- **Training Data:** Undisclosed (Google's web index, Google Books, YouTube transcripts, scholarly content, code); trained on custom TPUs (Trillium 6th-gen)
- **Data Centers:** Google Cloud — multiple data centers globally; TPU clusters across North America, Europe, Asia; trained across multiple sites simultaneously
- **Image Generation:** Nano Banana Pro — viral photorealistic image generation, attracted 10M+ new Gemini users

### Anthropic Claude Opus 4.5
- **Released:** November 2025
- **Builder:** Anthropic
- **Type:** Frontier multimodal LLM
- **Context Window:** 200K+ tokens
- **Key Innovations:** Enhanced long-running agentic capabilities; Constitutional AI refinements
- **Data Centers:** AWS (primary), Google Cloud, Microsoft Azure

### Anthropic Claude Haiku 4.5
- **Released:** October 2025
- **Builder:** Anthropic
- **Type:** Fast, lightweight LLM
- **Key Innovations:** Cost-efficient model for high-throughput applications

### Anthropic Claude Sonnet 4.5
- **Released:** September 2025
- **Builder:** Anthropic
- **Type:** Mid-tier balanced LLM
- **Key Innovations:** Best balance of speed, intelligence, and cost in the Claude family

---

## Mid 2025 (May – September)

### Alibaba Qwen3 Family
- **Released:** April 28 – September 2025
- **Builder:** Alibaba Cloud (Qwen Team)
- **Type:** Open-source (Apache 2.0) dense + MoE models
- **Parameters:** Dense: 0.6B–32B | MoE: 30B/3B active, 235B/22B active
- **Context Window:** Up to 1M tokens (Qwen3-2507)
- **Training Data:** 36 trillion tokens, 119 languages
- **Key Innovations:** Hybrid thinking mode; surpassed Meta Llama in open-weight community popularity; 300M+ downloads, 100K+ derivative models on HuggingFace
- **Variants:** Qwen3-Max (1T+ params, Sep 2025), Qwen3-Omni (multimodal: text/image/audio/video, Sep 2025), Qwen3-Coder
- **Data Centers:** Alibaba Cloud — Beijing (China), Singapore (international)

### OpenAI GPT-5
- **Released:** August 7, 2025
- **Builder:** OpenAI
- **Type:** Frontier multimodal LLM (text, vision, audio)
- **Parameters:** Undisclosed (estimated 30T+ training tokens based on comparable models)
- **Key Innovations:** Adaptive memory; real-time workflow integration; multimodal (text/image/audio) native; heavy data filtering for safety
- **Training Data:** Internet text, licensed third-party data, human-generated content, image-text pairs, audio transcripts; known partnerships: Time Inc., Le Monde, AP, Financial Times, Axel Springer, Khan Academy, Wikipedia; estimated 27+ datasets totaling ~70T tokens post-filtering
- **Data Centers:** Microsoft Azure Fairwater sites (Wisconsin, Georgia, Arizona); Stargate (Abilene, TX — 1.2GW); Oracle Cloud Infrastructure
- **Availability:** ChatGPT Plus/Pro, API

### xAI Grok 4
- **Released:** July 2025
- **Builder:** xAI
- **Type:** Proprietary frontier LLM
- **Parameters:** Undisclosed
- **Key Innovations:** Described as "the most intelligent model in the world" at launch; native tool use and real-time search; SuperGrok Heavy tier ($300/mo)
- **Data Centers:** Colossus — Memphis, TN (200K GPUs by end of 2024)

### Mistral Medium 3, Magistral, Voxtral, Devstral
- **Released:** May – July 2025
- **Builder:** Mistral AI (Paris, France)
- **Type:** Various (general purpose, reasoning, audio, coding)
- **Key Innovations:** Magistral: first Mistral reasoning models with chain-of-thought | Voxtral: first open-source audio model | Devstral: coding-specific models
- **Data Centers:** Mistral Compute (Essonne, France)

### Google Gemini 2.5 Pro (Production) & Gemini 2.5 Flash
- **Released:** March – June 2025
- **Builder:** Google DeepMind
- **Type:** Frontier multimodal model
- **Context Window:** 1M tokens
- **Key Innovations:** "Thinking model" with adjustable reasoning levels; Deep Think mode for extended reasoning; trained on Trillium TPUs (6th-gen)
- **Benchmarks:** #1 on LMArena at launch | AIME 2025: top | GPQA: state-of-the-art | SWE-bench: competitive | USAMO 2025: high scores with Deep Think
- **Data Centers:** Google Cloud — multi-site TPU clusters (North America, Europe, Asia)

### Anthropic Claude 4 Opus & Sonnet
- **Released:** May 2025
- **Builder:** Anthropic
- **Type:** Frontier multimodal LLMs
- **Context Window:** 200K+ tokens
- **Key Innovations:** Code execution, agentic tool use, Files API; Constitutional AI
- **Data Centers:** AWS Project Rainier (primary), Google Cloud, Azure

### Meta Llama 4 (Scout, Maverick, Behemoth)
- **Released:** April 2025
- **Builder:** Meta
- **Type:** Open-weight multimodal MoE (text + image input, text output)
- **Parameters:** Scout: 109B total / 17B active (16 experts) | Maverick: 400B total / 17B active (128 experts) | Behemoth: ~2T total / 288B active (announced, not released)
- **Context Window:** Scout: 10M tokens | Maverick: 1M tokens
- **Languages:** 12 languages
- **Key Innovations:** First Llama with MoE architecture; massive context windows; however, fell out of favor in open-weight community with Qwen overtaking it
- **Training Data:** Undisclosed (similar sources to Llama 3: web data, code, books, academic papers; Meta does not disclose training data composition)
- **Data Centers:** Meta's own data centers (multiple US locations); models available on AWS, Azure, Google Cloud, Oracle, NVIDIA, and many others

### Microsoft Phi-4 Reasoning Series
- **Released:** Mid 2025
- **Builder:** Microsoft Research
- **Type:** Open-source small reasoning models
- **Key Innovations:** Incorporated reasoning capabilities into small models; high quality despite compact size; heavy use of synthetic "textbook quality" training data
- **Data Centers:** Microsoft Azure

### Google Gemma 3n
- **Released:** Mid 2025
- **Builder:** Google DeepMind
- **Type:** Open-source on-device model
- **Key Innovations:** Multi-modal capabilities for on-device use; trained on same resources as Gemini
- **Data Centers:** Google Cloud TPU infrastructure

---

## Early 2025 (January – April)

### DeepSeek R1
- **Released:** January 20, 2025
- **Builder:** DeepSeek (Hangzhou, China)
- **Type:** Open-weight reasoning model
- **Parameters:** 671B total / 37B active (same base as V3)
- **Key Innovations:** Comparable to OpenAI o1 at fraction of cost; trained via large-scale RL without SFT as preliminary step (R1-Zero variant); distilled versions (1.5B–70B) outperformed o1-mini; open weights enabled global research community to study RLVR
- **Benchmarks:** Matched OpenAI o1 on math, code, and reasoning tasks; R1-Distill-Qwen-32B outperformed o1-mini across multiple benchmarks
- **Training Data:** Built on DeepSeek-V3-Base; cold-start data + reinforcement learning
- **Data Centers:** Hangzhou, China; Hainan underwater DC; Xinjiang desert DCs

### Anthropic Claude 3.7 Sonnet
- **Released:** February 2025
- **Builder:** Anthropic
- **Type:** Mid-tier multimodal LLM with extended thinking
- **Key Innovations:** First Claude model with extended thinking/reasoning capabilities
- **Data Centers:** AWS, Google Cloud

### OpenAI GPT-4.5
- **Released:** February 27, 2025
- **Builder:** OpenAI
- **Type:** Frontier LLM (research preview)
- **Key Innovations:** Largest pre-trained model at time of release; improved EQ and creative writing; reduced hallucinations
- **Data Centers:** Microsoft Azure

### xAI Grok 3
- **Released:** February 17, 2025
- **Builder:** xAI
- **Type:** Proprietary frontier LLM with reasoning
- **Parameters:** ~3 trillion (MoE)
- **Key Innovations:** Reflection feature for self-correction; massive scale
- **Data Centers:** Colossus — Memphis, TN (100K+ GPUs by this point)

### OpenAI o3-mini
- **Released:** January 2025
- **Builder:** OpenAI
- **Type:** Cost-efficient reasoning model
- **Key Innovations:** Three adjustable reasoning effort levels; optimized for coding, math, science; structured outputs and function calling
- **Data Centers:** Microsoft Azure

### Mistral Small 3 / 3.1
- **Released:** January – March 2025
- **Builder:** Mistral AI
- **Type:** Open-source (Apache 2.0) compact LLM
- **Parameters:** 24B
- **Key Innovations:** Matched Llama 3.3 70B performance using ~1/3 the memory
- **Data Centers:** Mistral infrastructure (France)

---

## Late 2024 (September – December)

### DeepSeek V3
- **Released:** December 25, 2024
- **Builder:** DeepSeek (Hangzhou, China)
- **Type:** Open-weight MoE LLM
- **Parameters:** 671B total / 37B active
- **Training Data:** 14.8 trillion diverse, high-quality tokens + SFT + RL stages
- **Training Cost:** Only 2.788M H800 GPU hours (~$5.6M estimated)
- **Key Innovations:** Auxiliary-loss-free load balancing; Multi-Token Prediction (MTP); FP8 mixed precision training validated at extreme scale for first time; Multi-head Latent Attention (MLA)
- **Benchmarks:** Outperformed all open-source models; competitive with GPT-4o and Claude 3.5 Sonnet; SOTA on math benchmarks among non-long-CoT models; outperformed o1-preview on MATH-500
- **Data Centers:** Hangzhou, China; trained on H800 GPUs (export-restricted variant)

### Google Gemini 2.0 Flash
- **Released:** December 11, 2024
- **Builder:** Google DeepMind
- **Type:** Experimental multimodal model
- **Key Innovations:** Trained on Trillium TPUs (6th-gen); optimized for speed
- **Data Centers:** Google Cloud multi-site

### Meta Llama 3.3
- **Released:** December 2024
- **Builder:** Meta
- **Type:** Open-weight LLM
- **Parameters:** 70B
- **Context Window:** 128K tokens
- **Languages:** 8 languages
- **Key Innovations:** First GPT-4-class model runnable on a 64GB MacBook Pro; similar performance to Llama 3.1 405B at fraction of serving cost
- **Training Data:** Similar to Llama 3.1 (15T+ tokens of web, code, books, multilingual data)

### Alibaba QwQ-32B-Preview
- **Released:** November 2024
- **Builder:** Alibaba Cloud
- **Type:** Open-source (Apache 2.0) reasoning model
- **Parameters:** 32B
- **Key Innovations:** Reasoning capabilities rivaling OpenAI o1-preview; competitive on AIME and MATH benchmarks

### DeepSeek R1-Lite-Preview
- **Released:** Late 2024
- **Builder:** DeepSeek
- **Type:** Reasoning model preview
- **Key Innovations:** Matched o1-preview on AIME and MATH benchmarks

### Anthropic Claude 3.5 Sonnet (Upgraded) & Claude 3.5 Haiku
- **Released:** October 22, 2024
- **Builder:** Anthropic
- **Type:** Mid-tier multimodal LLMs
- **Key Innovations:** Computer use capability (interpreting screens, simulating keyboard/mouse); upgraded Sonnet outperformed original across benchmarks
- **Training Data:** Undisclosed (web, code, books, academic content; Constitutional AI with RLHF)
- **Data Centers:** AWS, Google Cloud

### OpenAI o1 (Full Release) & o1-preview
- **Released:** September 12, 2024
- **Builder:** OpenAI
- **Type:** Reasoning model (first RLVR model)
- **Key Innovations:** "Can reason like a human" — step-by-step analysis before producing answers; launched the reasoning model paradigm; IMO qualifying: 83% (vs 13% for GPT-4o)
- **Benchmarks:** AIME: 83% | Massive improvement over GPT-4o on math/science reasoning
- **Data Centers:** Microsoft Azure

### Alibaba Qwen2.5 Series
- **Released:** September 2024
- **Builder:** Alibaba Cloud (Qwen Team)
- **Type:** Open-source LLM family
- **Parameters:** 7B to 72B
- **Training Data:** Up to 18 trillion tokens
- **Key Innovations:** Qwen2.5-Coder-32B matched leading proprietary models in coding
- **Data Centers:** Alibaba Cloud (Beijing, Singapore)

### Meta Llama 3.2
- **Released:** September 2024
- **Builder:** Meta
- **Type:** Open-weight multimodal LLMs
- **Parameters:** 1B, 3B (text-only edge) | 11B, 90B (vision-capable)
- **Key Innovations:** First Llama with multimodal vision; 1B/3B models tailored for edge devices
- **Training Data:** Similar web/code/book sources as Llama 3

---

## Mid 2024 (May – August)

### xAI Grok-2
- **Released:** August 14, 2024
- **Builder:** xAI
- **Type:** Proprietary multimodal LLM
- **Key Innovations:** First Grok with image generation (later via Aurora model, Dec 2024)
- **Data Centers:** Colossus — Memphis, TN (65K GPUs expanding to 100K)

### OpenAI GPT-4o mini
- **Released:** July 2024
- **Builder:** OpenAI
- **Type:** Cost-efficient small model
- **Key Innovations:** Surpassed GPT-3.5 Turbo on academic benchmarks; multimodal reasoning; most cost-effective model in lineup
- **Data Centers:** Microsoft Azure

### Meta Llama 3.1
- **Released:** July 23, 2024
- **Builder:** Meta
- **Type:** Open-weight LLM
- **Parameters:** 8B, 70B, 405B
- **Context Window:** 128K tokens
- **Languages:** 8 languages
- **Training Data:** 15T+ tokens (web data, code, books, multilingual)
- **Key Innovations:** First frontier-level open-source AI model (405B); 10x usage growth Jan–Jul 2024

### Mistral NeMo
- **Released:** July 2024
- **Builder:** Mistral AI + NVIDIA
- **Type:** Open-source LLM
- **Key Innovations:** Co-built with NVIDIA

### Alibaba Qwen2
- **Released:** June 2024
- **Builder:** Alibaba Cloud
- **Type:** Open-weight LLM family
- **Key Innovations:** Qwen2-72B ranked behind GPT-4o and Claude 3.5 Sonnet but ahead of all other Chinese models on SuperCLUE

### Anthropic Claude 3.5 Sonnet
- **Released:** June 20, 2024
- **Builder:** Anthropic
- **Type:** Mid-tier multimodal LLM
- **Key Innovations:** Outperformed the larger Claude 3 Opus on Anthropic's own benchmarks
- **Data Centers:** AWS, Google Cloud

### OpenAI GPT-4o
- **Released:** May 13, 2024
- **Builder:** OpenAI
- **Type:** Frontier multimodal LLM
- **Key Innovations:** Integrated multimodal intelligence (text + image + audio native); enhanced features available to free users; move toward omni-modal comprehension
- **Training Data:** Undisclosed (internet text, licensed data, multimodal pairs)
- **Data Centers:** Microsoft Azure (Iowa, Arizona clusters)

### Google Gemini 1.5 Flash
- **Released:** May 14, 2024 (I/O keynote)
- **Builder:** Google DeepMind
- **Type:** Fast, efficient multimodal model
- **Context Window:** 1M tokens
- **Data Centers:** Google Cloud (TPU v5e)

---

## Early 2024 (January – April)

### Meta Llama 3
- **Released:** April 2024
- **Builder:** Meta
- **Type:** Open-weight LLM
- **Parameters:** 8B, 70B (with instruction-tuned variants)
- **Key Innovations:** Accompanied by Meta AI assistant built on Llama
- **Training Data:** Web, code, books (specifics undisclosed)

### Anthropic Claude 3 (Haiku, Sonnet, Opus)
- **Released:** March 4, 2024
- **Builder:** Anthropic
- **Type:** Frontier multimodal LLM family (three tiers)
- **Context Window:** 200K tokens
- **Key Innovations:** First Claude family with tiered models (speed/cost/capability tradeoffs); Constitutional AI; strong on coding and analysis
- **Training Data:** Web data, books, code, academic content (undisclosed specifics); Constitutional AI with RLHF
- **Data Centers:** AWS (primary), Google Cloud

### xAI Grok-1.5 & Grok-1.5 Vision
- **Released:** March – April 2024
- **Builder:** xAI
- **Type:** Proprietary LLM
- **Parameters:** Based on Grok-1 (314B MoE)
- **Context Window:** 128K tokens
- **Key Innovations:** Improved reasoning; first Grok with vision capabilities

### xAI Grok-1 Open Source
- **Released:** March 17, 2024
- **Builder:** xAI
- **Type:** Open-source MoE LLM
- **Parameters:** 314B (MoE)
- **Key Innovations:** One of the largest open-source models at time of release

### Google Gemini 1.5 Pro
- **Released:** February 2024 (limited)
- **Builder:** Google DeepMind
- **Type:** Frontier multimodal model
- **Context Window:** 1M tokens
- **Architecture:** Mixture of Experts
- **Key Innovations:** 1M token context (largest at the time); MoE architecture; outperformed Gemini 1.0 Ultra
- **Data Centers:** Google Cloud multi-site TPU clusters

### Google Gemini Ultra (Full Release) / Gemini Rebrand
- **Released:** February 8, 2024
- **Builder:** Google DeepMind
- **Type:** Frontier multimodal model
- **Key Innovations:** Bard and Duet AI unified under Gemini brand; mobile app launched
- **Training Data:** Trained on custom TPUs across multiple data centers; exact data undisclosed but includes Google's web index, books, scholarly content

### Mistral Mixtral 8x7B
- **Released:** December 2023 (widely available early 2024)
- **Builder:** Mistral AI
- **Type:** Open-weight MoE LLM
- **Parameters:** 8x7B (MoE)
- **Key Innovations:** Balanced high performance with efficiency through MoE architecture

---

## Late 2023 (September – December)

### Google Gemini 1.0 (Ultra, Pro, Nano)
- **Released:** December 6, 2023
- **Builder:** Google DeepMind
- **Type:** Multimodal LLM family
- **Key Innovations:** First natively multimodal Google model (text, image, audio, video, code); three tiers for different use cases; Nano designed for on-device
- **Training Data:** Undisclosed; trained on TPU v4 fleet across multiple data centers
- **Data Centers:** Google Cloud — multiple sites, multiple clusters per site; custom TPU v4 hardware

### OpenAI GPT-4 Turbo
- **Released:** November 2023
- **Builder:** OpenAI
- **Type:** Frontier LLM (optimized)
- **Context Window:** 128K tokens
- **Key Innovations:** 3x cheaper than GPT-4; 128K context; GPT-4 Turbo with Vision variant
- **Data Centers:** Microsoft Azure (Iowa, Arizona)

### xAI Grok-1
- **Released:** November 4, 2023
- **Builder:** xAI (Elon Musk)
- **Type:** Proprietary MoE LLM
- **Parameters:** 314B (MoE)
- **Key Innovations:** Integrated with X (Twitter); real-time information access; "rebellious" personality
- **Data Centers:** Early xAI infrastructure (pre-Colossus)

### Anthropic Claude 2.1
- **Released:** November 2023
- **Builder:** Anthropic
- **Type:** Multimodal LLM
- **Context Window:** 200K tokens
- **Key Innovations:** 200K context window; ~2x reduction in hallucinations; beta tool use (API calls, web search)
- **Data Centers:** AWS

### Mistral 7B
- **Released:** September 2023
- **Builder:** Mistral AI (Paris, France)
- **Type:** Open-source compact LLM
- **Parameters:** 7B
- **Key Innovations:** Outperformed all open models up to 13B parameters; Mistral AI's debut model; Apache 2.0 license

### Alibaba Qwen (Initial Series)
- **Released:** August – November 2023
- **Builder:** Alibaba Cloud
- **Type:** Open-source LLM family
- **Parameters:** 1.8B, 7B, 14B, 72B
- **Training Data:** 3T tokens (Qwen-72B), 32K context
- **Data Centers:** Alibaba Cloud (China)

---

## Mid 2023 (May – August)

### Meta LLaMA 2
- **Released:** July 18, 2023
- **Builder:** Meta
- **Type:** Open-weight LLM (commercial use permitted)
- **Parameters:** 7B, 13B, 70B + Chat variants
- **Training Data:** 2.4 trillion tokens of carefully curated data (web, code, books)
- **Key Innovations:** First Llama allowing commercial use; LLaMA-2-Chat fine-tuned for dialogue; became "the open standard for academic research"
- **Data Centers:** Meta's own data centers (US)

### Anthropic Claude 2
- **Released:** July 2023
- **Builder:** Anthropic
- **Type:** Multimodal LLM
- **Key Innovations:** First Anthropic model available to general public; improved coding, math, reasoning over Claude 1
- **Data Centers:** AWS

### Google PaLM 2
- **Released:** May 2023 (I/O keynote)
- **Builder:** Google
- **Type:** Frontier LLM
- **Key Innovations:** Improved coding, multilingual capabilities, enhanced reasoning; powered Bard; predecessor to Gemini
- **Data Centers:** Google Cloud TPU infrastructure

---

## Early 2023 (January – April)

### OpenAI GPT-4
- **Released:** March 14, 2023
- **Builder:** OpenAI
- **Type:** Frontier multimodal LLM (text + image input)
- **Parameters:** Estimated 1–1.8 trillion (MoE, unconfirmed); trained on ~13T tokens
- **Training Cost:** >$100 million (per Sam Altman)
- **Training Data:** Mix of publicly available internet text and licensed third-party data; specific composition deliberately undisclosed citing "competitive landscape and safety implications"; leaked details suggest CommonCrawl, RefinedWeb, code, textbooks, and content from Twitter, Reddit, YouTube
- **Key Innovations:** Multimodal (text + image); major leaps in reliability, safety, complex reasoning; powered ChatGPT Plus; widely adopted by enterprises
- **Data Centers:** Microsoft Azure (Iowa cluster — initial training; Arizona cluster — expansion)

### Anthropic Claude 1
- **Released:** March 2023
- **Builder:** Anthropic
- **Type:** LLM (limited access)
- **Key Innovations:** Constitutional AI approach; emphasis on safety and helpfulness
- **Data Centers:** AWS

### Google Bard (Launched)
- **Released:** February 6, 2023 (announcement); March 2023 (limited release)
- **Builder:** Google
- **Type:** Conversational AI chatbot
- **Key Innovations:** Powered by LaMDA initially, then PaLM 2; Google's response to ChatGPT
- **Data Centers:** Google Cloud

### Meta LLaMA 1
- **Released:** February 2023
- **Builder:** Meta
- **Type:** Open-weight foundation LLM (research only, non-commercial)
- **Parameters:** 7B, 13B, 33B, 65B
- **Training Data:** 1.4T tokens from: CommonCrawl (67%), C4 (15%), GitHub (4.5%), Wikipedia (4.5%), Books (4.5%), ArXiv (2.5%), StackExchange (2%)
- **Key Innovations:** LLaMA-13B matched/exceeded GPT-3 (175B) on many benchmarks despite being 13x smaller; sparked open-source LLM revolution; leaked via BitTorrent
- **Data Centers:** Meta's own infrastructure

---

## 2022

### OpenAI ChatGPT / GPT-3.5
- **Released:** November 30, 2022 (ChatGPT) / March 2022 (GPT-3.5)
- **Builder:** OpenAI
- **Type:** Conversational AI / LLM
- **Parameters:** ~175B (refined from GPT-3)
- **Training Data:** Similar to GPT-3 (Common Crawl, WebText, Books, Wikipedia) with additional RLHF training; fine-tuned with human feedback
- **Key Innovations:** Sparked the AI revolution; 1M users in 5 days; fastest-growing consumer app in history by Feb 2023; bridged research and real-world deployment
- **Data Centers:** Microsoft Azure (Iowa)

### Stability AI Stable Diffusion (1.4, 1.5, 2.0, 2.1)
- **Released:** August 2022 (v1.4) through December 2022 (v2.1)
- **Builder:** Stability AI / CompVis (LMU Munich) / Runway
- **Type:** Open-source text-to-image diffusion model
- **Training Data:** LAION-5B dataset (5.85 billion text-image pairs scraped from the web)
- **Key Innovations:** First major open-source text-to-image model; ran on consumer GPUs; departure from proprietary models like DALL-E and Midjourney
- **Data Centers:** AWS (Stability AI's primary cloud provider)

### OpenAI DALL-E 2
- **Released:** April 2022
- **Builder:** OpenAI
- **Type:** Text-to-image generation model
- **Key Innovations:** More complex and realistic images than DALL-E 1; inpainting and outpainting; 1024x1024 resolution
- **Data Centers:** Microsoft Azure

### Google PaLM (Pathways Language Model)
- **Released:** April 2022
- **Builder:** Google Research
- **Type:** Dense decoder-only Transformer LLM
- **Parameters:** 540B
- **Training Data:** Multilingual web documents, books, code, Wikipedia, conversations
- **Key Innovations:** Trained with Pathways system across multiple TPU v4 Pods; breakthrough few-shot performance
- **Data Centers:** Google Cloud TPU v4 Pods

### Midjourney v3 / v4
- **Released:** 2022
- **Builder:** Midjourney Inc.
- **Type:** Proprietary text-to-image model
- **Key Innovations:** Artistic, stylized image generation via Discord bot interface
- **Data Centers:** Undisclosed (cloud-based)

---

## 2021

### OpenAI DALL-E
- **Released:** January 2021
- **Builder:** OpenAI
- **Type:** Text-to-image transformer model
- **Parameters:** 12B
- **Key Innovations:** First text-to-image model to capture widespread public attention; combined GPT-3-like text understanding with image generation
- **Data Centers:** Microsoft Azure

### OpenAI Codex
- **Released:** August 2021
- **Builder:** OpenAI
- **Type:** Code-generation LLM (based on GPT-3)
- **Parameters:** 12B
- **Training Data:** 159 GB of Python code from GitHub repositories + GPT-3 training data
- **Key Innovations:** Powered GitHub Copilot; could translate natural language to code across 12+ programming languages
- **Data Centers:** Microsoft Azure

### Google LaMDA (Language Model for Dialogue Applications)
- **Released:** May 2021 (announced at I/O)
- **Builder:** Google
- **Type:** Conversational LLM
- **Parameters:** 137B
- **Training Data:** 1.56T words of web documents, dialog data, Wikipedia
- **Key Innovations:** Specifically designed for dialogue; later powered initial version of Bard
- **Data Centers:** Google Cloud TPU infrastructure

---

## 2020

### OpenAI GPT-3
- **Released:** May 28, 2020 (paper) / June 2020 (beta API)
- **Builder:** OpenAI
- **Type:** Autoregressive LLM
- **Parameters:** 175B (over 100x larger than GPT-2)
- **Training Data:** ~500 billion tokens from 5 sources:
  - **Common Crawl** (60% weighted) — 410B tokens from filtered web crawl (2016–2019)
  - **WebText2** (22% weighted) — 19B tokens from Reddit outbound links with 3+ upvotes
  - **Books1** (8% weighted) — 12B tokens
  - **Books2** (8% weighted) — 55B tokens
  - **English Wikipedia** (3% weighted)
  - Higher-quality datasets sampled 2-3x more frequently than their size would suggest
- **Key Innovations:** Demonstrated that scale (175B params) unlocks emergent capabilities; few-shot and zero-shot learning without fine-tuning; Microsoft licensed exclusively in Sep 2020
- **Training Cost:** Estimated $4.6M in compute
- **Data Centers:** Microsoft Azure (pre-Stargate era)
- **Availability:** API access (initially beta, then commercial)

### Google T5 (Text-to-Text Transfer Transformer)
- **Released:** 2020 (widely adopted)
- **Builder:** Google Research
- **Type:** Encoder-decoder transformer
- **Parameters:** Up to 11B
- **Training Data:** C4 (Colossal Clean Crawled Corpus) — 750GB of cleaned English web text from Common Crawl
- **Key Innovations:** Unified text-to-text framework; all NLP tasks framed as text generation
- **Data Centers:** Google Cloud TPU

---

## Additional Notable Models (Supplementary)

### Cohere Command Series (2024–2025)
- **Builder:** Cohere (Toronto, Canada)
- **Command R (March 2024):** 35B params, 128K context, optimized for RAG and enterprise
- **Command R+ (August 2024):** Larger variant with 50% higher throughput, 25% lower latency
- **Command A (March 2025):** 111B params, 256K context, 150% higher throughput vs R+, runs on 2 GPUs (A100/H100)
- **Command A Reasoning (2025):** Hybrid reasoning for complex agentic tasks, 22 languages
- **Training Data:** Undisclosed (enterprise-focused web, multilingual, RAG-optimized)
- **Data Centers:** Available on AWS, Google Cloud, Oracle Cloud; Cohere's own infrastructure

### Black Forest Labs FLUX.1 (2024)
- **Builder:** Black Forest Labs (founded by original Stable Diffusion researchers)
- **Type:** Open text-to-image model
- **Key Innovations:** Largely replacing Stable Diffusion as the go-to open text-to-image model
- **Released:** 2024

### Midjourney v5–v7 (2023–2025)
- **Builder:** Midjourney Inc.
- **v5/5.1/5.2:** 2023 — Progressive quality improvements
- **v6:** 2024 — Major quality leap, consistent style feature
- **v7:** Default since June 2025 — Cinematic quality, emotional depth
- **Data Centers:** Undisclosed

### Stable Diffusion XL / 3.0 / 3.5 (2023–2025)
- **Builder:** Stability AI
- **SDXL 1.0 (July 2023):** Native 1024x1024, improved limbs/text
- **SD 3.0 (2024):** Rectified Flow Transformers architecture
- **SD 3.5 (April 2025):** Flagship upgrade
- **Training Data:** LAION-derived datasets (web-scraped image-text pairs)
- **Data Centers:** AWS (Stability AI)

---

## Data Center Summary by Company

| Company | Primary Data Center Locations | Hardware |
|---------|-------------------------------|----------|
| **OpenAI** | Stargate: Abilene TX (1.2GW), Shackelford Co TX, Dona Ana Co NM, Lordstown OH, Milam Co TX; Microsoft Azure: Iowa, Arizona, Wisconsin (Fairwater 300MW), Georgia | NVIDIA H100/H200/GB200; planned 26GW total |
| **Anthropic** | AWS Project Rainier: Indiana, Pennsylvania, Mississippi; Google Cloud TPUs; Azure; own DCs planned in Texas & New York ($50B) | AWS Trainium2 (500K–1M chips), Google TPUs (up to 1M), NVIDIA GPUs |
| **Google DeepMind** | Multiple undisclosed sites (multi-DC training confirmed); TPU Cloud: North America, Europe, Asia | Custom TPUs v4/v5e/Trillium (6th-gen)/Ironwood; liquid-cooled since 2018 |
| **Meta** | Multiple US data centers (undisclosed specifics) | NVIDIA GPUs (massive clusters) |
| **xAI** | Colossus: Memphis, TN (3 buildings, 200K+ GPUs, expanding to 1M GPUs, ~2GW) | NVIDIA H100/GB200 |
| **DeepSeek** | Hangzhou (China); underwater DC off Hainan Island; desert DCs in Xinjiang; SE Asia partnerships; global cloud (AWS/GCP/Azure) | NVIDIA H800 (training), Huawei Ascend (inference) |
| **Alibaba** | Beijing (mainland China); Singapore (international); expanding to Brazil, France, Netherlands, Mexico, Japan, South Korea, Malaysia, Dubai | Alibaba Cloud infrastructure |
| **Mistral AI** | Essonne, France (40MW, 18K NVIDIA Grace Blackwell chips); Eclairion facility, Bruyeres-le-Chatel | NVIDIA Grace Blackwell Superchips |
| **Stability AI** | AWS (primary cloud) | NVIDIA GPUs on AWS |
| **Cohere** | AWS, Google Cloud, Oracle Cloud | Cloud-based GPU clusters |

---

## Key Industry Trends (2020–2026)

1. **Scale explosion:** GPT-3 (175B, 2020) → GPT-4 (~1.8T MoE, 2023) → Llama 4 Behemoth (~2T MoE, 2025) → multi-trillion parameter frontier models
2. **Training data growth:** 500B tokens (GPT-3, 2020) → 14.8T tokens (DeepSeek V3, 2024) → 36T tokens (Qwen3, 2025) → estimated 70T+ tokens (GPT-5)
3. **Context windows:** 2K (GPT-3) → 128K (GPT-4 Turbo) → 1M (Gemini) → 10M (Llama 4 Scout)
4. **Reasoning revolution (2024–2025):** OpenAI o1 pioneered RLVR; DeepSeek R1 democratized it; by late 2025 every major lab shipped reasoning models
5. **MoE architecture dominance:** Dense models gave way to sparse MoE (DeepSeek V3, Llama 4, Mixtral, Mistral Large 3)
6. **Open-weight shift:** Meta Llama dominated 2023–2024; Alibaba Qwen overtook by mid-2025; DeepSeek R1 proved open weights could match frontier proprietary models
7. **Declining transparency:** GPT-3 disclosed exact training data; GPT-4/5 disclosed almost nothing
8. **Synthetic data:** Became mainstream by 2024–2025 for training; Microsoft Phi series pioneered "textbook quality" synthetic data
9. **Infrastructure race:** $500B+ Stargate, $50B Anthropic DC plan, $53B Alibaba expansion, $109B French AI sovereignty program
10. **Inference speed:** Cerebras partnership (Codex Spark: 1,000+ tok/s), Google Gemini Diffusion, speculative decoding becoming standard

---

*Sources consulted: OpenAI technical reports and blog posts, Anthropic documentation, Google DeepMind publications, Meta AI blog, DeepSeek technical reports, Mistral AI docs, Cohere documentation, xAI announcements, Wikipedia, arXiv papers, Sebastian Raschka's State of LLMs 2025, Simon Willison's Year in LLMs 2025, Andrej Karpathy's 2025 LLM Review, and various industry reporting from TechCrunch, The Decoder, Data Center Dynamics, CNBC, and others.*
