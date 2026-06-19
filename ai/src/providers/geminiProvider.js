const { createRequire } = require("module");
const path = require("path");

function loadGoogleGenerativeAI() {
  try {
    return require("@google/generative-ai");
  } catch {
    const serverRequire = createRequire(path.join(process.cwd(), "package.json"));
    return serverRequire("@google/generative-ai");
  }
}

function createGeminiModel({ apiKey, modelName, systemInstruction }) {
  const { GoogleGenerativeAI } = loadGoogleGenerativeAI();
  const genAI = new GoogleGenerativeAI(apiKey || "");
  return genAI.getGenerativeModel({
    model: modelName || "gemini-flash-lite-latest",
    systemInstruction
  });
}

module.exports = {
  createGeminiModel
};
