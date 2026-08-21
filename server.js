/* PageCraft AI - Backend Server
 * Serves the static frontend and proxies all AI provider calls (Gemini, Groq)
 * and the web search lookup, so provider API keys stay server-side and are
 * never sent to the browser.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Groq's 429 responses include a human-readable "Please try again in X.Xs"
// hint — use it when present instead of guessing a fixed backoff.
function parseRetryAfterMs(message) {
  const match = /try again in ([\d.]+)s/i.exec(message || "");
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  return 4000;
}

/* ---------------------------------------------------- */
/* GEMINI PROXY                                          */
/* ---------------------------------------------------- */
async function callGemini(userPrompt, systemInstruction, temperature = 0.2) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server (.env).");
  }

  const models = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-pro-latest"];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const contents = [];
      if (systemInstruction) {
        contents.push({ role: "user", parts: [{ text: `System Directive: ${systemInstruction}` }] });
        contents.push({ role: "model", parts: [{ text: "Understood. I will adhere strictly to this directive." }] });
      }
      contents.push({ role: "user", parts: [{ text: userPrompt }] });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { temperature } })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        lastErr = new Error(`Gemini ${model} HTTP ${res.status}`);
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Gemini API endpoint failed or returned empty text.");
}

/* ---------------------------------------------------- */
/* GROQ PROXY                                             */
/* ---------------------------------------------------- */
async function callGroq(userPrompt, systemInstruction, webSearchContext, fileContext, temperature = 0.2) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server (.env).");
  }

  const endpoint = "https://api.groq.com/openai/v1/chat/completions";

  const systemContent = systemInstruction ||
    "You are PageCraft Assistant. Use the following web search results to thoroughly answer the user's question. Cross-reference the snippets to find hidden details (like founder names or specific dates). Do not refuse to answer if the exact phrase isn't present; deduce the most likely factual answer from the surrounding context.";

  let userContent = `User Question: ${userPrompt}`;

  if (webSearchContext && webSearchContext.trim()) {
    userContent += `\n\n=== LIVE INTERNET WEB SEARCH RESULTS ===\n${webSearchContext.trim()}`;
  }

  const pitchDeckContext = (fileContext && fileContext.trim()) ? fileContext.trim().slice(0, 8000) : "";
  if (pitchDeckContext) {
    userContent += `\n\n=== UPLOADED PITCH DECK / DOCUMENT CONTEXT ===\n${pitchDeckContext}`;
  }

  // Groq periodically retires/rotates hosted models. If chat completions start
  // 404ing with "model_not_found", call GET /openai/v1/models with this API
  // key to see what's currently available and update this list.
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  let lastErr = null;
  let rateLimitWaitMs = null;

  // Two passes over the model list: the free tier's TPM budget is tight
  // enough that a single chat exchange (search + extraction) can trip a 429
  // on its own, not just from bursty testing — so on a rate limit, wait out
  // Groq's suggested backoff and try the whole list again once.
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) {
      if (!rateLimitWaitMs) break;
      await sleep(rateLimitWaitMs);
    }

    for (const model of models) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemContent },
              { role: "user", content: userContent }
            ],
            temperature
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        } else {
          const errBody = await res.json().catch(() => ({}));
          const msg = errBody.error?.message || `Groq ${model} HTTP ${res.status}`;
          lastErr = new Error(msg);
          if (res.status === 429) rateLimitWaitMs = parseRetryAfterMs(msg);
        }
      } catch (err) {
        lastErr = err;
      }
    }
  }

  throw lastErr || new Error("No response message returned from Groq API.");
}

/* ---------------------------------------------------- */
/* API ROUTES                                             */
/* ---------------------------------------------------- */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    groqConfigured: Boolean(GROQ_API_KEY)
  });
});

app.post("/api/ai/gemini", async (req, res) => {
  try {
    const { prompt, systemInstruction, temperature } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

    const text = await callGemini(prompt, systemInstruction || "", temperature ?? 0.2);
    res.json({ text, provider: "Gemini AI" });
  } catch (err) {
    res.status(502).json({ error: err.message || "Gemini request failed." });
  }
});

app.post("/api/ai/groq", async (req, res) => {
  try {
    const { prompt, systemInstruction, webSearchContext, fileContext, temperature } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

    const text = await callGroq(prompt, systemInstruction || "", webSearchContext || "", fileContext || "", temperature ?? 0.2);
    res.json({ text, provider: "Groq AI" });
  } catch (err) {
    res.status(502).json({ error: err.message || "Groq request failed." });
  }
});

// Generic entry point: tries Groq first, falls back to Gemini (mirrors callAIProvider on the client)
app.post("/api/ai/generate", async (req, res) => {
  const { prompt, systemInstruction, temperature } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

  try {
    const text = await callGroq(prompt, systemInstruction || "", "", "", temperature ?? 0.2);
    return res.json({ text, provider: "Groq AI" });
  } catch (eGroq) {
    try {
      const text = await callGemini(prompt, systemInstruction || "", temperature ?? 0.2);
      return res.json({ text, provider: "Gemini AI" });
    } catch (eGemini) {
      return res.status(502).json({ error: eGroq.message || eGemini.message || "AI Engine Error." });
    }
  }
});

// Structured-extraction endpoint: runs the prompt multiple times (low
// temperature) and merges the resulting JSON objects, keeping whichever
// attempt actually found a value for each field. LLM output is flaky field-
// by-field even when the source text clearly contains the answer, so a single
// call tends to randomly drop a field or two; merging attempts fixes that
// without ever inventing a value no attempt actually produced.
function extractJsonFromText(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const NON_ANSWER = /^(n\/?a|not (mentioned|specified|stated|available|found|applicable)|unknown|none|no data|tbd|null)\.?$/i;
function isMeaningfulValue(v) {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  const s = String(v).trim();
  return s !== "" && !NON_ANSWER.test(s);
}

// Arrays of named objects (foundingTeam, strategicPartners, ...) are unioned
// by name across attempts rather than picking one attempt's array wholesale —
// each individual pass can randomly drop a person even when the text clearly
// lists them, so a person surviving in just one of N attempts is enough to
// keep them in the final result.
function mergeNamedObjectArray(existing, incoming) {
  const byName = new Map((existing || []).map((item) => [String(item?.name || "").toLowerCase().trim(), item]));
  for (const item of incoming) {
    if (!item || !isMeaningfulValue(item.name)) continue;
    const key = String(item.name).toLowerCase().trim();
    if (!key) continue;
    const prior = byName.get(key);
    if (!prior || JSON.stringify(item).length > JSON.stringify(prior).length) {
      byName.set(key, item);
    }
  }
  return Array.from(byName.values());
}

function mergeExtractions(objs) {
  const merged = {};
  for (const obj of objs) {
    if (!obj) continue;
    for (const [key, val] of Object.entries(obj)) {
      if (!isMeaningfulValue(val)) continue;

      if (Array.isArray(val) && val.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
        merged[key] = mergeNamedObjectArray(merged[key], val);
        continue;
      }

      const existing = merged[key];
      if (!isMeaningfulValue(existing)) {
        merged[key] = val;
      } else if (Array.isArray(val) && Array.isArray(existing) && val.length > existing.length) {
        merged[key] = val;
      }
    }
  }
  return merged;
}

app.post("/api/ai/extract-json", async (req, res) => {
  const { prompt, systemInstruction, attempts } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in request body." });

  const runs = Math.min(Math.max(parseInt(attempts, 10) || 2, 1), 3);
  const results = [];
  let providerUsed = "Groq AI";

  for (let i = 0; i < runs; i++) {
    try {
      const text = await callGroq(prompt, systemInstruction || "", "", "", 0);
      providerUsed = "Groq AI";
      results.push(extractJsonFromText(text));
    } catch (eGroq) {
      try {
        const text = await callGemini(prompt, systemInstruction || "", 0);
        providerUsed = "Gemini AI";
        results.push(extractJsonFromText(text));
      } catch (eGemini) {
        results.push(null);
      }
    }
  }

  const data = mergeExtractions(results);
  res.json({ data, provider: providerUsed, attempts: runs, foundAnything: Object.keys(data).length > 0 });
});

// Strips a raw HTML document down to readable text: drops script/style/
// comment blocks, turns block-level tags into line breaks, removes the rest
// of the markup, and decodes the handful of entities that show up constantly
// on real-world marketing/about pages.
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/header|\/footer)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

// Fetches a startup's website server-side (so there's no browser CORS issue,
// and no API key ever needs exposing) and turns it into plain text the AI
// extraction prompt can read. Besides the given URL, a handful of common
// "about"/"team" subpages are tried too, since that's typically where
// headquarters, team size, and founder details actually live — a homepage
// alone rarely states them.
app.post("/api/fetch-website", async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing 'url' in request body." });

  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return res.status(400).json({ error: "That doesn't look like a valid URL." });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs are supported." });
  }

  const candidateUrls = [
    parsed.href,
    `${parsed.origin}/about`,
    `${parsed.origin}/about-us`,
    `${parsed.origin}/team`,
    `${parsed.origin}/our-team`,
    `${parsed.origin}/company`
  ];

  const seen = new Set();
  const pagesFetched = [];
  let combinedText = "";

  for (const pageUrl of candidateUrls) {
    if (seen.has(pageUrl) || combinedText.length > 20000) continue;
    seen.add(pageUrl);
    try {
      const r = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PageCraftAI/1.0; +https://pagecraft.ai)" },
        redirect: "follow",
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) continue;
      const contentType = r.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;
      const html = await r.text();
      const text = htmlToText(html).slice(0, 6000);
      if (text.length > 100) {
        combinedText += `\n\n--- Page: ${pageUrl} ---\n${text}`;
        pagesFetched.push(pageUrl);
      }
    } catch {
      // Subpage unreachable or timed out — just skip it.
    }
  }

  res.json({
    text: combinedText.trim().slice(0, 20000),
    pagesFetched,
    hostname: parsed.hostname
  });
});

// Real server-side document text extraction. PDFs are parsed with pdf-parse
// (actual text layer extraction, not a byte-scraping guess). Other formats
// aren't supported yet — the client is told so explicitly rather than being
// handed garbage that would get treated as real pitch-deck content.
app.post("/api/parse-document", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const name = req.file.originalname || "document";
  const isPdf = req.file.mimetype === "application/pdf" || name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return res.json({
      text: "",
      fileName: name,
      supported: false,
      message: "Only PDF text extraction is supported right now. Please fill this field in manually or export your document as a PDF."
    });
  }

  let parser;
  try {
    parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    res.json({ text: result.text || "", fileName: name, supported: true });
  } catch (err) {
    res.status(502).json({ error: err.message || "Failed to parse PDF." });
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
});

// Real live web search via Groq's "compound" model — an agentic model that
// actually executes web searches as part of answering, unlike the plain
// chat models above. This replaces the old DuckDuckGo Instant-Answer lookup,
// which only ever had data for well-known topics and came back empty for
// pretty much any real startup.
async function searchWebWithCompound(query) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server (.env).");
  }

  const systemPrompt = `You are a research assistant. Search the web for the user's query and report concrete, factual findings — specific numbers, names, dates, locations, and funding figures where available — along with which source each fact came from. Be concise; skip anything you can't find rather than guessing.

Precision rules:
- Company names collide constantly — there is often more than one company sharing a name. If the query includes a website domain, treat that domain as the ONLY correct identifier for the company being asked about, and discard any search result belonging to a different, similarly-named company (a different domain, a different country's registration, an unrelated industry). Say so explicitly if you had to filter out a same-name but different company.
- For a company's headquarters/location, prefer the company's own official listing (its LinkedIn company page "Locations" field, its official website contact/about page, or its registered corporate address) over a loose descriptive phrase in a news article (e.g. a press piece calling a Gurgaon-based company "Delhi-based" because Gurgaon is part of the Delhi NCR region — that is NOT the same as being headquartered in Delhi itself). Report the precise city and state/region from the most authoritative source, and note if sources genuinely conflict rather than picking one silently.
- For team size/headcount, if sources disagree, report the range and say so explicitly (e.g. "LinkedIn lists 51-200; PitchBook lists 45") instead of asserting one number as fact.`;

  // groq/compound runs on the same shared per-model TPM budget as the
  // extraction calls below, and the free tier's limit is tight enough that a
  // single chat exchange can trip a 429 on its own — so on a rate limit, wait
  // out Groq's suggested backoff before the retry instead of retrying blind.
  let lastErr = null;
  let rateLimitWaitMs = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1 && rateLimitWaitMs) {
      await sleep(rateLimitWaitMs);
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "groq/compound",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query }
          ],
          temperature: 0.2
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody.error?.message || `Compound search HTTP ${res.status}`;
        lastErr = new Error(msg);
        if (res.status === 429) rateLimitWaitMs = parseRetryAfterMs(msg);
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        lastErr = new Error("Compound search returned no text.");
        continue;
      }
      return text;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Compound search failed.");
}

// Second live-search option: Gemini's built-in Google Search grounding. This
// is a completely separate provider and quota from Groq, so when Groq's
// compound model is rate-limited (its free-tier budget is shared with the
// extraction calls and is easy to exhaust), this gives a real second chance
// at a live, cited answer instead of failing outright.
async function searchWebWithGemini(query) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server (.env).");
  }

  const models = ["gemini-flash-latest", "gemini-3.5-flash"];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `Search the web and answer with concrete, factual findings — specific numbers, names, dates, locations, and funding figures where available. If the question names a company by a website domain, only report facts about that exact company (a same-named but unrelated company at a different domain is not it). Skip anything you can't find rather than guessing.\n\nQuery: ${query}`
            }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        lastErr = new Error(errBody.error?.message || `Gemini search ${model} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
      if (!text) {
        lastErr = new Error("Gemini search returned no text.");
        continue;
      }

      const sources = (data.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .map((c) => c.web?.uri)
        .filter(Boolean)
        .slice(0, 5);

      return sources.length ? `${text}\n\nSources:\n${sources.join("\n")}` : text;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Gemini search failed.");
}

// Primary live-search option: Tavily, a search API purpose-built for AI
// agents. It has its own independent free quota (not shared with Groq or
// Gemini), returns a direct synthesized answer plus real cited sources, and
// has proven far more reliable than either AI provider's built-in search.
async function searchWebWithTavily(query) {
  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is not configured on the server (.env).");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 3
    })
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || errBody.detail || `Tavily search HTTP ${res.status}`);
  }

  const data = await res.json();
  const parts = [];
  // Tavily's own "answer" already resolves cross-source conflicts (and
  // same-named-but-different-company mixups) on its end — it's far more
  // reliable than the raw result snippets below, so it needs to be clearly
  // marked as the one to trust when the two disagree.
  if (data.answer) {
    parts.push(`VERIFIED ANSWER (trust this over anything in "Supporting context" below): ${data.answer}`);
  }
  const supporting = (data.results || []).slice(0, 3)
    .map((r) => `- ${r.url}\n  ${(r.content || "").slice(0, 300)}`)
    .join("\n");
  if (supporting) {
    parts.push(`Supporting context (may include unrelated companies that share the same name — only trust details that match the Verified Answer above):\n${supporting}`);
  }

  const text = parts.join("\n\n").trim();
  if (!text) throw new Error("Tavily search returned no results.");
  return text;
}

app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Missing 'q' query parameter." });

  try {
    const text = await searchWebWithTavily(q);
    return res.json({ text, provider: "Tavily Search" });
  } catch (eTavily) {
    try {
      const text = await searchWebWithCompound(q);
      return res.json({ text, provider: "Groq Compound" });
    } catch (eCompound) {
      try {
        const text = await searchWebWithGemini(q);
        return res.json({ text, provider: "Gemini Search" });
      } catch (eGemini) {
        return res.status(502).json({ error: eTavily.message || eCompound.message || eGemini.message || "Web search request failed." });
      }
    }
  }
});

// Temporary in-memory storage for generated one-pager PDFs, so a review
// email can include a real download link instead of a true email
// attachment (EmailJS's attachment feature is a paid add-on; this needs no
// account upgrade and no third-party file host). Entries expire after 48
// hours so memory usage doesn't grow unbounded on a long-running instance.
const generatedPdfStore = new Map();
const PDF_TTL_MS = 48 * 60 * 60 * 1000;

function cleanupExpiredPdfs() {
  const now = Date.now();
  for (const [id, entry] of generatedPdfStore.entries()) {
    if (now - entry.createdAt > PDF_TTL_MS) generatedPdfStore.delete(id);
  }
}

app.post("/api/store-pdf", (req, res) => {
  const { base64, filename } = req.body || {};
  if (!base64) return res.status(400).json({ error: "Missing 'base64' in request body." });

  cleanupExpiredPdfs();

  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 content." });
  }
  if (buffer.length === 0) return res.status(400).json({ error: "Empty PDF content." });

  const id = require("crypto").randomBytes(12).toString("hex");
  generatedPdfStore.set(id, {
    buffer,
    filename: (filename || "OnePager.pdf").replace(/[^a-zA-Z0-9._-]/g, "_"),
    createdAt: Date.now()
  });

  res.json({ url: `/api/pdf/${id}` });
});

app.get("/api/pdf/:id", (req, res) => {
  const entry = generatedPdfStore.get(req.params.id);
  if (!entry) return res.status(404).send("This link has expired or does not exist.");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${entry.filename}"`);
  res.send(entry.buffer);
});

// Fetches an external image server-side and streams the bytes back same-origin.
// html2canvas can only read pixels from an image if it was loaded with CORS
// permission, and most external hosts (founder photos pasted from LinkedIn,
// Google Drive, ui-avatars.com, a company's own site, etc.) don't send the
// right headers for that -- the image still displays fine on screen, it just
// comes out blank in the exported PDF. Proxying it through our own origin
// sidesteps that entirely.
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Missing or invalid 'url' query parameter." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // A generic/bot-labeled UA gets 400/403'd by some hosts (Wikimedia
        // among them); a realistic browser UA is accepted by the widest
        // range of sites people paste photo links from.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).json({ error: `Source returned ${response.status}` });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(415).json({ error: "URL did not return an image." });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: `Failed to fetch image: ${err.message}` });
  }
});

// Single-page app fallback (keeps deep-link-style reloads working)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`PageCraft AI server running at http://localhost:${PORT}`);
  console.log(`Gemini API: ${GEMINI_API_KEY ? "configured" : "MISSING (set GEMINI_API_KEY in .env)"}`);
  console.log(`Groq API:   ${GROQ_API_KEY ? "configured" : "MISSING (set GROQ_API_KEY in .env)"}`);
});
