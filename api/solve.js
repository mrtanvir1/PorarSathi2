// Vercel serverless function (ফ্রি Google Gemini API ব্যবহার করে)।
// API key থাকে শুধু সার্ভারে (Environment Variable), ব্রাউজারে কখনো যায় না।

const MAX_PROMPT = 6000;          // প্রম্পটের সর্বোচ্চ অক্ষর
const MAX_IMAGE_B64 = 4_000_000;  // ছবির base64 সীমা (~3 MB)

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY সেট করা নেই" });
  }
  // মডেলের নাম বদলাতে চাইলে Vercel-এ GEMINI_MODEL নামে Environment Variable দাও
  // একটা মডেল ব্যস্ত থাকলে পরেরটায় চেষ্টা করা হবে
  const models = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"]
    .filter((m, i, a) => m && a.indexOf(m) === i);

  const { prompt, image, mediaType } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT) {
    return res.status(400).json({ error: "প্রশ্ন ঠিক নেই বা খুব বড়" });
  }

  const parts = [{ text: prompt }];
  if (image) {
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(mediaType);
    if (!okType || typeof image !== "string" || image.length > MAX_IMAGE_B64) {
      return res.status(400).json({ error: "ছবি ঠিক নেই বা খুব বড়" });
    }
    parts.push({ inline_data: { mime_type: mediaType, data: image } });
  }

  const deadline = Date.now() + 52000; // সব চেষ্টা মিলিয়ে ৫২ সেকেন্ড
  const call = async (model, genConfig) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), Math.max(1000, deadline - Date.now()));
    try {
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: genConfig }),
          signal: ac.signal,
        }
      );
    } finally { clearTimeout(t); }
  };

  let lastErr = "AI এখন উত্তর দিতে পারছে না, একটু পরে আবার চেষ্টা করো";
  let lastStatus = 502;
  try {
    for (const model of models) {
      if (Date.now() >= deadline) break;
      // প্রথমে কম "ভাবার" সেটিং; মডেল না মানলে সাধারণ সেটিংয়ে
      let r = await call(model, { maxOutputTokens: 4000, thinkingConfig: { thinkingLevel: "low" } });
      if (r.status === 400) r = await call(model, { maxOutputTokens: 4000 });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        const text = (data.candidates?.[0]?.content?.parts || [])
          .filter(p => p.text && !p.thought)
          .map(p => p.text)
          .join("\n");
        if (text) return res.status(200).json({ text });
        lastErr = "AI কোনো উত্তর দেয়নি, আবার চেষ্টা করো";
        continue;
      }
      lastErr = data?.error?.message || "AI error";
      lastStatus = r.status === 429 ? 429 : 502;
      // ব্যস্ত (503), সীমা শেষ (429) বা মডেল নেই (404/400) হলে পরের মডেল; key ভুল হলে থামো
      if (![400, 404, 429, 500, 503].includes(r.status)) break;
    }
    return res.status(lastStatus).json({ error: lastErr });
  } catch (e) {
    const timeout = e && e.name === "AbortError";
    return res.status(timeout ? 504 : 502).json({ error: timeout ? "AI উত্তর দিতে অনেক দেরি করছে" : "AI-র সাথে সংযোগ হয়নি" });
  }
};
