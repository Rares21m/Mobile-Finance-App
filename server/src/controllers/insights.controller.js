const logger = require("../config/logger");
const { generateInsightsForUser } = require("../services/insights.service");

const ALLOWED_KPI_EVENTS = new Set([
"insight_action_click",
"insight_conversion",
"weekly_digest_view",
"weekly_digest_cta",
"insight_copy_variant_view",
"insight_copy_variant_click",
"retention_home_visit",
"reentry_banner_view",
"reentry_banner_cta",
"best_next_action_click",
"advisor_followup_accept",
"advisor_followup_reminder_sent",
"monthly_close_view",
"monthly_close_apply"]
);

async function getInsightsFeed(req, res) {
  try {
    const payload = await generateInsightsForUser(req.userId);
    return res.json(payload);
  } catch (err) {
    logger.error("getInsightsFeed error:", err);
    return res.status(500).json({ error: "INSIGHTS_FETCH_FAILED" });
  }
}

async function getActionCenter(req, res) {
  try {
    const payload = await generateInsightsForUser(req.userId);
    return res.json({
      generatedAt: payload.generatedAt,
      tasks: payload.actionCenter
    });
  } catch (err) {
    logger.error("getActionCenter error:", err);
    return res.status(500).json({ error: "ACTION_CENTER_FETCH_FAILED" });
  }
}

async function convertInsightAction(req, res) {
  try {
    const { insightId, actionType } = req.body || {};
    if (!insightId || !actionType) {
      return res.status(400).json({ error: "INSIGHT_ID_AND_ACTION_REQUIRED" });
    }

    logger.info("insight.action.conversion", {
      userId: req.userId,
      insightId,
      actionType,
      traceId: req.traceId
    });

    return res.json({
      ok: true,
      insightId,
      actionType,
      convertedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error("convertInsightAction error:", err);
    return res.status(500).json({ error: "INSIGHT_ACTION_CONVERSION_FAILED" });
  }
}

async function trackKpiEvent(req, res) {
  try {
    const { eventType, insightId, actionType, metadata } = req.body || {};
    if (!eventType) {
      return res.status(400).json({ error: "EVENT_TYPE_REQUIRED" });
    }

    if (!ALLOWED_KPI_EVENTS.has(eventType)) {
      return res.status(400).json({ error: "UNSUPPORTED_KPI_EVENT" });
    }

    logger.info("insight.kpi.event", {
      userId: req.userId,
      eventType,
      insightId: insightId || null,
      actionType: actionType || null,
      metadata: metadata && typeof metadata === "object" ? metadata : null,
      traceId: req.traceId
    });

    return res.json({
      ok: true,
      eventType,
      trackedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error("trackKpiEvent error:", err);
    return res.status(500).json({ error: "KPI_EVENT_TRACK_FAILED" });
  }
}

module.exports = {
  getInsightsFeed,
  getActionCenter,
  convertInsightAction,
  trackKpiEvent
};