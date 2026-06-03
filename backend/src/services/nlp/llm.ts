import { cachedAiCall } from "../workers/ai.worker";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.1-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Direct HTTP request to the Google Gemini API.
 */
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("[GeminiService] GEMINI_API_KEY is not set. Using local rule-based fallback.");
    return generateFallback(prompt);
  }

  const url = `${API_URL}?key=${GEMINI_API_KEY}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      const errJson = (await response.json()) as GeminiResponse;
      throw new Error(errJson.error?.message || `HTTP error ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Invalid response format from Gemini API");
    }

    return text.trim();
  } catch (err) {
    console.error("[GeminiService] API call failed, falling back:", err);
    return generateFallback(prompt);
  }
}

/**
 * Rule-based fallbacks in case Gemini is unavailable or not configured.
 */
function generateFallback(prompt: string): string {
  if (prompt.includes("Summarise") || prompt.includes("summary")) {
    return "• News update from regional feeds. Details are being compiled.\n• Affects local services and infrastructure in the region.\n• Review primary sources via the direct link above.";
  }
  if (prompt.includes("impact")) {
    return "This development is likely to affect local daily routines, municipal services, or regional markets. Residents are advised to monitor official channels for travel or utility updates.";
  }
  return "AI Chat is currently offline or loading. Please try again in a few moments.";
}

/**
 * Generate a concise bulleted summary of an article
 */
export async function getSummary(title: string, body: string): Promise<string> {
  const cacheKey = `summary:${title}`;
  const prompt = `You are a premium news intelligence assistant. Summarise the following news article into exactly 3-4 bullet points. Keep it clear, highly informative, and objective.

Title: ${title}
Content: ${body || "No details provided."}`;

  const cached = await cachedAiCall(cacheKey, async () => {
    const result = await callGemini(prompt);
    return {
      question: cacheKey,
      response: result,
      generatedAt: new Date().toISOString(),
    };
  });

  return cached.response;
}

/**
 * Assess how this news affects ordinary people in India
 */
export async function getImpactReport(title: string, body: string): Promise<string> {
  const cacheKey = `impact:${title}`;
  const prompt = `You are a public policy and citizen impact analyst. Explain in 2-3 sentences how the following news article affects ordinary people in India (e.g., changes in cost of living, transport delays, public services, jobs, security, education, health, utility disruptions). Be specific, direct, and clear. Avoid vague summaries.

Title: ${title}
Content: ${body || "No details provided."}`;

  const cached = await cachedAiCall(cacheKey, async () => {
    const result = await callGemini(prompt);
    return {
      question: cacheKey,
      response: result,
      generatedAt: new Date().toISOString(),
    };
  });

  return cached.response;
}

/**
 * Handle a chat Q&A session about a specific article
 */
export async function answerArticleChat(
  title: string,
  body: string,
  history: Array<{ role: "user" | "model"; content: string }>,
  question: string
): Promise<string> {
  // We incorporate the history and question in the cache key to avoid cache collisions
  const historyStr = history.map((h) => `${h.role}:${h.content}`).join("\n");
  const cacheKey = `chat:${title}:${historyStr}:${question}`;

  const formattedHistory = history
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
    .join("\n");

  const prompt = `You are an interactive news AI assistant. Answer the user's question about this specific article. Rely ONLY on the context provided, combined with standard public knowledge if necessary, but keep it centered on the article details.

Article Title: ${title}
Article Body: ${body || "No details provided."}

Chat History:
${formattedHistory || "None"}

User's Question: ${question}
Assistant:`;

  const cached = await cachedAiCall(cacheKey, async () => {
    const result = await callGemini(prompt);
    return {
      question: cacheKey,
      response: result,
      generatedAt: new Date().toISOString(),
    };
  });

  return cached.response;
}
