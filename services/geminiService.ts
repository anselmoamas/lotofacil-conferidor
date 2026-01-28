
import { GoogleGenAI, Type } from "@google/genai";
import { OfficialDraw } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const smartParseOfficialData = async (rawText: string): Promise<OfficialDraw[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse the following Lotofácil draw results.
    The primary format is: {concurso} ({date}) {numbers}
    Example: 0001 (29/09/2003) 02 03 05 06 09 10 11 13 14 16 18 20 23 24 25
    
    Rules:
    - Extract 'concurso' number (usually 4 digits).
    - Extract 'data' from between parentheses.
    - Extract exactly 15 'numeros' (values between 1-25).
    - If the format varies slightly, use your reasoning to map it correctly.
    
    Text to parse:
    ${rawText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            concurso: { type: Type.STRING },
            data: { type: Type.STRING },
            numeros: { 
              type: Type.ARRAY, 
              items: { type: Type.INTEGER },
              description: "Array of exactly 15 numbers"
            }
          },
          required: ["concurso", "numeros"]
        }
      }
    }
  });

  try {
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const analyzeGames = async (games: number[][]): Promise<string> => {
  const summarized = games.slice(0, 50).map(g => g.join(',')).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze these Lotofácil games and provide a brief professional summary about balance (odds/evens, sums, quadrants). Suggest if the set is well-distributed. Limit to 100 words.
    Games:
    ${summarized}`,
  });
  return response.text;
};
