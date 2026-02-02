import { GoogleGenAI, Type } from "@google/genai";
import { Asset } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestFunds = async (query: string): Promise<Array<{name: string, code: string, type: string}>> => {
    try {
        const prompt = `Generate 3 fictional but realistic Chinese mutual fund names, codes (6 digits), and types based on the search query: "${query}". Return as JSON.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            code: { type: Type.STRING },
                            type: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);

    } catch (e) {
        console.error(e);
        return [];
    }
}