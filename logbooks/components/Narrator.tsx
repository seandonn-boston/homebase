"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Voice auto-selection — prefers British English female voices,     */
/*  degrades gracefully so the narrator always has *some* voice if    */
/*  any English voice exists on the device.                           */
/* ------------------------------------------------------------------ */

// Known male English voice names — deprioritized
const MALE_NAMES =
  /\b(daniel|george|oliver|arthur|ryan|thomas|david|mark|alex|fred|guy|james|aaron|tom|brian)\b/i;
const MALE_LABEL = /\bmale\b/i;

const isEnGB = (v: SpeechSynthesisVoice) => /^en[-_]gb/i.test(v.lang);
const isEn = (v: SpeechSynthesisVoice) => /^en[-_]/i.test(v.lang) || /^en$/i.test(v.lang);
const isNeural = (v: SpeechSynthesisVoice) => /(natural|neural|online|enhanced|premium)/i.test(v.name);
const looksMale = (v: SpeechSynthesisVoice) => MALE_NAMES.test(v.name) || MALE_LABEL.test(v.name);

// Tiered preference list, best to worst. Soft, warm, conversational
// en-GB female voices are preferred over the clear-but-formal news-anchor
// voices (Sonia). We never return null if any English voice exists —
// falling back to a plausible voice is better than disabling the narrator.
const VOICE_PREFS: Array<(v: SpeechSynthesisVoice) => boolean> = [
  // ── Tier 1: softest en-GB female neural voices (Edge) ──
  // Libby — warm, conversational, the gentlest of the en-GB Edge voices
  (v) => isEnGB(v) && isNeural(v) && /libby/i.test(v.name),
  // Hollie — soft, gentle storyteller voice
  (v) => isEnGB(v) && isNeural(v) && /hollie/i.test(v.name),
  // Bella — soft, intimate
  (v) => isEnGB(v) && isNeural(v) && /bella/i.test(v.name),
  // Olivia — warm, mature
  (v) => isEnGB(v) && isNeural(v) && /olivia/i.test(v.name),
  // Abbi — younger, soft
  (v) => isEnGB(v) && isNeural(v) && /abbi/i.test(v.name),
  // Sonia — clear, slightly formal (BBC newsreader tone)
  (v) => isEnGB(v) && isNeural(v) && /sonia/i.test(v.name),
  // Any other en-GB female neural voice not obviously male
  (v) => isEnGB(v) && isNeural(v) && !looksMale(v) && !/maisie/i.test(v.name),
  // Maisie last — child voice, usually not what you want for narration
  (v) => isEnGB(v) && isNeural(v) && /maisie/i.test(v.name),

  // ── Tier 2: en-GB female, classic (non-neural) ──
  (v) => /google uk english female/i.test(v.name),
  // Serena (macOS) — softest of the Apple en-GB female voices
  (v) => isEnGB(v) && /serena/i.test(v.name),
  // Other Apple en-GB female voices
  (v) => isEnGB(v) && /\b(kate|martha|stephanie|fiona|hazel|susan)\b/i.test(v.name),
  (v) => isEnGB(v) && /female/i.test(v.name),

  // ── Tier 3: any en-GB voice not obviously male ──
  (v) => isEnGB(v) && !looksMale(v),

  // ── Tier 4: en-IE / en-AU / en-NZ female ──
  (v) => /^en[-_](ie|au|nz)/i.test(v.lang) && isNeural(v) && !looksMale(v),
  (v) => /^en[-_](ie|au|nz)/i.test(v.lang) && !looksMale(v),

  // ── Tier 5: any English neural female ──
  (v) => isEn(v) && isNeural(v) && /female/i.test(v.name),
  (v) => isEn(v) && isNeural(v) && !looksMale(v),

  // ── Tier 6: any English female ──
  (v) => isEn(v) && /female/i.test(v.name),
  (v) => isEn(v) && /\b(samantha|karen|moira|tessa|veena|zira|allison|ava|emma|jenny)\b/i.test(v.name),
  (v) => isEn(v) && !looksMale(v),

  // ── Last resort: any English voice ──
  (v) => isEn(v),
];

interface PickResult {
  voice: SpeechSynthesisVoice;
  tier: number;
}

function pickVoice(all: SpeechSynthesisVoice[]): PickResult | undefined {
  for (let i = 0; i < VOICE_PREFS.length; i++) {
    const found = all.find(VOICE_PREFS[i]);
    if (found) return { voice: found, tier: i };
  }
  // Absolute last fallback: whatever the first voice is
  if (all.length > 0) return { voice: all[0], tier: VOICE_PREFS.length };
  return undefined;
}

// Tier number for any voice — used to sort the dropdown so the
// softest English voices appear at the top of the English group.
function voiceTier(v: SpeechSynthesisVoice): number {
  for (let i = 0; i < VOICE_PREFS.length; i++) {
    if (VOICE_PREFS[i](v)) return i;
  }
  return VOICE_PREFS.length;
}

// Friendly display name — strips verbose Microsoft / Apple decorations
// so the dropdown shows "Libby · en-GB" instead of
// "Microsoft Libby Online (Natural) - English (United Kingdom) · en-GB".
function displayVoiceName(v: SpeechSynthesisVoice): string {
  let name = v.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s+Online\s*\(Natural\)/i, " ✦")
    .replace(/\s+Desktop$/i, "")
    .replace(/\s*-\s*English\s*\([^)]*\)\s*$/i, "")
    .replace(/\s*-\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*\([^)]*\)\s*$/i, "")
    .trim();
  return `${name} · ${v.lang}`;
}

/* ------------------------------------------------------------------ */
/*  Text normalization for speech                                     */
/* ------------------------------------------------------------------ */

const NATO: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three",
  "4": "four", "5": "five", "6": "six", "7": "seven",
  "8": "eight", "9": "niner",
  a: "alpha", b: "bravo", c: "charlie", d: "delta",
  e: "echo", f: "foxtrot", g: "golf", h: "hotel",
  i: "india", j: "juliet", k: "kilo", l: "lima",
  m: "mike", n: "november", o: "oscar", p: "papa",
  q: "quebec", r: "romeo", s: "sierra", t: "tango",
  u: "uniform", v: "victor", w: "whiskey", x: "x-ray",
  y: "yankee", z: "zulu",
};

function normalizeForSpeech(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/\(\s*[,\s]*\)/g, "");
  t = t.replace(/\(\s*,/g, "(");
  t = t.replace(/,\s*\)/g, ")");
  t = t.replace(/\s+([.,;:!?])/g, "$1");
  t = t.replace(/\(\s*\)/g, "");
  t = t.replace(/\s+/g, " ").trim();

  const romans: Record<string, string> = {
    "Act IV": "Act Four",
    "Act III": "Act Three",
    "Act II": "Act Two",
    "Act I": "Act One",
  };
  for (const [k, v] of Object.entries(romans)) {
    t = t.split(k).join(v);
  }

  t = t.replace(/\bREVIEW-(\d)\.md\b/g, "review $1 dot em dee");
  t = t.replace(/\bPLAN\.md\b/g, "plan dot em dee");
  t = t.replace(/\bROADMAP\.md\b/g, "roadmap dot em dee");
  t = t.replace(/\badmiral2\.md\b/gi, "admiral two dot em dee");
  t = t.replace(/\badmiral\.md\b/gi, "admiral dot em dee");

  t = t.replace(/\bv(\d+)\.(\d+)\.(\d+)-([a-zA-Z]+)/g, "v $1 $2 $3 $4");
  t = t.replace(/\bv(\d+)\.(\d+)\.(\d+)/g, "v $1 $2 $3");
  t = t.replace(/\bv(\d+)\.(\d+)/g, "v $1 $2");

  t = t.replace(/\.md\b/g, " dot em dee");
  t = t.replace(/\.ts\b/g, " dot tee ess");
  t = t.replace(/\.tsx\b/g, " dot tee ess ex");
  t = t.replace(/\.js\b/g, " dot jay ess");
  t = t.replace(/\.sh\b/g, " dot shell");
  t = t.replace(/\.json\b/g, " dot jason");
  t = t.replace(/\.py\b/g, " dot pie");
  t = t.replace(/\.toml\b/g, " dot toml");
  t = t.replace(/\.yml\b/g, " dot yaml");
  t = t.replace(/\.yaml\b/g, " dot yaml");

  t = t.replace(/_/g, " ");

  t = t.replace(/\b([0-9a-f]{7,10})\b/g, (m) =>
    "commit " + m.split("").map((c) => NATO[c] || c).join(" ")
  );

  return t;
}

/* ------------------------------------------------------------------ */
/*  Queue construction                                                */
/* ------------------------------------------------------------------ */

interface Chunk {
  el: Element;
  text: string;
}

// Cover every page template — chronicle (.page), phases/graph (.page-wider),
// admiral/getting-started/tutorial (.page-wide), homepage (.hero) — so the
// same audio controls work everywhere.
const PAGE_ROOTS = ".page, .page-wide, .page-wider";
const SELECTOR = [
  // Frontispiece on any page
  `${PAGE_ROOTS} > header.frontispiece h1`,
  `${PAGE_ROOTS} > header.frontispiece .subtitle`,
  // Homepage hero
  ".hero h1",
  ".hero .tagline",
  ".landing-card h2",
  ".landing-card p",
  // Caveat / methodology
  `${PAGE_ROOTS} > .caveat`,
  `${PAGE_ROOTS} > .method`,
  // Chronicle
  `${PAGE_ROOTS} section.act h2`,
  `${PAGE_ROOTS} section.act p`,
  `${PAGE_ROOTS} section.act blockquote li`,
  `${PAGE_ROOTS} section.epilogue h2`,
  `${PAGE_ROOTS} section.epilogue p`,
  // Phase impact
  `${PAGE_ROOTS} section.phase h2`,
  `${PAGE_ROOTS} section.phase p`,
  // Documentation pages (admiral / getting-started / tutorial)
  `${PAGE_ROOTS} section.doc h2`,
  `${PAGE_ROOTS} section.doc h3`,
  `${PAGE_ROOTS} section.doc p`,
  `${PAGE_ROOTS} section.doc li`,
].join(", ");

function buildQueue(includeHashes: boolean): Chunk[] {
  const elements = Array.from(document.querySelectorAll(SELECTOR));
  const chunks: Chunk[] = [];

  for (const el of elements) {
    if (el.closest("[data-skip-narration]")) continue;

    const clone = el.cloneNode(true) as Element;
    if (!includeHashes) {
      clone.querySelectorAll(".sha-link, .paren-sha, .sha").forEach((c) => c.remove());
    }

    const raw = clone.textContent || "";
    const text = normalizeForSpeech(raw);
    if (!text) continue;

    const sentences = text.match(/[^.!?]+[.!?]+["')\]\s]*|[^.!?]+$/g) || [text];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed.length < 2) continue;
      chunks.push({ el, text: trimmed });
    }
  }

  return chunks;
}

function getSectionName(el: Element): string {
  const section = el.closest(
    "section.act, section.epilogue, section.phase, section.doc, header.frontispiece, .hero, .landing-card"
  );
  if (!section) return "";
  if (section.matches("header.frontispiece, .hero")) return "Title";
  if (section.matches(".landing-card")) {
    const label = section.querySelector(".label");
    return label?.textContent?.trim() || "Index";
  }
  if (section.matches("section.phase")) {
    const num = section.querySelector(".phase-number");
    return num?.textContent?.trim() || "Phase";
  }
  const h2 = section.querySelector("h2");
  if (!h2) return "";
  const numeral = h2.querySelector(".numeral");
  return numeral ? numeral.textContent?.trim() || "" : "";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type PlayState = "idle" | "playing" | "paused";

export default function Narrator() {
  const pathname = usePathname();
  const [supported, setSupported] = useState(true);
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState(0.92);
  const [includeHashes, setIncludeHashes] = useState(false);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [status, setStatus] = useState("Ready.");
  const [scrubValue, setScrubValue] = useState(0);
  const [scrubMax, setScrubMax] = useState(0);
  const [scrubLabel, setScrubLabel] = useState("");
  const [hasContent, setHasContent] = useState(true);

  const queueRef = useRef<Chunk[]>([]);
  const cursorRef = useRef(-1);
  const stateRef = useRef<PlayState>("idle");

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = playState;
  }, [playState]);

  /* ---- Voice loading ---- */

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    const synth = window.speechSynthesis;

    function load() {
      const raw = synth.getVoices();
      if (!raw.length) return;
      setVoices(raw);
      const picked = pickVoice(raw);
      if (!picked) {
        setVoiceName("");
        setStatus("No speech voices available on this device.");
        return;
      }
      setVoiceName(picked.voice.name);
      // Tiers 0–3 are en-GB. Tiers 4+ mean we settled for something else.
      if (picked.tier <= 3) {
        const neural = /(natural|neural|online|enhanced|premium)/i.test(picked.voice.name);
        if (!neural) {
          setStatus("Tip: open in Microsoft Edge for a richer British voice.");
        } else {
          setStatus("Ready.");
        }
      } else if (picked.tier <= 5) {
        setStatus("Using best available English voice (no en-GB found).");
      } else {
        setStatus(`Using ${picked.voice.name} — British English voice not found.`);
      }
    }

    synth.onvoiceschanged = load;
    load();
  }, []);

  /* ---- Build queue on mount and on every route change ---- */

  useEffect(() => {
    // Stop any in-flight narration when route changes
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlayState("idle");
    stateRef.current = "idle";
    cursorRef.current = -1;

    // Small delay so the new page DOM is mounted
    const timer = setTimeout(() => {
      const q = buildQueue(includeHashes);
      queueRef.current = q;
      setScrubMax(Math.max(0, q.length - 1));
      setScrubValue(0);
      setHasContent(q.length > 0);
      if (q.length > 0) {
        updateScrubLabel(0, q);
        setStatus("Ready.");
      } else {
        setScrubLabel("");
        setStatus("Nothing to read on this page.");
      }
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ---- Helpers ---- */

  const updateScrubLabel = useCallback((idx: number, q: Chunk[]) => {
    if (!q.length) {
      setScrubLabel("");
      return;
    }
    const clamped = Math.min(idx, q.length - 1);
    const name = getSectionName(q[clamped].el);
    setScrubLabel(`${name} \u00B7 ${clamped + 1}/${q.length}`);
  }, []);

  const clearHighlight = useCallback(() => {
    document.querySelectorAll(".narrating").forEach((el) => el.classList.remove("narrating"));
  }, []);

  const highlight = useCallback(
    (el: Element) => {
      clearHighlight();
      el.classList.add("narrating");
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < 80 || rect.bottom > viewportH - 140) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [clearHighlight]
  );

  const finish = useCallback(() => {
    setPlayState("idle");
    stateRef.current = "idle";
    const q = queueRef.current;
    if (q.length) {
      setScrubValue(q.length - 1);
      updateScrubLabel(q.length - 1, q);
    }
    setStatus("Finished.");
    clearHighlight();
  }, [clearHighlight, updateScrubLabel]);

  const speakNext = useCallback(() => {
    const synth = window.speechSynthesis;
    cursorRef.current++;
    const cursor = cursorRef.current;
    const q = queueRef.current;

    if (cursor >= q.length) {
      finish();
      return;
    }

    const item = q[cursor];
    highlight(item.el);
    setScrubValue(cursor);
    updateScrubLabel(cursor, q);

    const u = new SpeechSynthesisUtterance(item.text);
    const chosen = synth.getVoices().find((v) => v.name === voiceName);
    if (chosen) u.voice = chosen;
    u.rate = rate;
    u.pitch = 1.0;
    u.volume = 1.0;

    u.onend = () => {
      if (stateRef.current === "playing") speakNext();
    };
    u.onerror = () => {
      if (stateRef.current === "playing") speakNext();
    };

    synth.speak(u);
    setStatus(`Reading ${cursor + 1} of ${q.length}`);
  }, [finish, highlight, rate, voiceName, updateScrubLabel]);

  /* ---- Chrome background tab workaround ---- */

  useEffect(() => {
    function onVisChange() {
      if (
        !document.hidden &&
        stateRef.current === "playing" &&
        !window.speechSynthesis.speaking &&
        !window.speechSynthesis.pending
      ) {
        speakNext();
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [speakNext]);

  /* ---- Controls ---- */

  const rebuildQueue = useCallback(
    (hashes: boolean) => {
      const q = buildQueue(hashes);
      queueRef.current = q;
      setScrubMax(Math.max(0, q.length - 1));
      return q;
    },
    []
  );

  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;

    if (stateRef.current === "idle") {
      synth.cancel();
      const q = rebuildQueue(includeHashes);
      cursorRef.current = scrubValue - 1;
      setPlayState("playing");
      stateRef.current = "playing";
      // Inline speakNext to use fresh queue
      const nextCursor = scrubValue;
      cursorRef.current = nextCursor;
      if (nextCursor >= q.length) {
        finish();
        return;
      }
      const item = q[nextCursor];
      highlight(item.el);
      setScrubValue(nextCursor);
      updateScrubLabel(nextCursor, q);
      const u = new SpeechSynthesisUtterance(item.text);
      const chosen = synth.getVoices().find((v) => v.name === voiceName);
      if (chosen) u.voice = chosen;
      u.rate = rate;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onend = () => {
        if (stateRef.current === "playing") speakNext();
      };
      u.onerror = () => {
        if (stateRef.current === "playing") speakNext();
      };
      synth.speak(u);
      setStatus(`Reading ${nextCursor + 1} of ${q.length}`);
      return;
    }

    if (stateRef.current === "playing") {
      synth.pause();
      setPlayState("paused");
      stateRef.current = "paused";
      setStatus("Paused.");
      return;
    }

    if (stateRef.current === "paused") {
      if (scrubValue !== cursorRef.current) {
        synth.cancel();
        cursorRef.current = scrubValue - 1;
        setPlayState("playing");
        stateRef.current = "playing";
        speakNext();
        return;
      }
      synth.resume();
      setPlayState("playing");
      stateRef.current = "playing";
      const q = queueRef.current;
      setStatus(`Reading ${cursorRef.current + 1} of ${q.length}`);
      return;
    }
  }, [
    includeHashes,
    scrubValue,
    rebuildQueue,
    finish,
    highlight,
    updateScrubLabel,
    voiceName,
    rate,
    speakNext,
  ]);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlayState("idle");
    stateRef.current = "idle";
    cursorRef.current = -1;
    setScrubValue(0);
    updateScrubLabel(0, queueRef.current);
    setStatus("Stopped.");
    clearHighlight();
  }, [clearHighlight, updateScrubLabel]);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = parseInt(e.target.value, 10);
      const q = queueRef.current;
      if (idx < 0 || idx >= q.length) return;

      setScrubValue(idx);
      updateScrubLabel(idx, q);
      highlight(q[idx].el);

      if (stateRef.current === "playing") {
        window.speechSynthesis.cancel();
        cursorRef.current = idx - 1;
        speakNext();
      } else {
        cursorRef.current = idx;
      }
    },
    [highlight, speakNext, updateScrubLabel]
  );

  const handleHashToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.checked;
      setIncludeHashes(newVal);

      const q = queueRef.current;
      const currentEl =
        cursorRef.current >= 0 && cursorRef.current < q.length ? q[cursorRef.current].el : null;
      const wasPlaying = stateRef.current === "playing";

      window.speechSynthesis.cancel();
      const newQ = rebuildQueue(newVal);

      let newIdx = 0;
      if (currentEl) {
        for (let i = 0; i < newQ.length; i++) {
          if (newQ[i].el === currentEl) {
            newIdx = i;
            break;
          }
        }
      }

      setScrubValue(newIdx);
      updateScrubLabel(newIdx, newQ);

      if (wasPlaying) {
        cursorRef.current = newIdx - 1;
        setPlayState("playing");
        stateRef.current = "playing";
        speakNext();
      } else {
        cursorRef.current = newIdx;
        if (stateRef.current === "paused") {
          setPlayState("idle");
          stateRef.current = "idle";
        }
        if (currentEl) highlight(currentEl);
      }
    },
    [rebuildQueue, updateScrubLabel, speakNext, highlight]
  );

  // Build the dropdown groups: English voices first (sorted by preference
  // tier so soft en-GB female voices appear at the top), then everything
  // else alphabetically by language and name.
  const grouped = useMemo(() => {
    const english: SpeechSynthesisVoice[] = [];
    const other: SpeechSynthesisVoice[] = [];
    for (const v of voices) {
      if (isEn(v)) english.push(v);
      else other.push(v);
    }
    english.sort((a, b) => {
      const ta = voiceTier(a);
      const tb = voiceTier(b);
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });
    other.sort((a, b) => {
      const langCmp = a.lang.localeCompare(b.lang);
      if (langCmp !== 0) return langCmp;
      return a.name.localeCompare(b.name);
    });
    return { english, other };
  }, [voices]);

  if (!supported) return null;

  const playLabel =
    playState === "idle" ? "Play" : playState === "playing" ? "Pause" : "Resume";

  return (
    <div className="narrator" role="region" aria-label="Narration controls">
      <button
        type="button"
        aria-label="Play or pause narration"
        onClick={handlePlay}
        disabled={!hasContent}
      >
        {playLabel}
      </button>
      <button
        type="button"
        aria-label="Stop narration"
        onClick={handleStop}
        disabled={!hasContent}
      >
        Stop
      </button>
      <input
        type="range"
        min={0}
        max={scrubMax}
        value={scrubValue}
        step={1}
        className="scrubber"
        aria-label="Scrub through narration"
        onChange={handleScrub}
        disabled={!hasContent}
      />
      <span className="scrub-pos">{scrubLabel}</span>
      <label htmlFor="nar-voice">Voice</label>
      <select
        id="nar-voice"
        value={voiceName}
        onChange={(e) => setVoiceName(e.target.value)}
        aria-label="Narration voice"
      >
        {grouped.english.length > 0 && (
          <optgroup label="English">
            {grouped.english.map((v) => (
              <option key={v.name} value={v.name}>
                {displayVoiceName(v)}
              </option>
            ))}
          </optgroup>
        )}
        {grouped.other.length > 0 && (
          <optgroup label="Other languages">
            {grouped.other.map((v) => (
              <option key={v.name} value={v.name}>
                {displayVoiceName(v)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <label htmlFor="nar-rate">Pace</label>
      <input
        id="nar-rate"
        type="range"
        min={0.75}
        max={1.2}
        step={0.05}
        value={rate}
        className="pace"
        aria-label="Reading pace"
        onChange={(e) => setRate(parseFloat(e.target.value))}
      />
      <label htmlFor="nar-hashes" className="hash-toggle">
        <input
          id="nar-hashes"
          type="checkbox"
          checked={includeHashes}
          onChange={handleHashToggle}
          disabled={!hasContent}
        />
        Hashes
      </label>
      <span className="status">{status}</span>
    </div>
  );
}
