function parseStructuredReply(text) {
  const normalized = String(text || "").replace(/\r/g, "");
  const summaryMatch = normalized.match(/(?:^|\n)\s*summary\s*:\s*([\s\S]*?)(?=\n\s*action\s*:|$)/i);
  const actionMatch = normalized.match(/(?:^|\n)\s*action\s*:\s*([\s\S]*?)(?=\n\s*rationale\s*:|$)/i);
  const rationaleMatch = normalized.match(/(?:^|\n)\s*rationale\s*:\s*([\s\S]*?)$/i);

  const summary = summaryMatch?.[1]?.trim() || "";
  const action = actionMatch?.[1]?.trim() || "";
  const rationale = rationaleMatch?.[1]?.trim() || "";

  const hasStructured = Boolean(summary || action || rationale);
  if (!hasStructured) return null;

  const followUpCards = [];
  if (action) {
    followUpCards.push({
      id: "followup_action_today",
      title: "Ce fac azi",
      body: action,
      metric: "Ce castig",
      metricValue: summary || "Reduci riscul de overspend"
    });
  }
  if (rationale) {
    followUpCards.push({
      id: "followup_measure",
      title: "Cum masor",
      body: rationale,
      metric: "Indicator",
      metricValue: "Revizuire saptamanala"
    });
  }

  return {
    summary,
    action,
    rationale,
    followUpCards
  };
}

module.exports = {
  parseStructuredReply
};
