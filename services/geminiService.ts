import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ThinkingLevel } from "../types";

// Initialize the client
// The API key is injected via the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ["NORMAL", "WARNING", "CRITICAL"],
      description: "The safety status of the experiment.",
    },
    observation: {
      type: Type.STRING,
      description: "Brief visual description of the experiment state.",
    },
    deduction: {
      type: Type.STRING,
      description: "Detailed deductive reasoning for the observed state.",
    },
    recommendation: {
      type: Type.STRING,
      description: "Actionable advice for the scientist.",
    },
  },
  required: ["status", "observation", "deduction", "recommendation"],
};

export const analyzeExperiment = async (
  context: string,
  imageBase64: string,
  thinkingLevel: ThinkingLevel
): Promise<AnalysisResult> => {
  const modelId = "gemini-3-pro-preview";
  
  // Set thinking budget based on level
  // High = Max reasoning (32k tokens)
  // Low = Minimal reasoning for speed (2k tokens)
  const thinkingBudget = thinkingLevel === 'HIGH' ? 32768 : 2048;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, can act generic
              data: imageBase64,
            },
          },
          {
            text: `Experimental Context: ${context}\n\nAnalyze the image against this context.`,
          },
        ],
      },
      config: {
        systemInstruction: "You are BioReason, a lab partner. Analyze the image against the provided context. If an anomaly is detected, use your deep reasoning to deduce the chemical or physical cause. Output JSON with keys: status, observation, deduction, and recommendation.",
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: {
          thinkingBudget: thinkingBudget, 
        },
      },
    });

    if (!response.text) {
      throw new Error("No response received from Gemini.");
    }

    const parsedResult = JSON.parse(response.text) as AnalysisResult;
    return parsedResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
