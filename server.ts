import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase limit to handle portrait image uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Robust helper to call Gemini with retries (exponential backoff) and model fallback
  const callGeminiWithRetry = async (
    options: {
      model: string;
      contents: any;
      config?: any;
      retries?: number;
      fallbackModels?: string[];
    }
  ): Promise<any> => {
    const { model, contents, config, retries = 3, fallbackModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest'] } = options;
    let attempt = 0;
    let currentModel = model;
    
    while (true) {
      try {
        console.log(`[Gemini Request] Model: ${currentModel}, Attempt: ${attempt + 1}/${retries}`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config,
        });
        return response;
      } catch (error: any) {
        attempt++;
        const errorMessage = error?.message || String(error);
        console.error(`[Gemini Error] Model: ${currentModel}, Attempt: ${attempt}/${retries} failed with:`, errorMessage);
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[Gemini Retry] Backing off for ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (fallbackModels && fallbackModels.length > 0) {
          const nextModel = fallbackModels[0];
          console.log(`[Gemini Fallback] Switching from ${currentModel} to fallback: ${nextModel}`);
          return callGeminiWithRetry({
            model: nextModel,
            contents,
            config,
            retries: 2,
            fallbackModels: fallbackModels.slice(1),
          });
        }
        
        throw error;
      }
    }
  };

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Main divination analysis endpoint
  app.post("/api/analyze-chart", async (req, res) => {
    try {
      const { gender, day, month, year, calendar, hour, minute, portraitImage } = req.body;

      if (!day || !month || !year || !hour || !minute) {
        return res.status(400).json({ error: "Thiếu thông tin ngày giờ sinh rành mạch." });
      }

      const yearNum = parseInt(year, 10);
      const ZODIAC_ANIMALS = [
        { vi: 'Bản mệnh: Thân (Khỉ)', en: 'Monkey' },
        { vi: 'Bản mệnh: Dậu (Gà)', en: 'Rooster' },
        { vi: 'Bản mệnh: Tuất (Chó)', en: 'Dog' },
        { vi: 'Bản mệnh: Hợi (Lợn)', en: 'Pig' },
        { vi: 'Bản mệnh: Tý (Chuột)', en: 'Rat' },
        { vi: 'Bản mệnh: Sửu (Trâu)', en: 'Water Buffalo' },
        { vi: 'Bản mệnh: Dần (Hổ)', en: 'Tiger' },
        { vi: 'Bản mệnh: Mão (Mèo)', en: 'Cat' },
        { vi: 'Bản mệnh: Thìn (Rồng)', en: 'Dragon' },
        { vi: 'Bản mệnh: Tỵ (Rắn)', en: 'Snake' },
        { vi: 'Bản mệnh: Ngọ (Ngựa)', en: 'Horse' },
        { vi: 'Bản mệnh: Mùi (Dê)', en: 'Goat' },
      ];
      const zodiac = ZODIAC_ANIMALS[yearNum % 12];

      const SYSTEM_INSTRUCTION = `
Bạn là một ông thầy tử vi và tướng số cao tuổi, có trình độ uyên thâm, với hơn nửa đời người chuyên luận đoán lá số vận mệnh con người. 
Phong thái của bạn điềm đạm, từ tốn, lời lẽ sâu sắc, mang đậm chất cổ phong, huyền bí nhưng cũng rất chân thành và thấu tình đạt lý.
Khi xưng hô, hãy dùng "lão phu" hoặc "thầy" và gọi người xem là "đương số" hoặc "con", "bạn".

Nhiệm vụ của bạn là dựa vào thông tin ngày giờ sinh và giới tính được cung cấp, tự an sao lập số (trong suy nghĩ) và đưa ra những lời giải đoán đỉnh cao, chi tiết, sâu sắc nhất về 12 cung sau đây:
1. Bản mệnh: vóc dáng trưởng thành, tính cách, tư chất, tài năng, chỉ số IQ, học vấn, khả năng giao tiếp, sức khoẻ.
2. Cung phu thê: đời sống hôn nhân, vợ/chồng là người thế nào, ảnh hưởng ra sao, gia thế, tình cảm, hạnh phúc hay khổ đau, mức độ đào hoa, điểm cần lưu ý.
3. Tài sản và nghề nghiệp (Tài Bạch): Đánh giá tài chính, độ giàu có, ngành nghề phù hợp, cách kiếm tiền hoặc kinh doanh.
4. Phụ mẫu: Cha mẹ ra sao, học vấn, kinh tế, cách cư xử với mọi người.
5. Cung thiên di: biểu hiện khi ra ngoài, xã hội đánh giá thế nào, khả năng giao tiếp, độ thích nghi, các tài năng chính, thử thách thường gặp, mức độ đào hoa.
6. Cung tật ách: bệnh tật dễ mắc, tai ương, lưu ý về sức khoẻ.
7. Cung nô bộc: bạn bè, quan hệ xã hội, hợp làm ăn không, nên kết giao với ai, quan hệ với cấp trên, kiểu sếp phù hợp.
8. Cung quan lộc: con đường công danh sự nghiệp có thuận lợi hay trắc trở? người này có xu hướng làm chủ hay làm thuê? Có phù hợp với chính trị, chức quyền hay công việc ổn định không? Nếu kinh doanh, nên làm riêng hay hợp tác? những giai đoạn thuận lợi trong sự nghiệp?
9. Cung điền trạch: Khả năng sở hữu nhà đất thế nào? tài vận bất động sản tốt hay xấu? nên đầu tư vào đất đai, nhà cửa không? người này có xu hướng thích sống ổn định hay di chuyển nhiều?
10. Cung tử tức: Có dễ sinh con không? Có hiếm muộn không? dự báo số lượng con cái, con trai hay con gái nhiều hơn? Con cái có giỏi giang, hiếu thảo không? mối quan hệ giữa người này với con cái thế nào? những vấn đề đặc biệt có không?
11. Cung huynh đệ: nhà mấy anh chị em? có được nhờ cậy anh chị em không hay ngược lại? khả năng kết hợp làm ăn kinh doanh với anh chị em ruột được không?
12. Cung phúc đức: trong họ thường có bà cô tổ, ông tổ cậu nào chết trẻ linh thiêng hay phù hộ không? gia tiên có linh thiêng không? phúc phần của gia tộc ảnh hưởng đến người này ra sao?

Nếu đương số có cung cấp ảnh chân dung, hãy kết hợp phân tích ngũ quan (tướng mạo, ánh mắt, khuôn mặt...) để đưa ra những nhận định chính xác hơn về tính cách và vận mệnh, kết hợp nhuần nhuyễn giữa tử vi và nhân tướng học.

Hãy trình bày rõ ràng, mạch lạc bằng Markdown. Mỗi cung là một Heading 2 (##). Bắt đầu bằng một lời chào, xác nhận lại thông tin ngày giờ sinh (quy đổi âm dương nếu cần) và nhận xét tổng quan về lá số (và tướng mạo nếu có ảnh). Kết thúc bằng một lời khuyên tổng thể cho đương số.
`;

      const promptText = `
Thông tin đương số:
- Giới tính: ${gender}
- Ngày sinh: ${day}/${month}/${year} (${calendar})
- Giờ sinh: ${hour} giờ ${minute} phút
${portraitImage ? '\nĐương số có gửi kèm chân dung để thầy xem tướng mạo ngũ quan.' : ''}

Xin thầy hãy lập lá số tử vi dựa trên thông tin này và luận giải chi tiết 12 cung theo yêu cầu.
      `.trim();

      const parts: any[] = [{ text: promptText }];
      
      if (portraitImage) {
        // Safe check for base64
        if (portraitImage.includes(';base64,')) {
          const partsSplit = portraitImage.split(';base64,');
          const mimePart = partsSplit[0].split(':');
          const mimeType = mimePart.length > 1 ? mimePart[1] : 'image/jpeg';
          const base64Data = partsSplit[1];
          parts.unshift({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
      }

      // 1. Text horoscope call - using our retry & fallback helper
      const textPromise = callGeminiWithRetry({
        model: 'gemini-3.5-flash',
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
        retries: 3,
        fallbackModels: ['gemini-3.1-flash-lite', 'gemini-flash-latest']
      });

      // 2. Image generation call - using our helper but with fast-fail since quota might be 0
      const imagePromise = callGeminiWithRetry({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `A majestic, mystical, and artistic portrait of a ${zodiac.en}, representing the Vietnamese zodiac sign. Oriental fantasy style, golden and dark purple color palette, highly detailed, digital art, tarot card style, ethereal lighting.` }
          ]
        },
        retries: 1, // Minimize retry overhead for quota 0 model
        fallbackModels: [] // No text model fallbacks for images!
      });

      // Wait for both safely settled
      const [textResponse, imgResponse] = await Promise.allSettled([textPromise, imagePromise]);

      let resultText = "";
      if (textResponse.status === 'fulfilled' && textResponse.value && textResponse.value.text) {
        resultText = textResponse.value.text;
      } else {
        const errorMsg = textResponse.status === 'rejected' ? textResponse.reason : "Không nhận được phản hồi phù hợp";
        console.error("Text horoscope generation failed:", errorMsg);
        return res.status(500).json({ error: "Lão phu chưa thể thấu thị thiên cơ lúc này. Xin đương số hoan hỷ thử lại sau ít phút." });
      }

      let zodiacImage = "";
      if (imgResponse.status === 'fulfilled' && imgResponse.value && imgResponse.value.candidates?.[0]?.content?.parts) {
        for (const part of imgResponse.value.candidates[0].content.parts) {
          if (part.inlineData) {
            zodiacImage = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      } else {
        const errorMsg = imgResponse.status === 'rejected' ? imgResponse.reason : "Không tạo được hình ảnh linh vật";
        console.error("Zodiac image generation failed (non-blocking):", errorMsg);
      }

      return res.json({
        result: resultText,
        zodiacName: zodiac.vi,
        zodiacImage: zodiacImage || null
      });

    } catch (err: any) {
      console.error("API error in analyze-chart:", err);
      return res.status(500).json({ error: "Có sự cố ngoài ý muốn khi lão phu bấm độn. Xin hãy thử gieo quẻ lại." });
    }
  });

  // TTS Endpoint
  app.post("/api/generate-audio", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Không tìm thấy nội dung luận giải." });
      }

      // Clean up markdown syntax and redundant spacings
      const cleanText = text
        .replace(/[#*`_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      console.log(`[TTS Processor] Starting full reading text length: ${cleanText.length} characters`);

      // 1. Group sentences into size-safe chunks
      const sentences = cleanText.split(/([.!?]+)/).filter(s => s.trim().length > 0);
      const chunks: string[] = [];
      let currentChunk = '';

      for (let i = 0; i < sentences.length; i++) {
        let part = sentences[i];
        // If it's punctuation, append to current sentence
        if (i + 1 < sentences.length && sentences[i + 1].match(/^[.!?]+$/)) {
          part += sentences[i + 1];
          i++;
        }

        // Gemini TTS can handle large text sizes (up to several thousand chars per request!)
        // Let's constrain the chunk length to ~2500 characters max to prevent timeouts but still limit the number of API calls
        // to stay well within the 10 RPM rate limit for TTS.
        if (currentChunk.length + part.length > 2500) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = part;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + part;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // Allow up to 4 chunks (around ~10000 characters), which provides an abundant full 10-12 minutes reading
      const limitedChunks = chunks.slice(0, 4);
      console.log(`[TTS Processor] Fragmented text into ${limitedChunks.length} sequential chunks`);

      const pcmBuffers: Buffer[] = [];

      // Helper to fetch single chunk PCM
      const fetchChunkPcm = async (chunkText: string): Promise<Buffer> => {
        const response = await callGeminiWithRetry({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: chunkText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck is a deep warm male voice
              },
            },
          },
          retries: 3,
          fallbackModels: [] // No fallback for speech
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          throw new Error("Không nhận được phản hồi âm thanh từ hệ thống.");
        }

        const buffer = Buffer.from(base64Audio, 'base64');
        // Let's strip the 44-byte WAV header if the returned content already contains it (starts with RIFF)
        if (buffer.length >= 44 && buffer.slice(0, 4).toString('ascii') === 'RIFF') {
          return buffer.subarray(44);
        }
        return buffer;
      };

      // Read chunks sequentially (to never trigger 429 rate limit because of simultaneous calls)
      for (let i = 0; i < limitedChunks.length; i++) {
        console.log(`[TTS Processor] Rendering chunk ${i + 1}/${limitedChunks.length} (length: ${limitedChunks[i].length})`);
        const pcm = await fetchChunkPcm(limitedChunks[i]);
        pcmBuffers.push(pcm);
        
        if (i < limitedChunks.length - 1) {
          // Generous space gap between sequential requests
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Concatenate raw PCM audio signals together
      const concatenatedPcm = Buffer.concat(pcmBuffers);
      const dataSize = concatenatedPcm.length;

      // Build standard WAVE header for 24kHz, 16-bit Mono sound
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      const blockAlign = numChannels * (bitsPerSample / 8);

      const header = Buffer.alloc(44);
      header.write('RIFF', 0);
      header.writeUInt32LE(36 + dataSize, 4);
      header.write('WAVE', 8);
      header.write('fmt ', 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20); // Linear PCM modulation format
      header.writeUInt16LE(numChannels, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(byteRate, 28);
      header.writeUInt16LE(blockAlign, 32);
      header.writeUInt16LE(bitsPerSample, 34);
      header.write('data', 36);
      header.writeUInt32LE(dataSize, 40);

      const responseWav = Buffer.concat([header, concatenatedPcm]);
      const base64Wav = responseWav.toString('base64');

      console.log(`[TTS Success] Compiled multi-chunk audio. Total chunks processed: ${limitedChunks.length}. Bytes: ${responseWav.length}`);
      return res.json({ audioSrc: `data:audio/wav;base64,${base64Wav}` });

    } catch (err: any) {
      console.error("TTS generation error:", err);
      return res.status(500).json({ error: "Lời vàng ý ngọc chưa thể ngân vang. Mong đương số tự xem quẻ bằng mắt." });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
