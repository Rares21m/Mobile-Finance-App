
const logger = require("../config/logger");
const { generateAdvisorReply } = require("../../../ai/src");

/**
 * POST /api/advisor/chat
 * Body: { messages: [{role, text}], financialData: {...}, language: "en" | "ro" }
 */
async function chat(req, res) {
  try {
    const { messages = [], financialData = {}, language = "en" } = req.body;
    const userProfile = financialData?.userProfile ?? req.body.userProfile ?? null;

    const payload = await generateAdvisorReply({
      messages,
      financialData,
      language,
      userProfile,
      apiKey: process.env.GEMINI_API_KEY,
      timeoutMs: Number(process.env.ADVISOR_TIMEOUT_MS || 12000)
    });

    return res.json(payload);
  } catch (err) {
    logger.error("Advisor chat error:", err.message || err);

    if (err.code === "GEMINI_NOT_CONFIGURED") {
      return res.status(503).json({ error: "GEMINI_NOT_CONFIGURED" });
    }

    if (err.code === "MESSAGES_REQUIRED") {
      return res.status(400).json({ error: "MESSAGES_REQUIRED" });
    }

    if (err.code === "LAST_MESSAGE_MUST_BE_USER") {
      return res.status(400).json({ error: "LAST_MESSAGE_MUST_BE_USER" });
    }

    if (err.code === "ADVISOR_TIMEOUT") {
      return res.status(504).json({
        error: "ADVISOR_TIMEOUT",
        code: "ADVISOR_TIMEOUT",
        details: err.details
      });
    }

    if (
      err.message?.includes("503") ||
      err.message?.includes("Service Unavailable")
    ) {
      return res.status(503).json({
        error: "AI_PROVIDER_DEGRADED",
        code: "AI_PROVIDER_DEGRADED"
      });
    }

    if (
      err.message?.includes("API_KEY_INVALID") ||
      err.message?.includes("API key")
    ) {
      return res.status(401).json({ error: "GEMINI_KEY_INVALID" });
    }

    return res.status(500).json({
      error: "ADVISOR_ERROR",
      code: "ADVISOR_ERROR"
    });
  }
}

module.exports = { chat };
