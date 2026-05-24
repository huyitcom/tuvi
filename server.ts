import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

async function generateEdgeTts(text: string, voice = 'vi-VN-NamMinhNeural'): Promise<Buffer> {
    const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
    const WINDOWS_FILE_TIME_EPOCH = 11644473600n;
    const ticks = BigInt(Math.floor((Date.now() / 1000) + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n;
    const roundedTicks = ticks - (ticks % 3000000000n);
    const hash = crypto.createHash('sha256').update(`${roundedTicks}${TRUSTED_CLIENT_TOKEN}`, 'ascii').digest('hex').toUpperCase();

    const CHROMIUM_FULL_VERSION = '143.0.3650.75';
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${hash}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`;

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, {
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            headers: {
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_FULL_VERSION.split('.')[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_FULL_VERSION.split('.')[0]}.0.0.0`
            }
        });

        const audioChunks: Buffer[] = [];
        let timeOut = setTimeout(() => { ws.close(); reject(new Error('TTS Timeout')); }, 30000);

        ws.on('open', () => {
            ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
            
            const reqId = crypto.randomBytes(16).toString('hex');
            const escapeXml = (s: string) => s.replace(/[<>&"']/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'}[c] || c));
            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN"><voice name="${voice}"><prosody rate="-5%" pitch="-5%">${escapeXml(text)}</prosody></voice></speak>`;
            
            ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        });

        ws.on('message', (data: Buffer, isBinary: boolean) => {
            if (isBinary) {
                const sep = 'Path:audio\r\n';
                const idx = data.indexOf(sep);
                if (idx !== -1) {
                    const audio = data.subarray(idx + sep.length);
                    if (audio.length > 0) audioChunks.push(audio);
                }
            } else {
                const msg = data.toString();
                if (msg.includes('Path:turn.end')) {
                    clearTimeout(timeOut);
                    ws.close();
                    resolve(Buffer.concat(audioChunks));
                }
            }
        });

        ws.on('error', (err: any) => {
            clearTimeout(timeOut);
            reject(err);
        });
    });
}

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
        { 
          vi: 'Bản mệnh: Thân (Khỉ)', 
          en: 'Monkey', 
          fallbackImage: 'https://images.unsplash.com/photo-1540573133-7587b7f16bf5?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Dậu (Gà)', 
          en: 'Rooster', 
          fallbackImage: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Tuất (Chó)', 
          en: 'Dog', 
          fallbackImage: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Hợi (Lợn)', 
          en: 'Pig', 
          fallbackImage: 'https://images.unsplash.com/photo-1604848698030-c434ba0861db?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Tý (Chuột)', 
          en: 'Rat', 
          fallbackImage: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Sửu (Trâu)', 
          en: 'Water Buffalo', 
          fallbackImage: 'https://images.unsplash.com/photo-1551884833-253d7f240508?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Dần (Hổ)', 
          en: 'Tiger', 
          fallbackImage: 'https://images.unsplash.com/photo-1508215886085-26388f586a1e?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Mão (Mèo)', 
          en: 'Cat', 
          fallbackImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Thìn (Rồng)', 
          en: 'Dragon', 
          fallbackImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Tỵ (Rắn)', 
          en: 'Snake', 
          fallbackImage: 'https://images.unsplash.com/photo-1531386151447-fd762e7a3ae4?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Ngọ (Ngựa)', 
          en: 'Horse', 
          fallbackImage: 'https://images.unsplash.com/photo-1488034976201-ffbaa99cbf5c?auto=format&fit=crop&q=80&w=600' 
        },
        { 
          vi: 'Bản mệnh: Mùi (Dê)', 
          en: 'Goat', 
          fallbackImage: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=600' 
        },
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

      // Use our retry & fallback helper to get the text analysis
      let resultText = "";
      try {
        const textResponse = await callGeminiWithRetry({
          model: 'gemini-3.5-flash',
          contents: { parts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
          retries: 3,
          fallbackModels: ['gemini-3.1-flash-lite', 'gemini-flash-latest']
        });
        
        if (textResponse && textResponse.text) {
          resultText = textResponse.text;
        } else {
          throw new Error("Không nhận được phản hồi phù hợp từ trí tuệ nhân tạo");
        }
      } catch (textErr: any) {
        console.error("Text horoscope generation failed:", textErr);
        return res.status(500).json({ error: "Lão phu chưa thể thấu thị thiên cơ lúc này. Xin đương số hoan hỷ thử lại sau ít phút." });
      }

      // Predefined highly-polished mystical fallback illustration for this zodiac animal
      const zodiacImage = zodiac.fallbackImage;

      return res.json({
        result: resultText,
        zodiacName: zodiac.vi,
        zodiacImage: zodiacImage
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

      // Safe clean text
      const cleanText = text
        .replace(/[#*`_:-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Limit length to prevent extreme processing time, 5000 characters is plenty for a full 8-10 minutes reading
      const truncatedText = cleanText.substring(0, 5000);

      console.log(`[TTS] Trying Microsoft Edge TTS (Southern Older Male Voice). Length: ${truncatedText.length} characters`);

      try {
        const combinedBuffer = await generateEdgeTts(truncatedText);
        
        if (combinedBuffer.length > 0) {
          console.log(`[Edge TTS Success] Compiled older Southern Male audio. Total bytes: ${combinedBuffer.length}`);
          res.setHeader('Content-Type', 'audio/mpeg');
          return res.status(200).send(combinedBuffer);
        } else {
          throw new Error("No audio bytes received from Edge TTS");
        }
      } catch (edgeErr: any) {
        console.warn("[Edge TTS Failed, falling back to Google Translate TTS]", edgeErr?.message || edgeErr);
        
        // Helper to split text into safe Google Translate TTS size (max 180 chars)
        const splitTextIntoChunks = (txt: string, maxLength: number = 180): string[] => {
          const sentences = txt.split(/([.,!?;:\n]+)/);
          const chunks: string[] = [];
          let currentChunk = '';

          for (let i = 0; i < sentences.length; i++) {
            let part = sentences[i];
            if (!part) continue;
            if (i + 1 < sentences.length && sentences[i + 1].match(/^[.,!?;:\n]+$/)) {
              part += sentences[i + 1];
              i++;
            }
            
            if (part.length > maxLength) {
              const words = part.split(' ');
              let subChunk = '';
              for (const word of words) {
                if (subChunk.length + word.length + 1 > maxLength) {
                  if (subChunk.trim()) chunks.push(subChunk.trim());
                  subChunk = word;
                } else {
                  subChunk += (subChunk ? ' ' : '') + word;
                }
              }
              if (subChunk.trim()) {
                if (currentChunk.length + subChunk.length + 1 > maxLength) {
                  if (currentChunk.trim()) chunks.push(currentChunk.trim());
                  currentChunk = subChunk;
                } else {
                  currentChunk += (currentChunk ? ' ' : '') + subChunk;
                }
              }
            } else {
              if (currentChunk.length + part.length + 1 > maxLength) {
                if (currentChunk.trim()) chunks.push(currentChunk.trim());
                currentChunk = part;
              } else {
                currentChunk += (currentChunk ? ' ' : '') + part;
              }
            }
          }
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          return chunks;
        };

        const chunks = splitTextIntoChunks(truncatedText);
        console.log(`[Google TTS Fallback] Fragmented text into ${chunks.length} sequential small chunks`);

        // Fetch chunks with parallelized batching to stay incredibly fast
        const audioBuffers: Buffer[] = [];
        const batchSize = 6;
        
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const batchPromises = batch.map(async (chunk) => {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
              }
            });
            if (!response.ok) {
              throw new Error(`Failed to fetch TTS for chunk: ${chunk}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
          });
          
          const results = await Promise.all(batchPromises);
          audioBuffers.push(...results);
        }

        const combinedBuffer = Buffer.concat(audioBuffers);
        console.log(`[Google TTS Fallback Success] Compiled audio. Chunks: ${chunks.length}. Total bytes: ${combinedBuffer.length}`);
        res.setHeader('Content-Type', 'audio/mpeg');
        return res.status(200).send(combinedBuffer);
      }
    } catch (err: any) {
      console.error("Audio generation completely failed:", err);
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
