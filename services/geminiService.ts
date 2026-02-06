
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, Correction, TranslationResult } from "../types";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);

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
        systemInstruction: "You are a friendly and patient Hungarian language tutor named Tenju. Your replies must be in JSON format with three keys: 'hungarian' (your full reply in Hungarian), 'japanese' (the full Japanese translation), and 'segments' (an array of objects, each containing 'hungarian' and 'japanese' keys representing corresponding sentence pairs). Avoid overly short or curt responses. Instead, provide natural, complete sentences that are helpful for a beginner-to-intermediate learner. Do not use markdown in the content.",
        responseMimeType: "application/json",
      },
    });
  }
  return chatInstance;
}


export async function getChatResponse(history: ChatMessage[], newMessage: string): Promise<{ text: string, translation: string, segments?: { hungarian: string, japanese: string }[] }> {
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
            translation: parsed.japanese,
            segments: parsed.segments
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

export async function getDailyQuestion(): Promise<{ text: string, translation: string, segments?: { hungarian: string, japanese: string }[] }> {
    const prompt = `Generate a simple, open-ended question in Hungarian to start a conversation with a beginner learner (e.g., about their day, plans, favorites). 
    Return ONLY a JSON object with three keys: 'hungarian' (the question), 'japanese' (the Japanese translation), and 'segments' (an array of sentence pair objects).`;

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
                translation: parsed.japanese,
                segments: parsed.segments
            };
        }
        return { text: "Hogy vagy ma?", translation: "今日は元気ですか？" };
    } catch (error) {
        console.error("Error getting daily question:", error);
        return { text: "Szia! Mit csinálsz?", translation: "こんにちは！何をしていますか？" };
    }
}

/**
 * 画像を解析し、ハンガリー語で内容を説明+関連した質問を生成する
 * @param imageBase64 - base64エンコードされた画像データ（data:image/...プレフィックスなし）
 * @param mimeType - 画像のMIMEタイプ（例: "image/jpeg", "image/png"）
 */
export async function getImageChatResponse(
    imageBase64: string,
    mimeType: string
): Promise<{ text: string, translation: string, segments?: { hungarian: string, japanese: string }[] }> {
    const systemPrompt = `You are a friendly Hungarian language tutor named Tenju. 
Analyze the image provided and describe it in detail in Hungarian.

Your description should include (5-7 sentences):
- What objects, people, or scenes are visible
- Colors, textures, and notable visual details
- Any actions or situations happening in the image
- The overall mood or context

IMPORTANT: If the image contains any Hungarian text (signs, labels, documents, etc.):
- Transcribe the exact text visible
- Provide a detailed explanation of each word/phrase in Japanese
- Include grammar notes if relevant (cases, conjugations, etc.)

Do NOT ask questions to the learner. Only describe and explain.

Your reply must be in JSON format with three keys:
- 'hungarian': your full description in Hungarian
- 'japanese': the full Japanese translation
- 'segments': an array of objects, each containing 'hungarian' and 'japanese' keys representing corresponding sentence pairs

Use vocabulary appropriate for a beginner-to-intermediate learner. Do not use markdown.`;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: systemPrompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("Empty response from image analysis");
        }

        try {
            const parsed = JSON.parse(responseText);
            return {
                text: parsed.hungarian,
                translation: parsed.japanese,
                segments: parsed.segments
            };
        } catch (e) {
            console.error("Failed to parse JSON response from image analysis", e);
            return {
                text: responseText,
                translation: ""
            };
        }
    } catch (error) {
        console.error("Error getting image chat response:", error);
        return {
            text: "Sajnos nem tudtam elemezni a képet. (I couldn't analyze the image.)",
            translation: "すみません、画像を解析できませんでした。"
        };
    }
}

/**
 * 日本語テキストをハンガリー語に翻訳し、活用解説と重要単語を返す
 * @param japaneseText - 翻訳する日本語テキスト
 */
export async function getTranslation(japaneseText: string): Promise<TranslationResult> {
    const prompt = `You are a Hungarian language expert. Translate the following Japanese text into Hungarian.

Japanese text: "${japaneseText}"

Return a JSON object with the following structure:
{
  "hungarian": "The Hungarian translation of the text",
  "explanation": "簡潔な文法ポイントを1-2行で説明（例：動詞の活用形、格語尾など重要な点のみ）",
  "importantWords": [
    {
      "hungarian": "word1",
      "japanese": "meaning1",
      "example": {
        "sentence": "Example sentence using the word",
        "translation": "日本語訳"
      }
    }
  ]
}

Important notes:
- The explanation should be BRIEF (1-2 lines max) in Japanese, focusing only on the most important grammar point
- Include 2-3 important words that appear in the translation
- Each important word should have a realistic example sentence
- Do not use markdown formatting`;

    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("Empty response from translation");
        }

        const parsed = JSON.parse(responseText);
        return {
            hungarian: parsed.hungarian || "",
            explanation: parsed.explanation || "",
            importantWords: parsed.importantWords || []
        };
    } catch (error) {
        console.error("Error getting translation:", error);
        return {
            hungarian: "Fordítási hiba történt.",
            explanation: "翻訳中にエラーが発生しました。もう一度お試しください。",
            importantWords: []
        };
    }
}
