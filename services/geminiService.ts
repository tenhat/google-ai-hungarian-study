
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, Correction } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
let chatInstance: Chat | null = null;

function getChatInstance(): Chat {
  if (!chatInstance) {
    chatInstance = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are a friendly and patient Hungarian language tutor named Tenju. Your replies should be in Hungarian. Keep your sentences relatively simple for a beginner-to-intermediate learner. Do not use markdown.",
      },
    });
  }
  return chatInstance;
}


export async function getChatResponse(history: ChatMessage[], newMessage: string): Promise<string> {
  const chat = getChatInstance();
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
    return response.text ?? "Sajnálom, nem értem. (Sorry, I don't understand.)";
  } catch (error) {
    console.error("Error getting chat response:", error);
    return "Hiba történt a válasszal. (An error occurred with the response.)";
  }
}

export async function getGrammarCorrection(sentence: string): Promise<Correction> {
  const prompt = `You are a helpful Hungarian grammar checker. Analyze the following sentence: "${sentence}". If it is grammatically correct, respond with only the JSON {"isCorrect": true}. If there are errors, respond with a JSON object with "isCorrect": false, a "correctedSentence" key with the corrected Hungarian sentence, and an "explanation" key with a brief, one-sentence explanation of the main error in Japanese.`;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isCorrect: { type: Type.BOOLEAN },
                    // FIX: Removed nullable: true as it is not a valid schema property.
                    // Optionality is handled by the 'required' array.
                    correctedSentence: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                },
                required: ["isCorrect"]
            }
        }
    });

    if (response.text) {
        const parsedJson = JSON.parse(response.text);
        return {
            isCorrect: parsedJson.isCorrect,
            correctedSentence: parsedJson.correctedSentence,
            explanation: parsedJson.explanation,
        };
    }
    
    return { isCorrect: true }; // Assume correct if parsing fails

  } catch (error) {
    console.error("Error getting grammar correction:", error);
    // In case of error, assume the sentence is correct to not block the user.
    return { isCorrect: true };
  }
}
