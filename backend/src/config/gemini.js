/**
 * Gemini AI — uses direct REST API (v1beta) because this project's key
 * uses the newer Google AI Studio format which supports gemini-3.x models.
 */

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Gemini generateContent via REST with automatic retry on transient errors.
 * @param {string} prompt
 * @param {number} retries
 * @returns {Promise<string>} text response
 */
async function generateContent(prompt, retries = 5) {
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Transient errors — retry with backoff
    if (!response.ok) {
      const msg = data?.error?.message || response.statusText;
      const isTransient =
        response.status === 429 ||
        response.status === 503 ||
        response.status === 500 ||
        msg.toLowerCase().includes('high demand') ||
        msg.toLowerCase().includes('temporarily') ||
        msg.toLowerCase().includes('try again') ||
        msg.toLowerCase().includes('overloaded') ||
        msg.toLowerCase().includes('unavailable') ||
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('quota') ||
        msg.toLowerCase().includes('retry');

      if (isTransient && attempt < retries) {
        // Parse "retry in X.XXs" from the error message if present
        const retryMatch = msg.match(/retry\s+in\s+([\d.]+)s/i);
        const suggestedDelay = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) * 1000 : null;
        // Use suggested delay + 5s buffer, or exponential backoff
        const delay = suggestedDelay ? suggestedDelay + 5000 : Math.min(20000 * attempt, 90000);
        console.log(`Gemini rate limit (attempt ${attempt}/${retries}), waiting ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }
      throw new Error(`Gemini API error: ${msg}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return text;
  }
}

module.exports = { generateContent };
