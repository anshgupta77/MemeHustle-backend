const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const aiCache = new Map();

async function generateMemeCaption(tags) {
  const cacheKey = `caption_${tags.join('_')}`;
  if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

  try {
    const prompt = `Generate a funny, cyberpunk-style caption for a meme with tags: ${tags.join(', ')}`;
    const result = await model.generateContent(prompt);
    const caption = result.response.text().trim();
    aiCache.set(cacheKey, caption);
    return caption;
  } catch {
    const fallbacks = [
      "YOLO to the moon! 🚀", "Much wow, very cyber", "Stonks go brrr in the matrix",
      "HODL the neon vibes!", "This is the way... to meme", "Number go up, brain go brrr"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

async function generateVibeAnalysis(tags, title) {
  const cacheKey = `vibe_${tags.join('_')}_${title}`;
  if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

  try {
    const prompt = `Describe the vibe of a meme titled "${title}" with tags: ${tags.join(', ')} only in three words`;
    const result = await model.generateContent(prompt);
    const vibe = result.response.text().trim();
    aiCache.set(cacheKey, vibe);
    return vibe;
  } catch {
    const fallbacks = [
      "Neon Crypto Chaos", "Retro Stonks Vibes", "Digital Doge Energy",
      "Synthwave Meme Magic", "Cyberpunk HODL Mood", "Matrix Meme Vibes"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

module.exports = { generateMemeCaption, generateVibeAnalysis };
