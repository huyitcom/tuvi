import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    // Dọn dẹp ký tự Markdown thừa để giọng đọc tự nhiên, không bị vấp
    const cleanText = text.replace(/[#*`_:-]/g, ' ').replace(/\s+/g, ' ').trim();
    const truncatedText = cleanText.substring(0, 5000);

    // ========================================================
    // CẤU HÌNH API VIVIBE / LUCYLAB 
    // ========================================================
    const API_KEY = process.env.VIVIBE_API_KEY || 'sk_live_IO2D0o6QJ4bBs4ecuy0piDkB4kpl6D6A';
    const VOICE_ID = '8u97ewbLyV5dwePspwJY1w';
    const ENDPOINT = 'https://api.lucylab.io/json-rpc';

    // Hàm chia nhỏ văn bản theo gạch đầu dòng dùng cho trường hợp dự phòng Google TTS
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

        if (currentChunk.length + part.length + 1 > maxLength) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = part;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + part;
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      return chunks;
    };

    try {
      console.log(`[Vivibe API Handler] Gửi yêu cầu sinh giọng đọc (độ dài: ${truncatedText.length} ký tự)...`);
      
      // Bước 1: Khởi tạo TTS Job bằng ttsLongText để hỗ trợ văn bản dài mượt mà
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'ttsLongText',
          input: {
            text: truncatedText,
            userVoiceId: VOICE_ID,
            speed: 1.0
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Khởi tạo job thất bại: mã lỗi ${response.status}, chi tiết: ${errText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`ViVibe trả về lỗi: ${JSON.stringify(data.error)}`);
      }

      const exportId = data.result?.projectExportId;
      if (!exportId) {
        throw new Error(`Không nhận được projectExportId: ${JSON.stringify(data)}`);
      }

      console.log(`[Vivibe API Handler] Đã tạo thành công TTS Job với ID: ${exportId}. Bắt đầu thăm dò tiến độ...`);

      // Bước 2: Thăm dò (Polling) để lấy link tải file audio đã xử lý xong
      let audioUrl = '';
      const maxAttempts = 25; // Chờ tối đa 50 giây (25 lần * 2000ms)
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[Vivibe API Handler] Thăm dò lần ${attempt}...`);
        
        const statusRes = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'getExportStatus',
            input: { projectExportId: exportId }
          })
        });

        if (!statusRes.ok) {
          console.warn(`[Vivibe API Handler] Thăm dò thất bại, thử lại trong giây lát. Mã lỗi: ${statusRes.status}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const statusData = await statusRes.json();
        if (statusData.error) {
          throw new Error(`Lỗi cập nhật tiến độ: ${JSON.stringify(statusData.error)}`);
        }

        const state = statusData.result?.state;
        console.log(`[Vivibe API Handler] Trạng thái Job hiện tại: ${state}`);

        if (state === 'completed') {
          audioUrl = statusData.result?.url;
          break;
        } else if (state === 'failed') {
          throw new Error(`Job sinh giọng nói bị thất bại ở phía máy chủ ViVibe.`);
        }

        // Chờ 2 giây trước lần thăm dò tiếp theo
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!audioUrl) {
        throw new Error('Thời gian chờ xử lý giọng nói quá lâu (Timeout 50s)');
      }

      console.log(`[Vivibe API Handler] Tạo giọng đọc thành công! Khởi sự tải file và truyền phát...`);

      // Bước 3: Tải file nhị phân và gửi trực tiếp về cho trình duyệt
      const audioFetch = await fetch(audioUrl);
      if (!audioFetch.ok) {
        throw new Error(`Không thể tải xuống file âm thanh: mã lỗi ${audioFetch.status}`);
      }

      const arrayBuffer = await audioFetch.arrayBuffer();
      const finalBuffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', 'audio/mpeg');
      return res.status(200).send(finalBuffer);

    } catch (vivibeErr: any) {
      console.warn('[Vivibe TTS Handler Failed, kích hoạt giọng đọc chị Google dự phòng]', vivibeErr.message);
      
      // Dự phòng giọng đọc chị Google nếu Vivibe lỗi hoặc quá tải
      const fallbackBuffers: Buffer[] = [];
      const fallbackText = truncatedText.substring(0, 1500);
      const googleChunks = splitTextIntoChunks(fallbackText, 180);
      
      for (let i = 0; i < googleChunks.length; i += 6) {
        const batch = googleChunks.slice(i, i + 6);
        const batchPromises = batch.map(async (chunk) => {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
          const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          return Buffer.from(await response.arrayBuffer());
        });
        fallbackBuffers.push(...(await Promise.all(batchPromises)));
      }
      
      const finalFallbackBuffer = Buffer.concat(fallbackBuffers);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.status(200).send(finalFallbackBuffer);
    }

  } catch (err: any) {
    console.error('Lỗi tích hợp Vivibe TTS Handler:', err);
    res.status(500).json({ error: err.message });
  }
}