import { EdgeTTS } from "node-edge-tts";

class MyEdgeTTS extends EdgeTTS {
  async test(text: string, audioPath: string) {
    const _wsConnect = await this._connectWebSocket();
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => reject('Timed out'), 30000);
      _wsConnect.on('message', async (data: any, isBinary: boolean) => {
        if (isBinary) {
          const str = data.subarray(0, 150).toString('utf8');
          console.log("BIN string length:", data.length);
          console.log(str.replace(/\r\n/g, '\\r\\n'));
        }
        else {
          if (data.toString().includes('Path:turn.end')) {
            _wsConnect.close();
            clearTimeout(timeout);
            resolve("Done");
          }
        }
      });
      let reqId = "12345678901234567890123456789012";
      _wsConnect.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="vi-VN"><voice name="vi-VN-NamMinhNeural"><prosody rate="-10%" pitch="-8%" volume="default">${text}</prosody></voice></speak>`);
    });
  }
}

async function testMode() {
  const tts = new MyEdgeTTS();
  await tts.test("Xin chào", "out.mp3");
}
testMode();
