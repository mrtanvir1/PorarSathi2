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
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const call = async (genConfig) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 50000); // ৫০ সেকেন্ডের বেশি অপেক্ষা নয়
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: genConfig }),
        signal: ac.signal,
      });
    } finally { clearTimeout(t); }
  };

  try {
    // প্রথমে কম "ভাবার" সেটিং দিয়ে চেষ্টা (দ্রুত উত্তরের জন্য); মডেল না মানলে সাধারণ সেটিংয়ে আবার
    let r = await call({ maxOutputTokens: 4000, thinkingConfig: { thinkingLevel: "low" } });
    if (r.status === 400) r = await call({ maxOutputTokens: 4000 });
    const data = await r.json();
    if (!r.ok) {
      const status = r.status === 429 ? 429 : 502;
      return res.status(status).json({ error: data?.error?.message || "AI error" });
    }
    const text = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => p.text && !p.thought)
      .map(p => p.text)
      .join("\n");
    if (!text) {
      return res.status(502).json({ error: "AI কোনো উত্তর দেয়নি, আবার চেষ্টা করো" });
    }
    return res.status(200).json({ text });
  } catch (e) {
    const timeout = e && e.name === "AbortError";
    return res.status(timeout ? 504 : 502).json({ error: timeout ? "AI উত্তর দিতে অনেক দেরি করছে" : "AI-র সাথে সংযোগ হয়নি" });
  }
};
