import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testTTS() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing TTS...");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: "Chào bạn" }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
        },
      } as any,
    });
    console.log("Success! Extracted base64:", !!response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data);
  } catch(e: any) {
    console.error("Failed!", e?.message || e);
  }
}
testTTS();
