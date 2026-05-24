import { EdgeTTS } from "node-edge-tts";

async function testTts() {
  try {
    const tts = new EdgeTTS();
    await tts.voice2file("Xin chào, đây là bài thử", "test.mp3");
    console.log("Success!");
  } catch (err) {
    console.error("Caught error:", err);
  }
}

testTts();
