import { EdgeTTS } from "node-edge-tts";
import * as fs from "fs";

async function testTts() {
  try {
    const tts = new EdgeTTS({
      voice: 'vi-VN-NamMinhNeural',
      lang: 'vi-VN',
      rate: '-10%',
      pitch: '-8%'
    });
    const audioPath = "test-namminh.mp3";
    await tts.ttsPromise("Xin chào đây là lão phu", audioPath);
    console.log("Success! File size:", fs.statSync(audioPath).size);
  } catch (err) {
    console.error("Caught error:", err);
  }
}

testTts();
