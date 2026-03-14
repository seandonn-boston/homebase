<!-- Admiral Framework v0.3.1-alpha -->
# Comprehensive AI Timeline (2010 – March 2026)

Created: February 2026
Revised: March 2026

> Chronological timeline covering the AI era across six dimensions: **model releases**, **market events**, **geopolitics & policy**, **infrastructure & data centers**, **scientific publications**, and **corporate milestones**. Source links provided where available.
>
> **Legend:** Entries are tagged by category for scanning:
> - **[MODEL]** — AI model releases and capabilities
> - **[MARKET]** — Stock market events, funding rounds, valuations
> - **[POLICY]** — Government actions, executive orders, regulation
> - **[INFRA]** — Data centers, semiconductors, compute buildout
> - **[RESEARCH]** — Scientific papers, publications, awards
> - **[GEO]** — Geopolitical events, international competition, trade

---



## 2010–2011

### [RESEARCH] ImageNet Large Scale Visual Recognition Challenge (ILSVRC) Begins
- **Date:** 2010 (first competition)
- **Details:** Annual competition using the ImageNet dataset (14M+ labeled images, 20,000+ categories). Created by Fei-Fei Li (Stanford) and collaborators. Published as "ImageNet: A Large-Scale Hierarchical Image Database" at CVPR 2009. The ILSVRC competition ran from 2010 to 2017 and was the crucible in which modern deep learning was forged — AlexNet (2012), GoogLeNet (2014), ResNet (2015) all emerged from it.
- **2010 winner:** NEC-UIUC (28.2% top-5 error, using traditional computer vision methods — SIFT features + SVMs)
- **2011 winner:** XRCE (25.8% top-5 error, still pre-deep-learning)
- [ImageNet](https://www.image-net.org/) | [Stanford Vision Lab](http://vision.stanford.edu/)

---

## 2012

### [RESEARCH] AlexNet Wins ILSVRC 2012 — The Deep Learning Moment
- **Date:** September 30, 2012
- **Details:** "ImageNet Classification with Deep Convolutional Neural Networks." Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton (University of Toronto) won ILSVRC 2012 with 15.3% top-5 error (vs. 26.2% for the runner-up — a 10.8 percentage point gap, unprecedented). Used 2 NVIDIA GTX 580 GPUs for training. This single result is widely credited with launching the modern deep learning revolution. All three later played central roles: Sutskever co-founded OpenAI; Hinton won the 2024 Nobel Prize in Physics.
- [NeurIPS 2012](https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html)

---

## 2013

### [RESEARCH] Word2Vec Published
- **Date:** January 2013
- **Details:** "Efficient Estimation of Word Representations in Vector Space." Introduced efficient word embeddings that captured semantic relationships. Author: Tomas Mikolov et al. (Google). Foundation for all subsequent NLP work.
- [arXiv 1301.3781](https://arxiv.org/abs/1301.3781)

### [RESEARCH] ZFNet Wins ILSVRC 2013
- **Date:** 2013
- **Details:** Matthew Zeiler and Rob Fergus (NYU) won ILSVRC 2013. Introduced visualization techniques for understanding CNNs. Top-5 error: 11.7%.

---

## 2014

### [RESEARCH] Generative Adversarial Networks (GANs) Paper
- **Date:** June 10, 2014
- **Details:** "Generative Adversarial Nets." Introduced the generator-discriminator framework that became the basis for image generation AI until diffusion models took over. Author: Ian Goodfellow et al. (University of Montreal).
- [arXiv 1406.2661](https://arxiv.org/abs/1406.2661)

### [RESEARCH] GoogLeNet (Inception) Wins ILSVRC 2014
- **Date:** 2014
- **Details:** 22-layer deep network with "Inception modules." Top-5 error: 6.67%. Runner-up VGGNet (Oxford) pioneered 16-19 layer architectures that became standard building blocks.

### [RESEARCH] Seq2Seq and Attention Mechanism Papers
- **Date:** September–December 2014
- **Details:** Sutskever, Vinyals, Le (Google) published "Sequence to Sequence Learning with Neural Networks" — encoder-decoder architecture for machine translation. Bahdanau, Cho, Bengio published "Neural Machine Translation by Jointly Learning to Align and Translate" — introduced the attention mechanism, precursor to Transformers.
- [arXiv 1409.3215](https://arxiv.org/abs/1409.3215) | [arXiv 1409.0473](https://arxiv.org/abs/1409.0473)

### [MARKET] Google Acquires DeepMind for ~$500M
- **Date:** January 2014
- **Details:** Google acquired London-based DeepMind Technologies, founded by Demis Hassabis, Shane Legg, and Mustafa Suleyman. DeepMind later merged with Google Brain in April 2023 to form Google DeepMind.

---

## 2015

### [MARKET] OpenAI Founded
- **Date:** December 2015
- **Details:** Co-founded by Sam Altman and Elon Musk (among others) as a nonprofit AI research lab. Initial $1B pledge from Musk, Peter Thiel, Reid Hoffman, and others. Musk departed the board in 2018. Converted to "capped-profit" structure in 2019.

### [RESEARCH] ResNet (Residual Networks) Paper
- **Date:** December 10, 2015
- **Details:** "Deep Residual Learning for Image Recognition." Introduced skip connections enabling training of networks 100+ layers deep. Won ILSVRC 2015 with 152 layers (3.57% top-5 error, surpassing human performance). Authors: Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun (Microsoft Research). ~200,000 citations.
- [arXiv 1512.03385](https://arxiv.org/abs/1512.03385)

---

## 2016

### [POLICY] Obama OSTP Report: "Preparing for the Future of AI"
- **Date:** October 12, 2016
- **Details:** Landmark 58-page report examining the state of AI with 23 policy recommendations. Followed five public workshops and 161 public comments. Led by Ed Felten, Deputy U.S. CTO. Companion "National AI R&D Strategic Plan" released same month. Follow-up report on AI, Automation, and the Economy released December 2016. Obama administration did NOT issue a formal executive order on AI but laid the groundwork for all subsequent administrations.
- [Obama White House Archives](https://obamawhitehouse.archives.gov/blog/2016/10/12/administrations-report-future-artificial-intelligence)

### [RESEARCH] Google DeepMind AlphaGo Defeats Lee Sedol
- **Date:** March 9-15, 2016
- **Details:** AlphaGo defeated Go world champion Lee Sedol 4-1 in Seoul. Considered a landmark moment for AI — Go was believed to be decades away from AI mastery. 200M+ people watched. AlphaGo Zero (2017) later defeated AlphaGo 100-0 using pure self-play.

---

## 2017

### [RESEARCH] "Attention Is All You Need" — The Transformer Paper
- **Date:** June 12, 2017 (arXiv); NeurIPS 2017
- **Details:** Introduced the Transformer architecture based solely on attention mechanisms; replaced RNNs/CNNs for sequence processing. Foundation of ALL modern LLMs, vision transformers, and generative models. Authors: Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin (Google Brain / Google Research). All 8 authors later left Google for startups.
- [arXiv 1706.03762](https://arxiv.org/abs/1706.03762)

### [RESEARCH] Sparsely-Gated Mixture-of-Experts Paper
- **Date:** January 23, 2017
- **Details:** "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer." First successful large-scale conditional computation. Authors include Shazeer, Hinton, Dean (Google).
- [arXiv 1701.06538](https://arxiv.org/abs/1701.06538)

### [GEO] China "New Generation AI Development Plan"
- **Date:** July 2017
- **Details:** State Council issued national AI strategy with milestones for 2020, 2025, and 2030. Goal: world AI leader by 2030. This document catalyzed the US-China AI competition.

### [POLICY] Project Maven Established at Pentagon
- **Date:** April 26, 2017
- **Details:** Pentagon's "Algorithmic Warfare Cross-Functional Team" created by Deputy SecDef Robert O. Work; initially $70M funded. Uses AI to analyze imagery/data from satellites, drones, sensors for rapid target detection. By 2024-2025: 20,000+ active users, 35+ military tools, 800+ active DOD AI projects.
- [Wikipedia](https://en.wikipedia.org/wiki/Project_Maven)

---

## 2018

### [RESEARCH] GPT-1 Released
- **Date:** June 11, 2018
- **Details:** "Improving Language Understanding by Generative Pre-Training." Proved transformers transfer via generative pre-training + fine-tuning; 12-layer decoder; beat 9/12 benchmarks. Authors: Radford, Narasimhan, Salimans, Sutskever (OpenAI).

### [RESEARCH] AlphaFold (Original) Wins CASP13
- **Date:** December 2018
- **Details:** Google DeepMind's first protein structure prediction system. Won CASP13 competition. Completely different architecture from AlphaFold 2.

### [GEO] Google Employees Protest Project Maven; Google Withdraws
- **Date:** 2018
- **Details:** Google employees staged walkouts (led by Meredith Whittaker) protesting AI work for Pentagon's drone imagery analysis. Google did not renew the Project Maven contract. Palantir took over.

---

## 2019

### [POLICY] Trump Signs EO 13859: "Maintaining American Leadership in AI"
- **Date:** February 11, 2019
- **Details:** Launched the "American AI Initiative" with five directives: prioritize federal AI R&D, unleash federal data/computing resources, set AI technical standards, build the AI workforce, engage with international allies. Did NOT provide new dedicated funding — widely criticized as "more bark than bite." Codified into law via the National AI Initiative Act of 2020.
- [Trump White House Archives](https://trumpwhitehouse.archives.gov/presidential-actions/executive-order-maintaining-american-leadership-artificial-intelligence/)

### [MARKET] Microsoft's Initial $1B Investment in OpenAI
- **Date:** July 2019
- **Details:** Microsoft CEO Satya Nadella invested $1B in OpenAI. Bill Gates reportedly said: "Yeah, you're going to burn this billion dollars."

### [RESEARCH] GPT-2 Released (Staged)
- **Date:** February 2019
- **Details:** "Language Models are Unsupervised Multitask Learners." 1.5B parameters; 10x scale-up of GPT-1. OpenAI initially withheld full model from release due to misuse concerns — the first major "responsible release" debate for LLMs. Authors: Radford, Wu, Child, Luan, Amodei, Sutskever.
- [OpenAI](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)

---

## 2020

### [RESEARCH] Scaling Laws for Neural Language Models (Kaplan et al.)
- **Date:** January 22, 2020
- **Details:** First systematic study showing loss scales as power-law with model size, dataset size, and compute. Authors include Jared Kaplan, Sam McCandlish, Dario Amodei (later Anthropic founders).
- [arXiv 2001.08361](https://arxiv.org/abs/2001.08361)

### [POLICY] Trump Signs EO on Trustworthy AI in Federal Government
- **Date:** December 3, 2020
- **Details:** Directed federal agencies to adopt principles for using trustworthy AI.

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

## 2021

### [RESEARCH] AlphaFold 2 Published in Nature
- **Date:** July 15, 2021
- **Details:** "Highly accurate protein structure prediction with AlphaFold." Solved the protein-folding problem; >40,000 citations. Code open-sourced. Won CASP14 competition in November/December 2020 by wide margin.
- [Nature](https://www.nature.com/articles/s41586-021-03819-2)

### [RESEARCH] Switch Transformers Paper
- **Date:** January 11, 2021 (arXiv); JMLR 2022
- **Details:** "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity." Simplified Mixture-of-Experts by routing to single expert (k=1); enabled trillion-parameter models. Authors: Fedus, Zoph, Shazeer (Google).
- [arXiv 2101.03961](https://arxiv.org/abs/2101.03961)

### [MARKET] Anthropic Founded
- **Date:** May 2021
- **Details:** Founded by Dario Amodei, Daniela Amodei, and other former OpenAI researchers. Series A: $124M at $550M valuation (led by Dustin Moskovitz, Jaan Tallinn).

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

## 2022

### [POLICY] CHIPS and Science Act Signed into Law
- **Date:** August 9, 2022
- **Details:** $280 billion total: $52B in subsidies/tax credits for chip manufacturing; $200B for research (AI, quantum, robotics). New NSF Directorate for Technology, Innovation and Partnerships ($20B over 5 years). Goal: US to produce 20% of world's leading-edge chips by end of decade (from 0%). By March 2024: 25-50 potential projects, $160-200B projected investment, 25,000-45,000 jobs.
- [Stanford HAI](https://hai.stanford.edu/policy/what-the-chips-and-science-act-means-for-artificial-intelligence) | [Wikipedia](https://en.wikipedia.org/wiki/CHIPS_and_Science_Act)

### [GEO] US Initial AI Chip Export Controls Against China
- **Date:** October 7, 2022
- **Details:** BIS issued sweeping controls on advanced computing chips, semiconductor manufacturing equipment, and supercomputing end-uses for China. NSA Jake Sullivan declared securing "as large a lead as possible" in AI a national security imperative. Netherlands and Japan announced allied controls in March 2023. Delay enabled Chinese firms to stockpile: SME imports jumped from $2.9B to $5B.
- [CSIS](https://www.csis.org/analysis/where-chips-fall-us-export-controls-under-biden-administration-2022-2024)

### [RESEARCH] Constitutional AI Paper (Anthropic)
- **Date:** December 15, 2022
- **Details:** "Constitutional AI: Harmlessness from AI Feedback." Introduced RLAIF (RL from AI Feedback); trains harmless AI using principles/rules instead of human labels for harmful outputs. 51 authors.
- [arXiv 2212.08073](https://arxiv.org/abs/2212.08073)

### [RESEARCH] InstructGPT / RLHF Paper
- **Date:** March 4, 2022
- **Details:** "Training Language Models to Follow Instructions with Human Feedback." Foundational RLHF paper; 1.3B InstructGPT preferred over 175B GPT-3 by humans; improved truthfulness and reduced toxicity.
- [arXiv 2203.02155](https://arxiv.org/abs/2203.02155)

### [RESEARCH] Chinchilla Scaling Laws
- **Date:** March 2022
- **Details:** "Training Compute-Optimal Large Language Models." Showed parameters and data should scale proportionally; overturned Kaplan et al.'s scaling estimates; 70B model trained on 1.4T tokens outperformed 280B Gopher. Authors: Hoffmann et al. (Google DeepMind).
- [arXiv 2203.15556](https://arxiv.org/abs/2203.15556)

### [RESEARCH] Chain-of-Thought Prompting Paper
- **Date:** January 2022 (arXiv); NeurIPS 2022
- **Details:** "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." Demonstrated step-by-step reasoning examples dramatically improve LLM math/logic performance. Authors: Wei, Wang et al. (Google).
- [arXiv 2201.11903](https://arxiv.org/abs/2201.11903)

### [MARKET] Microsoft's Total $13B OpenAI Investment
- **Date:** 2019–2023 (cumulative)
- **Details:** Initial $1B in 2019 (Bill Gates reportedly said: "Yeah, you're going to burn this billion dollars"). Microsoft eventually invested $13.8B total. Exclusively licensed GPT-3 in September 2020.
- [Fortune](https://fortune.com/article/microsoft-ceo-satya-nadella-bill-gates-openai-sam-altman-youre-going-to-burn-this-billion-dollars-big-tech/)

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

## Early 2023 (January – April)

### [MARKET] AI Stock Boom Year
- **Date:** Full year 2023
- **Details:** Morningstar Global Next Generation AI Index: +68% (3x broader market). NVIDIA: +200%+ in 12 months following ChatGPT launch. AI stocks accounted for 75% of S&P 500 returns (JPMorgan). Magnificent 7 returns: +37%. GenAI mentions in corporate earnings calls jumped from 1.3% (2022) to 5.0% (2023).
- [Morningstar](https://www.morningstar.com/stocks/one-year-after-chatgpts-launch-7-charts-ai-stock-boom)

### [MARKET] Amazon's Initial $1.25B Investment in Anthropic
- **Date:** September 2023
- **Details:** First tranche of an eventual $4B commitment.

### [POLICY] Biden Signs EO 14110: "Safe, Secure, and Trustworthy Development and Use of AI"
- **Date:** October 30, 2023
- **Details:** The longest executive order in US history at 110 pages. Required AI safety testing and reporting under Defense Production Act authority; mandated Chief AI Officer positions in major federal agencies; directed NIST to develop generative AI risk management guidelines; advanced equity, civil rights, privacy, and consumer protections.
- [White House](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2023/10/30/fact-sheet-president-biden-issues-executive-order-on-safe-secure-and-trustworthy-artificial-intelligence/)

### [POLICY] UK AI Safety Summit at Bletchley Park
- **Date:** November 1-2, 2023
- **Details:** First global AI safety summit. 27 countries represented; attendees included US VP Kamala Harris, EU Commission President von der Leyen, Elon Musk. 28 countries (including US and China) signed the Bletchley Declaration. UK launched world's first AI Safety Institute. Leading AI companies agreed to independent safety testing of frontier models.
- [GOV.UK](https://www.gov.uk/government/topical-events/ai-safety-summit-2023)

### [POLICY] Biden Secures Voluntary AI Safety Commitments
- **Date:** July 21, 2023
- **Details:** 7 leading AI companies (Amazon, Anthropic, Google, Inflection, Meta, Microsoft, OpenAI) made voluntary commitments to manage AI risks; later expanded to 15 companies.

### [POLICY] Sam Altman Senate Testimony
- **Date:** May 16, 2023
- **Details:** Senate Judiciary Subcommittee hearing "Oversight of A.I.: Rules for Artificial Intelligence." Blumenthal opened with an AI-generated clone of his own voice reading a ChatGPT-written speech. Altman called for a government licensing agency for powerful AI systems, expressed fears about AI manipulation of voters. Three-hour hearing covering jobs, regulation, and societal risks.
- [Senate Judiciary](https://www.judiciary.senate.gov/committee-activity/hearings/oversight-of-ai-rules-for-artificial-intelligence)

### [GEO] China Enacts World's First Binding Generative AI Regulation
- **Date:** August 15, 2023
- **Details:** "Interim Measures for Administration of Generative AI Services." Deep Synthesis Provisions (governing deepfakes/synthetic media) took effect January 2023. Also launched Global AI Governance Initiative at UN in October 2023.

### [GEO] Huawei Mate 60 Pro Reveals SMIC 7nm Chip Despite Export Controls
- **Date:** September 2023
- **Details:** Demonstrated China had surpassed the 14/16nm threshold set by US export controls — a major shock. BIS responded with tightened controls on October 17, expanding chip criteria and adding modified NVIDIA H800/A800 to restricted list.

### [GEO] G7 Hiroshima AI Process
- **Date:** May 2023 (launched); October 2023 (agreed on Guiding Principles and Code of Conduct)
- **Details:** 6 initial AI commitments at Hiroshima Summit; Comprehensive Framework endorsed December 2023; expanded to 49 countries by mid-2024; 25 commitments at June 2024 G7 Apulia Summit.

### [RESEARCH] "Tree of Thoughts" Paper
- **Date:** May 2023 (arXiv); NeurIPS 2023
- **Details:** Generalized Chain-of-Thought; enabled exploration of multiple solution paths; improved Game of 24 success from 4% to 74% with GPT-4.
- [arXiv 2305.10601](https://dl.acm.org/doi/abs/10.5555/3666122.3666639)

### [RESEARCH] "Direct Preference Optimization" (DPO) Paper
- **Date:** May 29, 2023 (arXiv); NeurIPS 2023
- **Details:** Eliminated the need for a separate reward model in RLHF; simpler, more stable alternative. Authors: Rafailov, Sharma, Mitchell, Ermon, Manning, Finn.
- [arXiv 2305.18290](https://arxiv.org/abs/2305.18290)

### [RESEARCH] ChatGPT iOS App Launch — AI in Everyone's Pocket
- **Date:** May 18, 2023
- **Details:** First official ChatGPT mobile app. Free; integrated Whisper for voice input; initially US-only, quickly expanded. Total downloads reached 1.44B by late 2025. This marked the moment AI moved from browser-only to native mobile presence.
- [OpenAI Blog](https://openai.com/index/introducing-the-chatgpt-app-for-ios/)

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

### [RESEARCH] ChatGPT "Aha Moment" — AI Enters Mainstream Consciousness
- **Date:** Late 2022 – February 2023
- **Details:** ChatGPT launched November 30, 2022. Reached 1M users in 5 days (Sam Altman confirmed) — fastest consumer app ever at the time. NPR published "Artificial Intelligence is Having a Moment" (December 29, 2022) — one of the first major mainstream media pieces framing AI as ubiquitous. By February 2023: 100M monthly active users in ~60 days (Instagram took 2.5 years). BuzzFeed announced using ChatGPT for content. Coverage surged when Microsoft integrated it into Bing and Google panic-announced Bard. ChatGPT user milestones: 100M WAU (Nov 2023) → 300M WAU (Dec 2024) → 400M WAU (Feb 2025) → 900M WAU (Feb 2026).
- [NPR](https://www.npr.org/2022/12/29/1146096922/artificial-intelligence-is-having-a-moment) | [Reuters](https://www.reuters.com/technology/chatgpt-sets-record-fastest-growing-user-base-analyst-note-2023-02-01/)

### [MARKET] Google Bard Announcement Error Costs Alphabet $100B
- **Date:** February 6-8, 2023
- **Details:** Bard demo included a factual error about the James Webb Space Telescope. Alphabet lost $100B in market value in a single session.

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

## Early 2024 (January – April)

### [POLICY] Biden Becomes First President to Mention AI in State of the Union
- **Date:** March 7, 2024
- **Details:** Called for a ban on AI voice impersonation, referencing the deepfake robocall that impersonated his voice before the New Hampshire primary (January 2024).
- [NPR](https://www.npr.org/2024/03/08/1237107814/why-one-ai-expert-was-pleased-biden-addressed-ai-during-his-state-of-the-union)

### [GEO] Saudi Arabia Announces $100B "Project Transcendence"
- **Date:** Late 2024
- **Details:** Partnerships: Google/PIF $10B AI hub with HUMAIN; AWS/HUMAIN $5B AI Zone; Oracle $14B pledge; HUMAIN $10B venture fund. Targeting 1.9 GW data center capacity by 2030.

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

## Mid 2024 (May – August)

### [MARKET] NVIDIA Becomes Most Valuable Company (1st Time)
- **Date:** June 18, 2024
- **Details:** Surpassed both Apple and Microsoft. Market cap exceeded $3.3 trillion. 10-for-1 stock split on June 7, resetting share price from ~$1,200 to ~$120.
- [CNBC](https://www.cnbc.com/2024/06/18/nvidia-passes-microsoft-in-market-cap-is-most-valuable-public-company.html)

### [MARKET] AI-Driven Flash Crash
- **Date:** June 15, 2024
- **Details:** S&P 500 and Dow Jones plummeted nearly 10% within minutes, wiping out trillions. AI-driven high-frequency trading algorithms amplified the sell orders. SEC/CFTC investigations followed.
- [Medium](https://medium.com/@jeyadev_needhi/ais-role-in-the-2024-stock-market-flash-crash-a-case-study-55d70289ad50)

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

## Late 2024 (September – December)

### [MARKET] Amazon Invests Additional $4B in Anthropic (Total $8B)
- **Date:** November 22, 2024
- **Details:** Anthropic named AWS its primary training partner. Amazon maintains minority position (below 33%, no board seat).
- [CNBC](https://www.cnbc.com/2024/11/22/amazon-to-invest-another-4-billion-in-anthropic-openais-biggest-rival.html)

### [MARKET] OpenAI Raises $6.6B at $157B Valuation
- **Date:** October 2024
- **Details:** Investors: Thrive Capital, Microsoft, NVIDIA, SoftBank.

### [MARKET] NVIDIA Becomes Most Valuable Company (2nd and 3rd Time)
- **Date:** October 25, 2024 (3rd); November 5, 2024 ($3.43T)
- **Details:** Surpassed Apple on AI chip demand. Full-year 2024 stock gain: +171%.

### [INFRA] BlackRock/Microsoft/MGX Launch $100B AI Infrastructure Partnership
- **Date:** September 17, 2024
- **Details:** $30B in private equity capital with potential for $100B total including debt. Focus: data centers and power infrastructure for AI. October 1: BlackRock acquired Global Infrastructure Partners.
- [CNBC](https://www.cnbc.com/2024/09/17/microsoft-blackrock-form-gaiip-to-invest-in-ai-data-centers-energy.html)

### [GEO] US-China AI Chip Controls Escalated Again
- **Date:** December 2, 2024
- **Details:** BIS added 140 companies to Entity List; expanded FDPR scope; restricted high-bandwidth memory (HBM2E and above); targeted Huawei's supply chain.

### [GEO] EU AI Act Enters into Force
- **Date:** August 1, 2024
- **Details:** Passed European Parliament March 13, 2024. European Council formally adopted May 21, 2024. Prohibitions on certain AI systems apply February 2, 2025. GPAI model obligations apply August 2, 2025. Full application (high-risk systems, enforcement) August 2, 2026. Risk-based classification; extraterritorial application (like GDPR).
- [EU Parliament](https://www.europarl.europa.eu/topics/en/article/20230601STO93804/eu-ai-act-first-regulation-on-artificial-intelligence)

### [RESEARCH] AlphaFold 3 Published in Nature
- **Date:** May 8, 2024
- **Details:** Predicts structures of protein complexes with DNA, RNA, post-translational modifications, ligands, and ions. >9,000 citations by November 2025.
- [Nature](https://www.nature.com/articles/d41586-024-01463-0)

### [RESEARCH] Sora Text-to-Video Preview
- **Date:** February 15, 2024 (preview); December 2024 (public release)
- **Details:** OpenAI's diffusion transformer for text-to-video generation. Publicly released for ChatGPT Plus/Pro in December 2024.
- [OpenAI](https://openai.com/index/sora-is-here/)

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

## Early 2025 (January – April)

### [MARKET] DeepSeek AI Market Crash — ~$1 Trillion Wipeout
- **Date:** January 27, 2025
- **Details:** DeepSeek's R1 model, matching GPT-4 performance for a claimed $5.6M training cost, triggered the largest single-day market cap loss for any company in history. NVIDIA: -17% ($589B loss). Nasdaq: -3.1%; S&P 500: -1.5%. Broadcom: -17%; Marvell: -19%; Micron: -11%. Philadelphia Semiconductor Index: -9.2% (sharpest drop since March 2020). Apple rose 3% to $3.45T, reclaiming "most valuable company." Markets rebounded the next day (NVIDIA +9%, Nasdaq +2%).
- [Fortune](https://fortune.com/2025/01/27/deepseek-buzz-puts-tech-stocks-on-track-for-1-trillion-wipeout/) | [CNN](https://www.cnn.com/2025/01/27/tech/deepseek-stocks-ai-china)

### [POLICY] Trump Revokes Biden's AI Executive Order on Day One
- **Date:** January 20, 2025
- **Details:** Within hours of inauguration, Trump revoked EO 14110, labeling it among "unpopular, inflationary, illegal, and radical practices."

### [POLICY] Stargate Project Announced at White House
- **Date:** January 21, 2025
- **Details:** Trump announced $500B AI infrastructure joint venture (OpenAI, SoftBank, Oracle, MGX) at White House press conference with Sam Altman, Larry Ellison, and Masayoshi Son. $100B initial investment; projected 100,000+ jobs. Elon Musk publicly disputed the funding commitment.
- [CNN](https://www.cnn.com/2025/01/21/tech/openai-oracle-softbank-trump-ai-investment/index.html) | [Al Jazeera](https://www.aljazeera.com/news/2025/1/22/stargate-what-is-trumps-new-500bn-ai)

### [POLICY] Trump Signs EO 14179: "Removing Barriers to American Leadership in AI"
- **Date:** January 23, 2025
- **Details:** Replaced Biden's EO; shifted from oversight/risk-mitigation to deregulation and innovation promotion. Criticized "engineered social agendas" in AI systems.
- [Ballotpedia](https://ballotpedia.org/Executive_Order:_Removing_Barriers_to_American_Leadership_in_Artificial_Intelligence_(Donald_Trump,_2025))

### [POLICY] Biden AI Diffusion Framework (Final Days)
- **Date:** January 2025
- **Details:** BIS issued "Framework for Artificial Intelligence Diffusion" establishing three-tier country system: Tier 1 (18 allies, unrestricted); Tier 2 (most countries, capped); Tier 3 (China, Russia, etc., effectively banned). Also introduced controls on AI model weights for the first time.
- [Sidley Austin](https://www.sidley.com/en/insights/newsupdates/2025/01/new-us-export-controls-on-advanced-computing-items-and-artificial-intelligence-model-weights)

### [MARKET] NVIDIA Reclaims Most Valuable Company (4th Time)
- **Date:** January 21, 2025
- **Details:** Market cap ~$3.45T, passing Apple ($3.35T) and Microsoft ($3.2T).
- [CNBC](https://www.cnbc.com/2025/01/21/nvidia-passes-apple-again-to-become-worlds-most-valuable-company-.html)

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

## Mid 2025 (May – September)

### [GEO] US-China AI Chip Export Controls Intensified
- **Date:** May 13, 2025
- **Details:** BIS unveiled heightened global due diligence requirements for AI semiconductor companies. March 25: additional Entity List designations targeting Chinese AI, quantum, and advanced IC entities. NVIDIA expects $5.5B hit in 2025 from H20 export restrictions; AMD estimates $800M in losses.
- [Cleary Trade Watch](https://www.clearytradewatch.com/2025/04/bis-further-restricts-exports-of-artificial-intelligence-and-advanced-chips-to-china/)

### [GEO] Paris AI Action Summit
- **Date:** February 2025
- **Details:** 62 countries + EU/AU signed declaration on AI governance. US and UK declined to sign. US OSTP Director Kratsios rejected "centralized control and global governance" of AI.

### [INFRA] BlackRock AI Infrastructure Partnership Expands
- **Date:** March 19, 2025
- **Details:** NVIDIA and xAI joined the renamed "AI Infrastructure Partnership" (AIP). GE Vernova and NextEra Energy joined as energy partners. Kuwait Investment Authority became the first non-founder financial anchor investor.
- [BlackRock](https://www.blackrock.com/corporate/newsroom/press-releases/article/corporate-one/press-releases/ai-infrastructure-partnership)

### [MARKET] OpenAI Raises $40B at $300B Valuation
- **Date:** March 2025
- **Details:** Largest private tech raise ever recorded at the time. Led by SoftBank.

### [INFRA] Intel Receives $8.9B CHIPS Act Federal Investment
- **Date:** August 2025
- **Details:** Part of Intel's foundry strategy with 18A process targeting high-volume manufacturing. Trump announced 9.9% government stake in Intel.

### [RESEARCH] 2024 Nobel Prizes Awarded for AI Work
- **Date:** October 2024 (announced; awarded early 2025)
- **Physics:** John J. Hopfield and Geoffrey E. Hinton — "for foundational discoveries and inventions that enable machine learning with artificial neural networks." First Nobel in Physics for AI work.
- **Chemistry:** Demis Hassabis and John Jumper (Google DeepMind) for protein structure prediction; David Baker (U. Washington) for computational protein design. First Nobel in Chemistry directly for AI-driven scientific discovery.
- [Nature](https://www.nature.com/articles/s41746-024-01345-9)

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

## Late 2025 (October – December)

### [MARKET] Anthropic $10B Round at $350B Valuation
- **Date:** December 31, 2025
- **Details:** Anthropic signed a term sheet for a $10 billion round led by Coatue and GIC.

### [MARKET] Anthropic $13B Series F at $183B Valuation
- **Date:** September 2025
- **Details:** Led by Iconiq Capital with Fidelity, Lightspeed, BlackRock, Blackstone participating. Total raised exceeded $14.3B at this point. ARR trajectory: $1B (Dec 2024) → $4B (mid-2025) → $9B (end 2025).
- [TechFundingNews](https://techfundingnews.com/openai-anthropic-xai-ai-funding-trends-2025/)

### [MARKET] Mistral AI $2B Series C at $13.2B Valuation
- **Date:** September 2025
- **Details:** Led by ASML; doubled Mistral's valuation from $6B.

### [MARKET] NVIDIA Becomes First $4 Trillion Company
- **Date:** July 9, 2025
- **Details:** NVIDIA reached $4T market cap, having gone from $2T (Feb 2024) to $3T (June 2024) to $4T in just over a year. Stock hit all-time high of $173 on July 17 after lifting of H20 export restrictions.
- [CNBC](https://www.cnbc.com/2025/07/09/nvidia-4-trillion.html)

### [MARKET] NVIDIA Surpasses Microsoft as Largest US Company
- **Date:** August 2025
- **Details:** Market cap exceeded $4.4T, surpassing Microsoft.

### [MARKET] Figma AI-Adjacent IPO — 40x Oversubscribed, $68B Market Cap
- **Date:** July 2025
- **Details:** Seen as opening "the floodgates" for tech IPOs.

### [INFRA] NVIDIA/Microsoft Invest up to $15B in Anthropic
- **Date:** November 2025
- **Details:** Anthropic committed to buy $30B in Azure compute running on NVIDIA AI systems.

### [INFRA] Anthropic-Google TPU Deal: Access to 1 Million TPUs
- **Date:** October 2025
- **Details:** Expected to bring 1+ gigawatt of AI compute capacity online by 2026.
- [CNBC](https://www.cnbc.com/2025/10/23/anthropic-google-cloud-deal-tpu.html)

### [MARKET] Microsoft-OpenAI Partnership Restructured
- **Date:** October 28, 2025
- **Details:** OpenAI converted to public benefit corporation (PBC). Microsoft received ~27% stake valued at ~$135B. OpenAI committed to $250B in incremental Azure purchases. Microsoft retains technology access through 2032. Revenue share: OpenAI pays 20% of revenue to Microsoft through 2032.
- [Microsoft Blog](https://blogs.microsoft.com/blog/2025/10/28/the-next-chapter-of-the-microsoft-openai-partnership/)

### [GEO] China Issues First Official Draft AI Law
- **Date:** December 2025
- **Details:** NPC released comprehensive AI legislation. China holds 38.6% of global AI patents (1.57 million as of April 2025); core AI industry exceeded 700B yuan ($96B) in 2024. Also: mandatory AI content labeling rules took effect September 1, 2025; National standards on generative AI data and security took effect November 1, 2025.
- [White & Case](https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-china)

### [GEO] Japan Commits 10 Trillion Yen ($65B) to AI Through 2030
- **Date:** December 23, 2025
- **Details:** First national AI plan approved. Parliament approved AI Promotion Act (May 28, 2025). SoftBank committed $40B+ via Stargate partnership; Microsoft invested $2.9B in Japan AI/cloud.
- [Japan Times](https://www.japantimes.co.jp/business/2025/12/26/economy/ai-budget-support/)

### [RESEARCH] DeepSeek-R1 Published as Nature Cover Article
- **Date:** September 17, 2025
- **Details:** "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning." First LLM paper to undergo rigorous peer review and appear as a Nature cover article.
- [arXiv 2501.12948](https://arxiv.org/abs/2501.12948)

### OpenAI GPT-5.2
- **Released:** December 11, 2025
- **Builder:** OpenAI
- **Type:** Frontier multimodal LLM
- **Parameters:** Undisclosed
- **Context Window:** 400K tokens (128K max output)
- **Variants:** Instant, Thinking, and Pro
- **Key Innovations:** AIME 2025: 100% score; hallucination rate reduced to 6.2% (~40% reduction from earlier generations); fast-tracked after Google Gemini 3 topped benchmarks (internal "Code Red")
- **Open-weight variants:** GPT-oss-120B and GPT-oss-20B released alongside
- **Pricing:** $1.75/$14 per million tokens (input/output)
- **Knowledge Cutoff:** August 31, 2025
- **Data Centers:** Microsoft Azure + Stargate infrastructure

### Zhipu AI GLM-4.7
- **Released:** December 22, 2025
- **Builder:** Zhipu AI (China)
- **Type:** Frontier foundation model
- **Parameters:** ~400B
- **Context Window:** 200K input / 128K output
- **Architecture:** MoE (Mixture of Experts)
- **Key Innovations:** "Vibe Coding" capabilities; massive output capacity; open source. GLM-4.7-Flash (30B MoE, ~3B active) launched January 19, 2026.
- **Data Centers:** China (Beijing and other domestic locations)

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

### Google Antigravity IDE (Preview)
- **Released:** November 18, 2025 (alongside Gemini 3)
- **Builder:** Google
- **Type:** AI-native IDE
- **Key Innovations:** Built on Windsurf acquisition ($2.4B); Sergey Brin personally involved. Free public preview for macOS, Windows, Linux. Supports Claude Opus 4.6, GPT-OSS-120B alongside Gemini models. No MCP support (uses Google's own extension system). Gemini 3.1 Pro integration added February 2026.

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

## January 2026

### [MARKET] xAI Raises $20B at $200B+ Valuation
- **Date:** January 2026
- **Details:** xAI raised $20 billion from NVIDIA, Cisco, and Fidelity, bringing total funding to over $42 billion and valuation near $230B.
- [TechFundingNews](https://techfundingnews.com/xai-nears-a-230b-valuation-with-20b-funding-from-nvidia-and-others-to-challenge-openai-and-anthropic/)

### [MARKET] Microsoft Reports $7.6B Gain from OpenAI
- **Date:** January 28, 2026
- **Details:** Microsoft reported OpenAI lifted its net income by $7.6 billion in one quarter.
- [TechCrunch](https://techcrunch.com/2026/01/28/microsoft-earnings-7-6-billion-openai/)

### [POLICY] Trump Signs EO: "Ensuring a National Policy Framework for AI"
- **Date:** December 11, 2025 (context for Jan 2026 landscape)
- **Details:** Sought to preempt state AI laws; established an AI Litigation Task Force under the Attorney General; directed Commerce Secretary to identify conflicting state laws; conditioned federal broadband funds on state AI law compliance. Responded to 1,000+ AI bills introduced in state legislatures in 2025.
- [White House](https://www.whitehouse.gov/presidential-actions/2025/12/eliminating-state-law-obstruction-of-national-artificial-intelligence-policy/)

### [INFRA] Stargate Project Expands to 5 New Sites, ~7 GW Planned
- **Date:** Announced January 21, 2025; expanded September 2025
- **Details:** $500B AI infrastructure joint venture (OpenAI, SoftBank, Oracle, MGX). Construction began mid-2024 in Abilene, Texas (1,000+ acres). Phase 1 live in 2025 (Oracle delivering first GB200 racks). 5 new sites announced Sep 2025: Shackelford County TX, Dona Ana County NM, Lordsburg OH, Milam County TX, plus one midwestern location. Total: nearly 7 GW planned capacity, $400B+ investment over 3 years. SoftBank and OpenAI each 40% ownership ($19B each initial capital). Abilene sales tax revenue up 40% in 2025.
- [CNBC](https://www.cnbc.com/2025/09/23/openai-first-data-center-in-500-billion-stargate-project-up-in-texas.html) | [Wikipedia](https://en.wikipedia.org/wiki/Stargate_LLC)

### Alibaba Qwen3-Max-Thinking
- **Released:** January 27, 2026
- **Builder:** Alibaba Cloud (Qwen Team)
- **Type:** Reasoning-enhanced LLM (trillion-parameter flagship)
- **Key Innovations:** Enhanced chain-of-thought reasoning on top of Qwen3-Max; reportedly rivaling GPT-5.2
- **Training Data:** Extended from Qwen3 training (36T+ tokens, 119 languages)
- **Data Centers:** Alibaba Cloud — Beijing (mainland China), Singapore (international); new facilities planned in Brazil, France, Netherlands, Mexico, Japan, South Korea, Malaysia, Dubai

### OpenAI GPT-5.2-Codex
- **Released:** January 14, 2026
- **Builder:** OpenAI
- **Type:** Coding-optimized frontier LLM
- **Key Innovations:** Optimized for agentic coding: context compaction, long-horizon tasks, Windows environments, cybersecurity
- **Benchmarks:** SWE-Bench Pro: 56.4% | Terminal-Bench 2.0: 64.0%
- **Data Centers:** Microsoft Azure Fairwater sites + Stargate
- **Availability:** Codex app, API; succeeded by GPT-5.3-Codex on February 5

---

## February 2026

### OpenAI $110B Funding Round (Amazon $50B, NVIDIA $30B, SoftBank $30B)
- **Announced:** February 27, 2026
- **Builder:** OpenAI
- **Key Details:** $730B pre-money valuation. Amazon $50B ($15B initial + $35B conditional), NVIDIA $30B, SoftBank $30B. AWS becomes exclusive third-party cloud distribution for "OpenAI Frontier." OpenAI expanding AWS commitment by $100B over 8 years (~2GW Trainium capacity).
- [OpenAI Newsroom](https://openai.com/index/openai-funding/) | [CNBC](https://www.cnbc.com/2026/02/27/openai-closes-110-billion-funding-round.html)

### Anthropic $30B Series G at $380B Valuation
- **Announced:** February 12, 2026
- **Builder:** Anthropic
- **Key Details:** Co-led by Coatue, GIC, D.E. Shaw Ventures, Dragoneer, Founders Fund, Iconiq, MGX. Microsoft and NVIDIA participated. Total raised to date: ~$64B. Run-rate revenue: $14B. ARR trajectory: $1B (Dec 2024) → $4B (mid-2025) → $9B (end 2025) → $14B (Feb 2026) — 14x growth in 14 months.
- [Anthropic News](https://www.anthropic.com/news) | [WSJ](https://www.wsj.com/tech/ai/anthropic-raises-30-billion-at-380-billion-valuation-92830402)

### [MARKET] "SAASpocalypse" — $285B Single-Day Software Selloff
- **Date:** February 3, 2026
- **Details:** Claude Cowork and its 11 open-source plugins triggered the largest single-day software selloff in history. ~$285B wiped from global software/tech stocks in one session. Thomson Reuters -15%, LegalZoom -20%, RELX -14%, DocuSign/Salesforce/Adobe/ServiceNow -7% to -11%. The iShares Expanded Tech-Software ETF (IGV) plunged 28% from its Sept 2025 peak. Over $2 trillion in SaaS market cap erased cumulatively. Selloff stabilized Feb 24 after Anthropic CEO pivoted messaging to "human augmentation."
- [Fortune](https://fortune.com/2026/02/06/anthropic-claude-opus-4-6-stock-selloff-new-upgrade/) | [Investing.com](https://www.investing.com/analysis/the-claude-crash-how-ai-triggered-a-historic-selloff-in-software-stocks-200674483)

### [MARKET] NVIDIA Approaches $5 Trillion Valuation
- **Date:** February 7, 2026
- **Details:** CNN reported NVIDIA's path to becoming the first company valued at roughly $4.8–$5 trillion, driven by AI chip dominance. FY2025 revenue: $130.5B (+114% YoY). Data center = ~90% of total revenue.
- [CNN Business](https://www.cnn.com/2026/02/07/business/nvidia-trillion-valuation-ai-chips-vis)

### Perplexity "Computer"
- **Released:** February 25, 2026
- **Builder:** Perplexity AI
- **Type:** Multi-model orchestration agent platform
- **Key Innovations:** Coordinates 19 models — Claude Opus 4.6 for central reasoning, Gemini for research, GPT-5.2 for long-context recall, Grok for lightweight tasks, plus specialized image/video models. Workflows can run for hours or months autonomously. 400+ app integrations.
- **Benchmarks:** DRACO benchmark: 67.15% (leading)
- **Pricing:** $200/month (Max tier)
- [VentureBeat](https://venturebeat.com/technology/perplexity-launches-computer-ai-agent-that-coordinates-19-models-priced-at)

### GitHub Copilot CLI GA
- **Released:** February 25, 2026
- **Builder:** GitHub / Microsoft
- **Type:** Terminal-based AI coding agent
- **Key Innovations:** Plan mode, Autopilot mode, multi-model support (Opus 4.6, GPT-5.3-Codex, Gemini 3 Pro), Fleet mode for parallel subagents, background cloud delegation. V1.0 formally stamped March 6. 15M+ total Copilot users.
- [GitHub Changelog](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/)

### Anthropic Claude Cowork
- **Released:** Late January 2026 (macOS preview); February 11 (Windows); February 24 (enterprise connectors)
- **Builder:** Anthropic
- **Type:** Desktop AI productivity agent for knowledge workers
- **Key Innovations:** Reads/edits/creates local files, automates browser tasks, connects to Google Drive, Gmail, DocuSign, FactSet via MCP connectors. Triggered $285B selloff in enterprise software stocks (Thomson Reuters -16%, LegalZoom -20%, FactSet -10%). Boris Cherny built the product via vibe coding with Claude Code in under two weeks.
- [VentureBeat](https://venturebeat.com/orchestration/anthropic-says-claude-code-transformed-programming-now-claude-cowork-is) | [CNN](https://www.cnn.com/2026/02/04/investing/us-stocks-anthropic-software) | [Fortune](https://fortune.com/2026/02/06/anthropic-claude-opus-4-6-stock-selloff-new-upgrade/)

### OpenAI GPT-5.3-Codex-Spark
- **Released:** February 12, 2026
- **Builder:** OpenAI
- **Type:** Distilled coding-specific LLM (research preview)
- **Parameters:** Distilled variant of Codex 5.3 (undisclosed)
- **Context Window:** 128K tokens (text-only)
- **Key Innovations:** First OpenAI model running on Cerebras WSE-3 chips (not NVIDIA); inference at 1,000+ tokens/sec (15x standard Codex 5.3); per-roundtrip overhead dropped 80%, per-token overhead fell 30%, time-to-first-token cut in half
- **Benchmarks:** Terminal-Bench 2.0: 58.4% | SWE-Bench Pro: ~16 pts below full Codex 5.3 | Matches Codex 5.3 accuracy in 2-3 min vs 15-17 min
- **Training Data:** Distilled from GPT-5.3-Codex (undisclosed specifics)
- **Data Centers:** OpenAI Stargate (Abilene, TX) + Cerebras partnership infrastructure; Microsoft Azure Fairwater sites (Wisconsin, Georgia, Arizona)
- **Availability:** ChatGPT Pro subscribers

### Anthropic Claude Opus 4.6
- **Released:** February 5, 2026
- **Builder:** Anthropic
- **Type:** Frontier multimodal LLM
- **Parameters:** Undisclosed
- **Context Window:** 200K tokens (1M in beta); 128K max output
- **Key Innovations:** Enhanced agentic coding with Agent Teams (sub-agent coordination); extended thinking; Constitutional AI safety framework. 16 Opus 4.6 agents wrote a C compiler in Rust capable of compiling the Linux kernel (~$20K cost). METR 50%-time horizon: 14 hours 30 minutes.
- **Benchmarks:** SWE-bench Verified: 80.8% | OSWorld: 72.7% | ARC-AGI-2: 68.8% (vs 37.6% for Opus 4.5) | MRCR v2: 76%
- **Pricing:** $5/$25 per million tokens (input/output)
- **Training Data:** Web data, books, code, academic sources (specifics undisclosed); trained using Constitutional AI with RLHF
- **Data Centers:** AWS (primary — Project Rainier in Indiana/Pennsylvania/Mississippi, 500K+ Trainium2 chips); Google Cloud TPUs (up to 1M chips); Microsoft Azure ($30B commitment); own data centers planned in Texas and New York ($50B infrastructure plan)
- **Availability:** API, Claude.ai, Amazon Bedrock, Google Vertex AI
- [Anthropic](https://www.anthropic.com/claude) | [API Docs](https://docs.anthropic.com/)

### Anthropic Claude Sonnet 4.6
- **Released:** February 17, 2026
- **Builder:** Anthropic
- **Type:** Mid-tier multimodal LLM
- **Context Window:** 200K tokens (1M in beta)
- **Key Innovations:** Hybrid reasoning architecture — near-instant responses or extended thinking depending on task. Developers preferred Sonnet 4.6 over Sonnet 4.5 70% of the time and over Opus 4.5 59% of the time.
- **Benchmarks:** SWE-bench Verified: 79.6% | OSWorld: 72.5% (within 1-2 points of Opus 4.6)
- **Pricing:** $3/$15 per million tokens (same as Sonnet 4.5)
- **Data Centers:** Same as Opus 4.6
- [Anthropic](https://www.anthropic.com/claude)

### OpenAI GPT-5.3-Codex
- **Released:** February 5, 2026
- **Builder:** OpenAI
- **Type:** Frontier coding/agentic LLM
- **Key Innovations:** Designed to work autonomously for minutes or hours on complex programming tasks; native git operations, data analysis, and broad agentic capabilities; first model instrumental in creating itself (self-bootstrapping)
- **Benchmarks:** Terminal-Bench 2.0: 77.3% | SWE-Bench Pro: 56.8%
- **Training Data:** Undisclosed (likely similar to GPT-5 series with code-heavy emphasis)
- **Data Centers:** Microsoft Azure Fairwater sites + Stargate
- **Availability:** Codex app, CLI, and IDE extension

### xAI Grok 4.20 Beta
- **Released:** February 17, 2026
- **Builder:** xAI (Elon Musk)
- **Type:** Multi-agent collaborative LLM system
- **Key Innovations:** 4-agent collaboration system (Grok, Harper, Benjamin, Lucas) with rapid learning architecture and weekly updates
- **Pricing:** Free with limits; $30/month SuperGrok
- **Data Centers:** Colossus — Memphis, TN

### Zhipu AI GLM-5
- **Released:** February 11–12, 2026
- **Builder:** Zhipu AI (China)
- **Type:** Frontier MoE foundation model
- **Parameters:** 744B total / 40B active
- **Key Innovations:** Trained entirely on 100,000 Huawei Ascend 910B chips (no NVIDIA hardware); MIT license. Stock surged 34% on release.
- **Data Centers:** China (Beijing and other domestic locations; Huawei Ascend infrastructure)

### Spotify "Honk" System (Reported)
- **Reported:** February 12, 2026 (Spotify Q4 2025 earnings)
- **Builder:** Spotify (internal tool built on Claude Code)
- **Type:** Internal AI deployment system integrated with Slack ChatOps
- **Key Innovations:** Best developers haven't written a line of code since December 2025; engineers deploy fixes via Slack from phones. ~50% of all Spotify code updates flow through the system. 1,500+ PRs generated.
- [TechCrunch](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/)

### OpenAI Codex App (macOS)
- **Released:** February 2, 2026 (Windows: March 4)
- **Builder:** OpenAI
- **Type:** Native desktop agentic coding application
- **Key Innovations:** Codex CLI rewritten in Rust (95.7% Rust as of v0.98.0 Feb 5); Landlock sandboxing on Linux, Apple Seatbelt on macOS

### Snowflake + OpenAI $200M Partnership
- **Announced:** February 2, 2026
- **Key Details:** Multi-year agreement making OpenAI models natively available to Snowflake's 12,600 customers via Cortex AI. Snowflake also has separate $200M deal with Anthropic (December 2025).

### [INFRA] Microsoft AI Capex Tracking Toward $120B+ in FY2026
- **Date:** February 2026
- **Details:** FY2025 actual ~$88.2B (+58% YoY). FY2026 tracking toward $120B+; Q1 FY2026 alone was $34.9B ($11.1B on data center leases). $80B of Azure orders unfulfillable due to power constraints. Remaining performance obligations: $392B (+51% YoY).
- [CNBC](https://www.cnbc.com/2025/01/03/microsoft-expects-to-spend-80-billion-on-ai-data-centers-in-fy-2025.html) | [DCD](https://www.datacenterdynamics.com/en/news/microsoft-spent-111bn-on-data-center-leases-alone-in-q1-2026/)

### [INFRA] TSMC CoWoS Capacity Doubling but Still Short of AI Demand
- **Date:** Early 2026
- **Details:** CoWoS advanced packaging capacity: ~35K wafers/month (late 2024) → ~70K (end 2025) → 125-130K (end 2026). NVIDIA has locked in over half of capacity through 2026-2027. Even at 130K wafers/month, TSMC estimated ~20% short of NVIDIA's 685K unit demand. Google reduced 2026 TPU target from 4M to 3M due to CoWoS constraints. Full-year 2025 TSMC revenue: NT$3.809 trillion (~$122.9B), +31.6% YoY. 2026 capex: $52-56B.
- [FinancialContent](https://markets.financialcontent.com/wral/article/tokenring-2026-1-1-the-great-packaging-pivot-how-tsmc-is-doubling-cowos-capacity-to-break-the-ai-supply-bottleneck-through-2026)

### NVIDIA Nemotron 3 Nano
- **Released:** Early 2026
- **Builder:** NVIDIA
- **Type:** Open-weight hybrid Mamba-Transformer MoE
- **Context Window:** 1M tokens
- **Key Innovations:** Hybrid Mamba-Transformer architecture; 4x faster inference; open weights
- **Data Centers:** NVIDIA DGX Cloud infrastructure

---

## March 2026

### OpenAI GPT-5.4 (Thinking & Pro)
- **Released:** March 5, 2026
- **Builder:** OpenAI
- **Type:** Frontier multimodal reasoning LLM
- **Context Window:** 1M tokens (128K max output)
- **Key Innovations:** Native computer-use capabilities (screenshots, mouse, keyboard); integrates GPT-5.3-Codex coding capabilities into mainline model; most token-efficient reasoning model yet; 33% fewer errors per claim vs GPT-5.2
- **Benchmarks:** GDPval: 83% match-or-exceed (vs 70.9% GPT-5.2) | OSWorld-Verified: 75.0% (surpassing human 72.4%)
- **Variants:** GPT-5.4 Thinking (Plus/Team/Pro) and GPT-5.4 Pro (Pro/Enterprise)
- **Pricing:** $2.50/1M input, $20.00/1M output (via API)
- **Data Centers:** Microsoft Azure Fairwater sites + Stargate (Abilene, TX)
- **Availability:** ChatGPT Plus/Team/Pro/Enterprise, API (not free tier)
- [OpenAI Blog](https://openai.com/index/gpt-5-4/) | [API Docs](https://platform.openai.com/docs/models)

### OpenAI GPT-5.3 Instant
- **Released:** March 3, 2026
- **Builder:** OpenAI
- **Type:** Conversational LLM (replacing GPT-5.2 Instant)
- **Context Window:** 400K tokens
- **Key Innovations:** 26.8% fewer hallucinations on high-stakes queries (medicine, law, finance) with web search; reduced preachy tone and unnecessary caveats; improved web search integration
- **Availability:** All ChatGPT users, API (`gpt-5.3-chat-latest`), Microsoft 365 Copilot
- **Data Centers:** Microsoft Azure + Stargate
- [OpenAI Blog](https://openai.com/blog)

### JetBrains Air IDE + Junie CLI Beta
- **Released:** March 9, 2026
- **Builder:** JetBrains
- **Type:** AI-native IDE + terminal-based coding agent
- **Key Innovations:** Air is a lightweight AI-native IDE built on abandoned Fleet codebase; public preview for macOS (Linux/Windows later). Junie CLI is an LLM-agnostic terminal agent supporting OpenAI, Anthropic, Google, xAI models. One-click migration from Claude Code, Codex CLI, etc. BYOK pricing from $10/month.
- [JetBrains Blog](https://blog.jetbrains.com/)

### Cursor Automations
- **Released:** March 5, 2026
- **Builder:** Anysphere (Cursor)
- **Type:** Event-driven agentic coding automation
- **Key Innovations:** Agents triggered by GitHub PRs, Slack messages, Linear issues, PagerDuty alerts, cron schedules, and webhooks; agents run in cloud sandboxes with memory across runs; 35%+ of Cursor's own merged PRs created by agents
- **Scale:** Revenue reportedly over $2B ARR; $14B+ valuation
- [Cursor Blog](https://www.cursor.com/blog)

### MCP 2026 Roadmap Published
- **Released:** March 5, 2026 (last updated)
- **Builder:** Anthropic / Linux Foundation
- **Key Innovations:** Four priority areas: Transport Evolution & Scalability, Agent Communication (Tasks primitive), Governance Maturation, Enterprise Readiness. MCP donated to Linux Foundation; OpenAI, Google DeepMind, Microsoft, AWS, Cloudflare joined as founding members. SDK downloads exceed 97M/month. Security concern: 30 CVEs in 60 days; 38% of 500+ scanned servers lack authentication.
- [Spec](https://spec.modelcontextprotocol.io) | [Roadmap](https://modelcontextprotocol.io/development/roadmap)

### [INFRA] NVIDIA GTC 2026
- **Date:** March 16–19, 2026
- **Location:** San Jose McEnery Convention Center (hybrid)
- **Scale:** 30,000+ attendees from 190+ countries; 700+ sessions; 60+ hands-on labs
- **Key Topics:** Physical AI, agentic AI, inference, AI factories; Jensen Huang keynote March 16

### [MARKET] Anthropic Approaches $20B ARR
- **Date:** March 2026
- **Details:** Anthropic's annualized revenue run rate reached ~$19-20B. Claude Code went from $0 to $2.5B annualized revenue in 9 months — one of the fastest product ramps in software history. Epoch AI projects Anthropic could surpass OpenAI in annualized revenue by mid-2026 if trends continue.
- [Bloomberg](https://www.bloomberg.com/news/articles/2026-03-03/anthropic-nears-20-billion-revenue-run-rate-amid-pentagon-feud) | [Epoch AI](https://epoch.ai/data-insights/anthropic-openai-revenue)

### [INFRA] Google Doubles AI Capex Guidance to $175-185B
- **Date:** Early 2026
- **Details:** Alphabet raised 2026 capex guidance to $175-185B (~60% servers, ~40% data centers/networking), roughly doubling 2025's $91.4B. Cloud backlog surged 55% sequentially to $240B. CEO Pichai: what keeps him up at night is "compute capacity."
- [CNBC](https://www.cnbc.com/2026/02/04/alphabet-resets-the-bar-for-ai-infrastructure-spending.html) | [Fortune](https://fortune.com/2026/02/04/alphabet-google-ai-spending-supply-constraints/)

### [INFRA] Amazon AI Capex to Hit $200B in 2026
- **Date:** Early 2026
- **Details:** Amazon guided $200B capex for 2026, predominantly for AWS AI infrastructure. Custom chips business (Graviton + Trainium) now $10B+ annual run-rate, growing triple digits YoY. AWS annualized at $142B.
- [Yahoo Finance](https://finance.yahoo.com/news/amazon-200-billion-ai-spending-153341517.html)

### [INFRA] Meta Plans $115-135B AI Capex for 2026
- **Date:** Early 2026
- **Details:** Near-doubling from 2025's $72.2B. Hyperion (Louisiana) 2GW data center complex, scalable to 5GW; $27B joint venture with Blue Owl Capital. Zuckerberg says $600B+ on U.S. data centers by 2028. Plans to exceed 10 GW total owned capacity by late 2026.

### [INFRA] Oracle Raises AI Capex to $50B for FY2026
- **Date:** Early 2026
- **Details:** Raised from original $35B guidance (+136% over FY2025). Remaining Performance Obligations: $523B. $300B, 5-year agreement with OpenAI for 4.5 GW of data center capacity. Tripling MultiCloud data centers; 47 new facilities in 12 months.
- [Futurum](https://futurumgroup.com/insights/oracle-q2-fy-2026-cloud-grows-capex-rises-for-ai-buildout/)

### [INFRA] BlackRock-Led Consortium Acquires Aligned Data Centers ($40B)
- **Date:** Early 2026
- **Details:** Largest data center company acquisition ever. Aligned has 50+ campuses, 5+ GW capacity across North and Latin America. Closing expected H1 2026. BlackRock's AI Infrastructure Partnership has raised $12.5B toward its $30B equity / $100B total target.
- [Data Center Frontier](https://www.datacenterfrontier.com/hyperscale/article/55323360/blackrock-led-consortium-to-acquire-aligned-data-centers-in-40-billion-ai-infrastructure-deal)

### [INFRA] Broadcom AI Revenue Doubles, Custom ASIC Backlog $73B
- **Date:** Q1 FY2026 (ending Feb 2026)
- **Details:** Revenue $19.31B (+29% YoY). AI revenue $8.4B (+106% YoY). Custom AI ASIC revenue +140%. AI networking revenue +60%. Backlog of $73B across XPUs and networking. CEO Tan: "line of sight to achieve AI revenue from chips in excess of $100 billion in 2027." Potential $100-200B OpenAI "Titan" deal.
- [Analytics Insight](https://www.analyticsinsight.net/news/broadcom-ai-revenue-jumps-106-as-custom-chips-drive-growth)

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
| **OpenAI** | Stargate: Abilene TX (1.2GW), Shackelford Co TX, Dona Ana Co NM, Lordstown OH, Milam Co TX (~7GW planned); Microsoft Azure: Iowa, Arizona, Wisconsin (Fairwater 300MW), Georgia | NVIDIA H100/H200/GB200; planned 26GW total |
| **Anthropic** | AWS Project Rainier: Indiana, Pennsylvania, Mississippi; Google Cloud TPUs (up to 1M); Azure; own DCs planned in Texas & New York ($50B). Projected $80B cloud spend through 2029. | AWS Trainium2 (500K–1M chips), Google TPUs (up to 1M), NVIDIA GPUs |
| **Google DeepMind** | Multiple undisclosed sites (multi-DC training confirmed); TPU Cloud: North America, Europe, Asia. $175-185B capex planned for 2026. | Custom TPUs v4/v5e/Trillium (6th-gen)/Ironwood; liquid-cooled since 2018 |
| **Meta** | 26+ US campuses, 50M+ sq ft. Hyperion (Louisiana, 2-5GW). Plans to exceed 10 GW by late 2026. $115-135B capex for 2026. | NVIDIA GPUs (massive clusters) |
| **xAI** | Colossus: Memphis, TN (3 buildings, 200K+ GPUs, expanding to 1M GPUs, ~2GW) | NVIDIA H100/GB200 |
| **Microsoft** | Global Azure footprint. $120B+ FY2026 capex. $80B unfulfillable orders (power constrained). $392B remaining obligations. | NVIDIA GPUs, custom Azure chips |
| **Amazon/AWS** | Global. $200B capex for 2026. Custom chips $10B+ run-rate. | Graviton, Trainium (custom), NVIDIA GPUs |
| **Oracle** | 47 new facilities in 12 months. Stargate: $300B, 5yr deal with OpenAI for 4.5GW. $50B FY2026 capex. $523B remaining obligations. | NVIDIA GB200, custom |
| **Zhipu AI** | Beijing (China) and other domestic locations | Huawei Ascend 910B (100K chips for GLM-5 training) |
| **DeepSeek** | Hangzhou (China); underwater DC off Hainan Island; desert DCs in Xinjiang; SE Asia partnerships; global cloud (AWS/GCP/Azure) | NVIDIA H800 (training), Huawei Ascend (inference) |
| **Alibaba** | Beijing (mainland China); Singapore (international); expanding to Brazil, France, Netherlands, Mexico, Japan, South Korea, Malaysia, Dubai | Alibaba Cloud infrastructure |
| **Mistral AI** | Essonne, France (40MW, 18K NVIDIA Grace Blackwell chips); Eclairion facility, Bruyeres-le-Chatel | NVIDIA Grace Blackwell Superchips |

## Hyperscaler AI Capex Summary

| Year | Total CapEx (Big 5) | YoY Growth | Notes |
|------|-------------------|------------|-------|
| 2023 | ~$157B | — | AI spending accelerating |
| 2024 | ~$256B | +63% | NVIDIA AI revenue explodes |
| 2025 | ~$443B | +73% | Power becomes binding constraint |
| 2026 (proj.) | ~$602-690B | +36% | Goldman projects $1.15T total 2025-2027 |

## Key AI Data Center Regions

| Region | Scale | Key Details |
|--------|-------|-------------|
| **Northern Virginia** | 199 DCs, 30M+ sq ft, 70%+ of world internet traffic | Google $9B investment; Dominion projects 13.3 GW peak demand by 2038 (from 2.8 GW in 2022); 11 GW diesel generator permits |
| **Texas (Abilene/Stargate)** | ~7 GW planned across multiple sites | $500B JV (OpenAI/SoftBank/Oracle/MGX); Abilene sales tax +40% in 2025; housing crisis |
| **Frankfurt, Germany** | 194 DCs, 1,100 MW, 59% of German market | Google EUR 5.5B; Microsoft EUR 3.2B; AWS ~$9.44B; 18-24 month power connection delays |
| **Singapore** | Sub-1% vacancy, strict green requirements | Moratorium relaxed 2022; 700MW Jurong Island park; AWS SGD 12B; Google $5B |

---

## Key Industry Trends (2010–2026)

### Technical Trajectory
1. **The deep learning arc:** ILSVRC 2010 (28.2% error, traditional methods) → AlexNet 2012 (15.3%, GPUs + deep learning) → ResNet 2015 (3.57%, surpasses human) → Transformers 2017 (attention replaces CNNs/RNNs) → GPT-3 2020 (scaling emergence) → ChatGPT 2022 (mass adoption)
2. **Scale explosion:** GPT-3 (175B, 2020) → GPT-4 (~1.8T MoE, 2023) → Llama 4 Behemoth (~2T MoE, 2025) → GLM-5 (744B MoE, 2026) → multi-trillion parameter frontier models
3. **Training data growth:** 500B tokens (GPT-3, 2020) → 14.8T tokens (DeepSeek V3, 2024) → 36T tokens (Qwen3, 2025) → estimated 70T+ tokens (GPT-5)
4. **Context windows:** 2K (GPT-3) → 128K (GPT-4 Turbo) → 1M (Gemini/Claude beta) → 10M (Llama 4 Scout)
5. **Reasoning revolution (2024–2026):** OpenAI o1 pioneered RLVR; DeepSeek R1 democratized it; by early 2026 multi-agent reasoning systems (Grok 4.20's 4-agent system, Perplexity's 19-model orchestration) are the new frontier
6. **MoE architecture dominance:** Dense models gave way to sparse MoE (DeepSeek V3, Llama 4, Mixtral, Mistral Large 3, GLM-5)
7. **Open-weight shift:** Meta Llama dominated 2023–2024; Alibaba Qwen overtook by mid-2025; DeepSeek R1 proved open weights could match frontier proprietary models
8. **Declining transparency:** GPT-3 disclosed exact training data; GPT-4/5 disclosed almost nothing

### Market & Capital
9. **Capital acceleration:** Hyperscaler AI capex: ~$157B (2023) → ~$256B (2024) → ~$443B (2025) → ~$602-690B (2026 projected). Goldman Sachs projects $1.15T total 2025-2027. Capex intensity now 45-57% of revenue.
10. **NVIDIA's ascent:** From GPU gaming company to most valuable company on Earth. $2T (Feb 2024) → $3T (Jun 2024) → $4T (Jul 2025) → ~$5T (Feb 2026). ~85% AI accelerator market share.
11. **Private AI funding explosion:** OpenAI total: ~$168B (11 rounds). Anthropic total: ~$64B. xAI total: ~$42B. AI share of global VC: ~31-40% (2025).
12. **Market shocks:** DeepSeek crash ($1T wipeout, Jan 2025); SAASpocalypse ($285B in one day, $2T+ cumulative, Feb 2026). Both triggered by AI succeeding, not failing.
13. **Infrastructure race:** $500B+ Stargate, $50B Anthropic DC plan, $53B Alibaba expansion, $109B French AI sovereignty program; BlackRock $100B AI infrastructure fund

### Geopolitics & Policy
14. **US-China AI competition:** Export controls (Oct 2022 → escalating through 2025); China responds with indigenous chips (Huawei Ascend, SMIC 7nm) and competitive models (DeepSeek R1, GLM-5 on non-NVIDIA hardware)
15. **Regulation divergence:** EU leads on binding regulation (AI Act, effective Aug 2024). US oscillates between oversight (Biden EO 14110, Oct 2023) and deregulation (Trump revocation, Jan 2025). China leads on sector-specific rules (world's first generative AI regulation, Aug 2023).
16. **Presidential AI arc:** Obama (study/report, 2016) → Trump 1.0 (executive order, no funding, 2019) → Biden (comprehensive regulation, 2023) → Trump 2.0 (deregulate, preempt states, 2025). First State of the Union mention of AI: Biden, March 2024.
17. **Middle East emergence:** Saudi Arabia ($100B Project Transcendence); UAE (first AI ministry, 2017; Stargate UAE 5GW campus); BlackRock/Microsoft/MGX $30B partnership.

### Technical Infrastructure
18. **Data center geography:** Northern Virginia remains "Data Center Alley" (199 DCs, 70%+ of world internet traffic). Texas emerges as AI hub (Stargate, Abilene). Singapore reopens after moratorium. Frankfurt at 1,100 MW installed capacity.
19. **Power as the binding constraint:** Dominion projects Virginia peak DC power demand of 13.3 GW by 2038 (from 2.8 GW in 2022). Microsoft has $80B in unfulfillable Azure orders due to power constraints. TSMC CoWoS capacity ~20% short of NVIDIA demand despite doubling.
20. **Agentic AI era:** Coding agents (Claude Code, Codex CLI, Copilot CLI, Cursor) move from reactive tools to proactive platforms; Spotify's entire engineering workflow runs through AI agents
21. **Protocol wars:** MCP (tool access, Linux Foundation), A2A (agent-to-agent, Google), ACP (JetBrains/Zed) — three competing standards for agent infrastructure

---

*Sources consulted: OpenAI technical reports and blog posts, Anthropic documentation and news, Google DeepMind publications, Meta AI blog, DeepSeek technical reports, Mistral AI docs, Cohere documentation, xAI announcements, Zhipu AI announcements, JetBrains blog, GitHub blog and changelogs, NVIDIA GTC and newsroom, Wikipedia, arXiv papers, NeurIPS/CVPR/ICML proceedings, Sebastian Raschka's State of LLMs 2025, Simon Willison's Year in LLMs 2025, Andrej Karpathy's 2025 LLM Review. Government sources: White House archives (Obama, Trump, Biden), BIS export control regulations, EU Parliament AI Act documentation, Senate Judiciary Committee hearing transcripts, GOV.UK AI Safety Summit records, CSIS, Brookings, Stanford HAI. Market/financial: CNBC, Fortune, Bloomberg, Wall Street Journal, Goldman Sachs research, Morgan Stanley, Morningstar, Crunchbase, TechCrunch, Yahoo Finance, Investing.com. Infrastructure: Data Center Dynamics, Data Center Frontier, CBRE, Futurum Group, BlackRock press releases, Visual Capitalist, Epoch AI. Scientific: Nature, Science, arXiv, ImageNet/Stanford Vision Lab, Nobel Prize Committee. Regional: Japan Times, Arab News, AlgorithmWatch, Inside Climate News, Middle East Institute, Soufan Center.*
