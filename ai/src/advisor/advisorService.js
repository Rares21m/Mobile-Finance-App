const { createGeminiModel } = require("../providers/geminiProvider");
const { buildFinancialSummary } = require("../shared/financeSummary");
const { buildSystemPrompt } = require("./promptBuilder");
const { parseStructuredReply } = require("./responseParser");

function ensureAdvisorConfig({ apiKey }) {
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    const err = new Error("GEMINI_NOT_CONFIGURED");
    err.code = "GEMINI_NOT_CONFIGURED";
    err.status = 503;
    throw err;
  }
}

async function generateAdvisorReply({
  messages = [],
  financialData = {},
  language = "en",
  userProfile = null,
  apiKey = process.env.GEMINI_API_KEY,
  timeoutMs = Number(process.env.ADVISOR_TIMEOUT_MS || 12000),
  modelName = "gemini-flash-lite-latest"
}) {
  ensureAdvisorConfig({ apiKey });

  if (!messages.length) {
    const err = new Error("MESSAGES_REQUIRED");
    err.code = "MESSAGES_REQUIRED";
    err.status = 400;
    throw err;
  }

  const summary = buildFinancialSummary(financialData);
  const systemInstruction = buildSystemPrompt(summary, language, userProfile);
  const model = createGeminiModel({ apiKey, modelName, systemInstruction });

  const historyMessages = messages
    .slice(0, -1)
    .filter((m) => m.role !== "system");
  const history = historyMessages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    const err = new Error("LAST_MESSAGE_MUST_BE_USER");
    err.code = "LAST_MESSAGE_MUST_BE_USER";
    err.status = 400;
    throw err;
  }

  const chat = model.startChat({ history });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        Object.assign(new Error("ADVISOR_TIMEOUT"), {
          code: "ADVISOR_TIMEOUT",
          status: 504,
          details: { timeoutMs }
        })
      );
    }, timeoutMs);
  });

  const result = await Promise.race([
    chat.sendMessage(lastMessage.text),
    timeoutPromise
  ]);
  const text = result.response.text();
  const structured = parseStructuredReply(text);

  return {
    reply: text,
    structured: structured
      ? {
          summary: structured.summary,
          action: structured.action,
          rationale: structured.rationale
        }
      : null,
    followUpCards: structured?.followUpCards || []
  };
}

module.exports = {
  generateAdvisorReply
};
