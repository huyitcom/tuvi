import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testTTS() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing TTS long...");
  try {
    const longText = "Đây là một đoạn test. ".repeat(150) + "Kết thúc."; // about 3300 chars
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview", 
      contents: [{ parts: [{ text: longText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
        },
      } as any,
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    console.log("Length:", base64?.length);
  } catch(e: any) {
    console.error("Failed!", e?.message || e);
  }
}
testTTS();
