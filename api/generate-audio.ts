import Buffer from 'buffer';

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
    // CẤU HÌNH API VIVIBE 
    // ========================================================
    // Ưu tiên lấy Key từ Vercel Env, nếu không có thì dùng tạm Key bạn vừa cung cấp
    const API_KEY = process.env.VIVIBE_API_KEY || 'sk_live_IO2D0o6QJ4bBs4ecuy0piDkB4kpl6D6A';
    const VOICE_ID = '1mFqK2ZPpy9FUCBv4D8Leu';

    // Hàm chia nhỏ văn bản theo dấu câu (ngăn Vercel bị Timeout 10s khi đọc bài dài)
    const splitTextIntoChunks = (txt: string, maxLength: number = 400): string[] => {
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

    const chunks = splitTextIntoChunks(truncatedText, 400);
    const audioBuffers: Buffer[] = [];

    // Chạy vòng lặp gọi API Vivibe song song (mỗi lần 3 đoạn)
    for (let i = 0; i < chunks.length; i += 3) {
      const batch = chunks.slice(i, i + 3);
      const batchPromises = batch.map(async (chunk) => {
        
        // Gọi API Vivibe (Hỗ trợ định dạng endpoint phổ biến)
        const response = await fetch(`https://api.vivibe.app/v1/text-to-speech/${VOICE_ID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'xi-api-key': API_KEY // Dự phòng header tiêu chuẩn của hệ thống
          },
          body: JSON.stringify({
            text: chunk,
            // Bạn có thể mở khóa thông số này nếu Vivibe cho phép chỉnh tốc độ
            // speed: 0.95 
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Lỗi từ Vivibe (${response.status}): ${errorText}`);
        }

        // Lấy luồng âm thanh nhị phân trả về
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      });

      // Gộp các đoạn âm thanh lại
      const buffers = await Promise.all(batchPromises);
      audioBuffers.push(...buffers);
    }

    // Nối toàn bộ file âm thanh lại thành 1 bài hoàn chỉnh
    const finalBuffer = Buffer.concat(audioBuffers);
    
    // Trả kết quả về cho giao diện Frontend phát nhạc
    res.setHeader('Content-Type', 'audio/mpeg');
    res.status(200).send(finalBuffer);

  } catch (err: any) {
    console.error('Lỗi tích hợp Vivibe TTS:', err);
    res.status(500).json({ error: err.message });
  }
}