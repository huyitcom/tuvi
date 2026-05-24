import crypto from 'crypto';
import WebSocket from 'ws';

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
            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN"><voice name="${voice}"><prosody rate="-10%" pitch="-8%">${escapeXml(text)}</prosody></voice></speak>`;
            
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

async function testMode() {
  const buf = await generateEdgeTts("Xin chào đây là lão phu");
  console.log("Got Buffer size:", buf.length);
  require('fs').writeFileSync('out.mp3', buf);
}
testMode();
