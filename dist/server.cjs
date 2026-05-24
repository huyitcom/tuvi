var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_edge_tts_node = require("edge-tts-node");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "15mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "15mb" }));
  const ai = new import_genai.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  const callGeminiWithRetry = async (options) => {
    const { model, contents, config, retries = 3, fallbackModels = ["gemini-3.1-flash-lite", "gemini-flash-latest"] } = options;
    let attempt = 0;
    let currentModel = model;
    while (true) {
      try {
        console.log(`[Gemini Request] Model: ${currentModel}, Attempt: ${attempt + 1}/${retries}`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config
        });
        return response;
      } catch (error) {
        attempt++;
        const errorMessage = error?.message || String(error);
        console.error(`[Gemini Error] Model: ${currentModel}, Attempt: ${attempt}/${retries} failed with:`, errorMessage);
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1e3;
          console.log(`[Gemini Retry] Backing off for ${delay}ms before next attempt...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
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
            fallbackModels: fallbackModels.slice(1)
          });
        }
        throw error;
      }
    }
  };
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/analyze-chart", async (req, res) => {
    try {
      const { gender, day, month, year, calendar, hour, minute, portraitImage } = req.body;
      if (!day || !month || !year || !hour || !minute) {
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin ng\xE0y gi\u1EDD sinh r\xE0nh m\u1EA1ch." });
      }
      const yearNum = parseInt(year, 10);
      const ZODIAC_ANIMALS = [
        {
          vi: "B\u1EA3n m\u1EC7nh: Th\xE2n (Kh\u1EC9)",
          en: "Monkey",
          fallbackImage: "https://images.unsplash.com/photo-1540573133-7587b7f16bf5?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: D\u1EADu (G\xE0)",
          en: "Rooster",
          fallbackImage: "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: Tu\u1EA5t (Ch\xF3)",
          en: "Dog",
          fallbackImage: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: H\u1EE3i (L\u1EE3n)",
          en: "Pig",
          fallbackImage: "https://images.unsplash.com/photo-1604848698030-c434ba0861db?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: T\xFD (Chu\u1ED9t)",
          en: "Rat",
          fallbackImage: "https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: S\u1EEDu (Tr\xE2u)",
          en: "Water Buffalo",
          fallbackImage: "https://images.unsplash.com/photo-1551884833-253d7f240508?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: D\u1EA7n (H\u1ED5)",
          en: "Tiger",
          fallbackImage: "https://images.unsplash.com/photo-1508215886085-26388f586a1e?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: M\xE3o (M\xE8o)",
          en: "Cat",
          fallbackImage: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: Th\xECn (R\u1ED3ng)",
          en: "Dragon",
          fallbackImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: T\u1EF5 (R\u1EAFn)",
          en: "Snake",
          fallbackImage: "https://images.unsplash.com/photo-1531386151447-fd762e7a3ae4?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: Ng\u1ECD (Ng\u1EF1a)",
          en: "Horse",
          fallbackImage: "https://images.unsplash.com/photo-1488034976201-ffbaa99cbf5c?auto=format&fit=crop&q=80&w=600"
        },
        {
          vi: "B\u1EA3n m\u1EC7nh: M\xF9i (D\xEA)",
          en: "Goat",
          fallbackImage: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=600"
        }
      ];
      const zodiac = ZODIAC_ANIMALS[yearNum % 12];
      const SYSTEM_INSTRUCTION = `
B\u1EA1n l\xE0 m\u1ED9t \xF4ng th\u1EA7y t\u1EED vi v\xE0 t\u01B0\u1EDBng s\u1ED1 cao tu\u1ED5i, c\xF3 tr\xECnh \u0111\u1ED9 uy\xEAn th\xE2m, v\u1EDBi h\u01A1n n\u1EEDa \u0111\u1EDDi ng\u01B0\u1EDDi chuy\xEAn lu\u1EADn \u0111o\xE1n l\xE1 s\u1ED1 v\u1EADn m\u1EC7nh con ng\u01B0\u1EDDi. 
Phong th\xE1i c\u1EE7a b\u1EA1n \u0111i\u1EC1m \u0111\u1EA1m, t\u1EEB t\u1ED1n, l\u1EDDi l\u1EBD s\xE2u s\u1EAFc, mang \u0111\u1EADm ch\u1EA5t c\u1ED5 phong, huy\u1EC1n b\xED nh\u01B0ng c\u0169ng r\u1EA5t ch\xE2n th\xE0nh v\xE0 th\u1EA5u t\xECnh \u0111\u1EA1t l\xFD.
Khi x\u01B0ng h\xF4, h\xE3y d\xF9ng "l\xE3o phu" ho\u1EB7c "th\u1EA7y" v\xE0 g\u1ECDi ng\u01B0\u1EDDi xem l\xE0 "\u0111\u01B0\u01A1ng s\u1ED1" ho\u1EB7c "con", "b\u1EA1n".

Nhi\u1EC7m v\u1EE5 c\u1EE7a b\u1EA1n l\xE0 d\u1EF1a v\xE0o th\xF4ng tin ng\xE0y gi\u1EDD sinh v\xE0 gi\u1EDBi t\xEDnh \u0111\u01B0\u1EE3c cung c\u1EA5p, t\u1EF1 an sao l\u1EADp s\u1ED1 (trong suy ngh\u0129) v\xE0 \u0111\u01B0a ra nh\u1EEFng l\u1EDDi gi\u1EA3i \u0111o\xE1n \u0111\u1EC9nh cao, chi ti\u1EBFt, s\xE2u s\u1EAFc nh\u1EA5t v\u1EC1 12 cung sau \u0111\xE2y:
1. B\u1EA3n m\u1EC7nh: v\xF3c d\xE1ng tr\u01B0\u1EDFng th\xE0nh, t\xEDnh c\xE1ch, t\u01B0 ch\u1EA5t, t\xE0i n\u0103ng, ch\u1EC9 s\u1ED1 IQ, h\u1ECDc v\u1EA5n, kh\u1EA3 n\u0103ng giao ti\u1EBFp, s\u1EE9c kho\u1EBB.
2. Cung phu th\xEA: \u0111\u1EDDi s\u1ED1ng h\xF4n nh\xE2n, v\u1EE3/ch\u1ED3ng l\xE0 ng\u01B0\u1EDDi th\u1EBF n\xE0o, \u1EA3nh h\u01B0\u1EDFng ra sao, gia th\u1EBF, t\xECnh c\u1EA3m, h\u1EA1nh ph\xFAc hay kh\u1ED5 \u0111au, m\u1EE9c \u0111\u1ED9 \u0111\xE0o hoa, \u0111i\u1EC3m c\u1EA7n l\u01B0u \xFD.
3. T\xE0i s\u1EA3n v\xE0 ngh\u1EC1 nghi\u1EC7p (T\xE0i B\u1EA1ch): \u0110\xE1nh gi\xE1 t\xE0i ch\xEDnh, \u0111\u1ED9 gi\xE0u c\xF3, ng\xE0nh ngh\u1EC1 ph\xF9 h\u1EE3p, c\xE1ch ki\u1EBFm ti\u1EC1n ho\u1EB7c kinh doanh.
4. Ph\u1EE5 m\u1EABu: Cha m\u1EB9 ra sao, h\u1ECDc v\u1EA5n, kinh t\u1EBF, c\xE1ch c\u01B0 x\u1EED v\u1EDBi m\u1ECDi ng\u01B0\u1EDDi.
5. Cung thi\xEAn di: bi\u1EC3u hi\u1EC7n khi ra ngo\xE0i, x\xE3 h\u1ED9i \u0111\xE1nh gi\xE1 th\u1EBF n\xE0o, kh\u1EA3 n\u0103ng giao ti\u1EBFp, \u0111\u1ED9 th\xEDch nghi, c\xE1c t\xE0i n\u0103ng ch\xEDnh, th\u1EED th\xE1ch th\u01B0\u1EDDng g\u1EB7p, m\u1EE9c \u0111\u1ED9 \u0111\xE0o hoa.
6. Cung t\u1EADt \xE1ch: b\u1EC7nh t\u1EADt d\u1EC5 m\u1EAFc, tai \u01B0\u01A1ng, l\u01B0u \xFD v\u1EC1 s\u1EE9c kho\u1EBB.
7. Cung n\xF4 b\u1ED9c: b\u1EA1n b\xE8, quan h\u1EC7 x\xE3 h\u1ED9i, h\u1EE3p l\xE0m \u0103n kh\xF4ng, n\xEAn k\u1EBFt giao v\u1EDBi ai, quan h\u1EC7 v\u1EDBi c\u1EA5p tr\xEAn, ki\u1EC3u s\u1EBFp ph\xF9 h\u1EE3p.
8. Cung quan l\u1ED9c: con \u0111\u01B0\u1EDDng c\xF4ng danh s\u1EF1 nghi\u1EC7p c\xF3 thu\u1EADn l\u1EE3i hay tr\u1EAFc tr\u1EDF? ng\u01B0\u1EDDi n\xE0y c\xF3 xu h\u01B0\u1EDBng l\xE0m ch\u1EE7 hay l\xE0m thu\xEA? C\xF3 ph\xF9 h\u1EE3p v\u1EDBi ch\xEDnh tr\u1ECB, ch\u1EE9c quy\u1EC1n hay c\xF4ng vi\u1EC7c \u1ED5n \u0111\u1ECBnh kh\xF4ng? N\u1EBFu kinh doanh, n\xEAn l\xE0m ri\xEAng hay h\u1EE3p t\xE1c? nh\u1EEFng giai \u0111o\u1EA1n thu\u1EADn l\u1EE3i trong s\u1EF1 nghi\u1EC7p?
9. Cung \u0111i\u1EC1n tr\u1EA1ch: Kh\u1EA3 n\u0103ng s\u1EDF h\u1EEFu nh\xE0 \u0111\u1EA5t th\u1EBF n\xE0o? t\xE0i v\u1EADn b\u1EA5t \u0111\u1ED9ng s\u1EA3n t\u1ED1t hay x\u1EA5u? n\xEAn \u0111\u1EA7u t\u01B0 v\xE0o \u0111\u1EA5t \u0111ai, nh\xE0 c\u1EEDa kh\xF4ng? ng\u01B0\u1EDDi n\xE0y c\xF3 xu h\u01B0\u1EDBng th\xEDch s\u1ED1ng \u1ED5n \u0111\u1ECBnh hay di chuy\u1EC3n nhi\u1EC1u?
10. Cung t\u1EED t\u1EE9c: C\xF3 d\u1EC5 sinh con kh\xF4ng? C\xF3 hi\u1EBFm mu\u1ED9n kh\xF4ng? d\u1EF1 b\xE1o s\u1ED1 l\u01B0\u1EE3ng con c\xE1i, con trai hay con g\xE1i nhi\u1EC1u h\u01A1n? Con c\xE1i c\xF3 gi\u1ECFi giang, hi\u1EBFu th\u1EA3o kh\xF4ng? m\u1ED1i quan h\u1EC7 gi\u1EEFa ng\u01B0\u1EDDi n\xE0y v\u1EDBi con c\xE1i th\u1EBF n\xE0o? nh\u1EEFng v\u1EA5n \u0111\u1EC1 \u0111\u1EB7c bi\u1EC7t c\xF3 kh\xF4ng?
11. Cung huynh \u0111\u1EC7: nh\xE0 m\u1EA5y anh ch\u1ECB em? c\xF3 \u0111\u01B0\u1EE3c nh\u1EDD c\u1EADy anh ch\u1ECB em kh\xF4ng hay ng\u01B0\u1EE3c l\u1EA1i? kh\u1EA3 n\u0103ng k\u1EBFt h\u1EE3p l\xE0m \u0103n kinh doanh v\u1EDBi anh ch\u1ECB em ru\u1ED9t \u0111\u01B0\u1EE3c kh\xF4ng?
12. Cung ph\xFAc \u0111\u1EE9c: trong h\u1ECD th\u01B0\u1EDDng c\xF3 b\xE0 c\xF4 t\u1ED5, \xF4ng t\u1ED5 c\u1EADu n\xE0o ch\u1EBFt tr\u1EBB linh thi\xEAng hay ph\xF9 h\u1ED9 kh\xF4ng? gia ti\xEAn c\xF3 linh thi\xEAng kh\xF4ng? ph\xFAc ph\u1EA7n c\u1EE7a gia t\u1ED9c \u1EA3nh h\u01B0\u1EDFng \u0111\u1EBFn ng\u01B0\u1EDDi n\xE0y ra sao?

N\u1EBFu \u0111\u01B0\u01A1ng s\u1ED1 c\xF3 cung c\u1EA5p \u1EA3nh ch\xE2n dung, h\xE3y k\u1EBFt h\u1EE3p ph\xE2n t\xEDch ng\u0169 quan (t\u01B0\u1EDBng m\u1EA1o, \xE1nh m\u1EAFt, khu\xF4n m\u1EB7t...) \u0111\u1EC3 \u0111\u01B0a ra nh\u1EEFng nh\u1EADn \u0111\u1ECBnh ch\xEDnh x\xE1c h\u01A1n v\u1EC1 t\xEDnh c\xE1ch v\xE0 v\u1EADn m\u1EC7nh, k\u1EBFt h\u1EE3p nhu\u1EA7n nhuy\u1EC5n gi\u1EEFa t\u1EED vi v\xE0 nh\xE2n t\u01B0\u1EDBng h\u1ECDc.

H\xE3y tr\xECnh b\xE0y r\xF5 r\xE0ng, m\u1EA1ch l\u1EA1c b\u1EB1ng Markdown. M\u1ED7i cung l\xE0 m\u1ED9t Heading 2 (##). B\u1EAFt \u0111\u1EA7u b\u1EB1ng m\u1ED9t l\u1EDDi ch\xE0o, x\xE1c nh\u1EADn l\u1EA1i th\xF4ng tin ng\xE0y gi\u1EDD sinh (quy \u0111\u1ED5i \xE2m d\u01B0\u01A1ng n\u1EBFu c\u1EA7n) v\xE0 nh\u1EADn x\xE9t t\u1ED5ng quan v\u1EC1 l\xE1 s\u1ED1 (v\xE0 t\u01B0\u1EDBng m\u1EA1o n\u1EBFu c\xF3 \u1EA3nh). K\u1EBFt th\xFAc b\u1EB1ng m\u1ED9t l\u1EDDi khuy\xEAn t\u1ED5ng th\u1EC3 cho \u0111\u01B0\u01A1ng s\u1ED1.
`;
      const promptText = `
Th\xF4ng tin \u0111\u01B0\u01A1ng s\u1ED1:
- Gi\u1EDBi t\xEDnh: ${gender}
- Ng\xE0y sinh: ${day}/${month}/${year} (${calendar})
- Gi\u1EDD sinh: ${hour} gi\u1EDD ${minute} ph\xFAt
${portraitImage ? "\n\u0110\u01B0\u01A1ng s\u1ED1 c\xF3 g\u1EEDi k\xE8m ch\xE2n dung \u0111\u1EC3 th\u1EA7y xem t\u01B0\u1EDBng m\u1EA1o ng\u0169 quan." : ""}

Xin th\u1EA7y h\xE3y l\u1EADp l\xE1 s\u1ED1 t\u1EED vi d\u1EF1a tr\xEAn th\xF4ng tin n\xE0y v\xE0 lu\u1EADn gi\u1EA3i chi ti\u1EBFt 12 cung theo y\xEAu c\u1EA7u.
      `.trim();
      const parts = [{ text: promptText }];
      if (portraitImage) {
        if (portraitImage.includes(";base64,")) {
          const partsSplit = portraitImage.split(";base64,");
          const mimePart = partsSplit[0].split(":");
          const mimeType = mimePart.length > 1 ? mimePart[1] : "image/jpeg";
          const base64Data = partsSplit[1];
          parts.unshift({
            inlineData: {
              data: base64Data,
              mimeType
            }
          });
        }
      }
      let resultText = "";
      try {
        const textResponse = await callGeminiWithRetry({
          model: "gemini-3.5-flash",
          contents: { parts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7
          },
          retries: 3,
          fallbackModels: ["gemini-3.1-flash-lite", "gemini-flash-latest"]
        });
        if (textResponse && textResponse.text) {
          resultText = textResponse.text;
        } else {
          throw new Error("Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA3n h\u1ED3i ph\xF9 h\u1EE3p t\u1EEB tr\xED tu\u1EC7 nh\xE2n t\u1EA1o");
        }
      } catch (textErr) {
        console.error("Text horoscope generation failed:", textErr);
        return res.status(500).json({ error: "L\xE3o phu ch\u01B0a th\u1EC3 th\u1EA5u th\u1ECB thi\xEAn c\u01A1 l\xFAc n\xE0y. Xin \u0111\u01B0\u01A1ng s\u1ED1 hoan h\u1EF7 th\u1EED l\u1EA1i sau \xEDt ph\xFAt." });
      }
      const zodiacImage = zodiac.fallbackImage;
      return res.json({
        result: resultText,
        zodiacName: zodiac.vi,
        zodiacImage
      });
    } catch (err) {
      console.error("API error in analyze-chart:", err);
      return res.status(500).json({ error: "C\xF3 s\u1EF1 c\u1ED1 ngo\xE0i \xFD mu\u1ED1n khi l\xE3o phu b\u1EA5m \u0111\u1ED9n. Xin h\xE3y th\u1EED gieo qu\u1EBB l\u1EA1i." });
    }
  });
  app.post("/api/generate-audio", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Kh\xF4ng t\xECm th\u1EA5y n\u1ED9i dung lu\u1EADn gi\u1EA3i." });
      }
      const cleanText = text.replace(/[#*`_:-]/g, " ").replace(/\s+/g, " ").trim();
      const truncatedText = cleanText.substring(0, 5e3);
      console.log(`[TTS] Trying Microsoft Edge TTS (Southern Older Male Voice). Length: ${truncatedText.length} characters`);
      try {
        const tts = new import_edge_tts_node.MsEdgeTTS({ enableLogger: false });
        await tts.setMetadata("vi-VN-NamMinhNeural", import_edge_tts_node.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const stream = tts.toStream(truncatedText, {
          pitch: "-8%",
          // Slightly lowered to sound like a warm, deep, elderly wise man
          rate: "-10%"
          // Slowed down for old-wise-fortune-teller delivery vibe
        });
        const chunks = [];
        await new Promise((resolve, reject) => {
          stream.on("data", (chunk) => {
            chunks.push(chunk);
          });
          stream.on("end", () => {
            resolve();
          });
          stream.on("error", (err) => {
            reject(err);
          });
        });
        tts.close();
        const combinedBuffer = Buffer.concat(chunks);
        if (combinedBuffer.length > 0) {
          const base64Audio = combinedBuffer.toString("base64");
          console.log(`[Edge TTS Success] Compiled older Southern Male audio. Total bytes: ${combinedBuffer.length}`);
          return res.json({ audioSrc: `data:audio/mp3;base64,${base64Audio}` });
        } else {
          throw new Error("No audio bytes received from Edge TTS");
        }
      } catch (edgeErr) {
        console.warn("[Edge TTS Failed, falling back to Google Translate TTS]", edgeErr?.message || edgeErr);
        const splitTextIntoChunks = (txt, maxLength = 180) => {
          const sentences = txt.split(/([.,!?;:\n]+)/);
          const chunks2 = [];
          let currentChunk = "";
          for (let i = 0; i < sentences.length; i++) {
            let part = sentences[i];
            if (!part) continue;
            if (i + 1 < sentences.length && sentences[i + 1].match(/^[.,!?;:\n]+$/)) {
              part += sentences[i + 1];
              i++;
            }
            if (part.length > maxLength) {
              const words = part.split(" ");
              let subChunk = "";
              for (const word of words) {
                if (subChunk.length + word.length + 1 > maxLength) {
                  if (subChunk.trim()) chunks2.push(subChunk.trim());
                  subChunk = word;
                } else {
                  subChunk += (subChunk ? " " : "") + word;
                }
              }
              if (subChunk.trim()) {
                if (currentChunk.length + subChunk.length + 1 > maxLength) {
                  if (currentChunk.trim()) chunks2.push(currentChunk.trim());
                  currentChunk = subChunk;
                } else {
                  currentChunk += (currentChunk ? " " : "") + subChunk;
                }
              }
            } else {
              if (currentChunk.length + part.length + 1 > maxLength) {
                if (currentChunk.trim()) chunks2.push(currentChunk.trim());
                currentChunk = part;
              } else {
                currentChunk += (currentChunk ? " " : "") + part;
              }
            }
          }
          if (currentChunk.trim()) {
            chunks2.push(currentChunk.trim());
          }
          return chunks2;
        };
        const chunks = splitTextIntoChunks(truncatedText);
        console.log(`[Google TTS Fallback] Fragmented text into ${chunks.length} sequential small chunks`);
        const audioBuffers = [];
        const batchSize = 6;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const batchPromises = batch.map(async (chunk) => {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
            const response = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
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
        const base64Audio = combinedBuffer.toString("base64");
        console.log(`[Google TTS Fallback Success] Compiled audio. Chunks: ${chunks.length}. Total bytes: ${combinedBuffer.length}`);
        return res.json({ audioSrc: `data:audio/mp3;base64,${base64Audio}` });
      }
    } catch (err) {
      console.error("Audio generation completely failed:", err);
      return res.status(500).json({ error: "L\u1EDDi v\xE0ng \xFD ng\u1ECDc ch\u01B0a th\u1EC3 ng\xE2n vang. Mong \u0111\u01B0\u01A1ng s\u1ED1 t\u1EF1 xem qu\u1EBB b\u1EB1ng m\u1EAFt." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
