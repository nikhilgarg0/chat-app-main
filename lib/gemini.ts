import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateAIResponse(prompt: string, context: string = "") {
  try {
    const fullPrompt = context ? `${prompt}\n\nContext:\n${context}` : prompt;
    
    // Attempt with primary gemini-2.0-flash model
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (primaryErr: any) {
      console.warn("[Gemini AI Warning] Primary model (gemini-2.0-flash) error, trying gemini-1.5-flash:", primaryErr?.message || primaryErr);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await fallbackModel.generateContent(fullPrompt);
      return result.response.text();
    }
  } catch (error: any) {
    console.error("Gemini AI API Error:", error?.message || error);
    throw error;
  }
}
