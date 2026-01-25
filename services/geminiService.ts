
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, Correction } from "../types";

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.API_KEY;

let aiInstance: GoogleGenAI | null = null;
function getAiInstance(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

let chatInstance: Chat | null = null;

function getChatInstance(): Chat {
  if (!chatInstance) {
    const ai = getAiInstance();
    chatInstance = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a friendly and patient Hungarian language tutor named Tenju. Your replies must be in JSON format with two keys: 'hungarian' (your reply in Hungarian) and 'japanese' (the Japanese translation of your reply). Avoid overly short or curt responses. Instead, provide natural, complete sentences that are helpful for a beginner-to-intermediate learner. Do not use markdown in the content.",
        responseMimeType: "application/json",
      },
    });
  }
  return chatInstance;
}


export async function getChatResponse(history: ChatMessage[], newMessage: string): Promise<{ text: string, translation: string }> {
  const chat = getChatInstance();
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message: newMessage });
    // @ts-ignore - The SDK types might be confusing vs runtime behavior or I am misinterpreting, but relying on previous 'response.text' property usage.
    // Actually, based on lint error "Type 'String' has no call signatures", response.text is a string/String property.
    const responseText = response.text; 
    if (!responseText) {
      throw new Error("Empty response");
    }
    
    try {
        const parsed = JSON.parse(responseText);
        return {
            text: parsed.hungarian,
            translation: parsed.japanese
        };
    } catch (e) {
        console.error("Failed to parse JSON response", e);
        // Fallback if strict JSON fails, though with responseMimeType it should be fine
        return {
            text: responseText,
            translation: ""
        };
    }
  } catch (error) {
    console.error("Error getting chat response:", error);
    return {
        text: "Hiba történt a válasszal. (An error occurred with the response.)",
        translation: "応答でエラーが発生しました。"
    };
  }
}

export async function getGrammarCorrection(sentence: string): Promise<Correction> {
  const prompt = `You are a helpful Hungarian grammar checker. Analyze the following sentence: "${sentence}". If it is grammatically correct, respond with only the JSON {"isCorrect": true}. If there are errors, respond with a JSON object with "isCorrect": false, a "correctedSentence" key with the corrected Hungarian sentence, and an "explanation" key with a brief, one-sentence explanation of the main error in Japanese.`;

  try {
    const ai = getAiInstance();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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

export async function getWordTranslation(word: string, context: string): Promise<string> {
    const prompt = `Translate the Hungarian word '${word}' into Japanese based on this context: '${context}'. Return ONLY the Japanese translation word or short phrase. Do not include any explanation or extra text.`;

    try {
        const chat = getChatInstance();
        // Using chat instance to keep context if possible, or just single generation
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const translation = response.text;
        return translation ? translation.trim() : "";
    } catch (error) {
        console.error("Error getting word translation:", error);
        return "";
    }
}

export async function getDailyQuestion(): Promise<{ text: string, translation: string }> {
    const prompt = `Generate a simple, open-ended question in Hungarian to start a conversation with a beginner learner (e.g., about their day, plans, favorites). 
    Return ONLY a JSON object with two keys: 'hungarian' (the question) and 'japanese' (the Japanese translation).`;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        // @ts-ignore
        const responseText = response.text;
        if (responseText) {
            const parsed = JSON.parse(responseText);
            return {
                text: parsed.hungarian,
                translation: parsed.japanese
            };
        }
        return { text: "Hogy vagy ma?", translation: "今日は元気ですか？" };
    } catch (error) {
        console.error("Error getting daily question:", error);
        return { text: "Szia! Mit csinálsz?", translation: "こんにちは！何をしていますか？" };
    }
}
