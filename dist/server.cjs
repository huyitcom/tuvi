"use strict";
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
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var UPLOADS_DIR = import_path.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(UPLOADS_DIR)) {
  import_fs.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
var SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: true,
  user: process.env.SMTP_USER || "photobookvietnam.net@gmail.com",
  pass: process.env.SMTP_PASS || "pmgy mera pmts gfgp"
};
var TARGET_EMAILS = [
  process.env.ADMIN_EMAIL || "huyitcom@gmail.com",
  "photobookvietnam.net@gmail.com"
];
function generateOrderEmailHtml(order, hasImageAttachment, fileName, downloadUrl) {
  const groom = order.groomName || "Ch\xFA r\u1EC3";
  const bride = order.brideName || "C\xF4 d\xE2u";
  const weddingDate = order.weddingDate || "Ch\u01B0a r\xF5";
  const size = order.size || "60 x 90 cm (Kh\u1ED5 \u0110\u1EE9ng Chu\u1EA9n)";
  const material = order.materialName || "\u1EA2nh C\u1ED5ng \xC9p G\u1ED7";
  const name = order.customerName || "Ch\u01B0a cung c\u1EA5p";
  const phone = order.customerPhone || "Ch\u01B0a cung c\u1EA5p";
  const email = order.customerEmail || "Kh\xF4ng c\xF3";
  const address = order.customerAddress || "T\u01B0 v\u1EA5n giao h\xE0ng t\u1EADn n\u01A1i";
  const notes = order.notes || "Kh\xF4ng c\xF3";
  const now = /* @__PURE__ */ new Date();
  const timeString = now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const subject = `\u{1F514} [\u0110\u01A0N \u0110\u1EB6T IN \u1EA2NH C\u1ED4NG C\u01AF\u1EDAI] ${groom} & ${bride} - S\u0110T: ${phone}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c1917; background-color: #f5f5f4; margin: 0; padding: 20px; }
    .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e7e5e4; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0284c7, #0ea5e9); padding: 24px 28px; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 0; font-size: 13px; color: #e0f2fe; }
    .body { padding: 24px 28px; }
    .section-title { font-size: 13px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px 0; border-bottom: 2px solid #e0f2fe; padding-bottom: 4px; }
    .section-title:first-child { margin-top: 0; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 14px; }
    .table td { padding: 8px 0; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
    .table td.label { width: 150px; color: #78716c; font-weight: 500; }
    .table td.value { color: #1c1917; font-weight: 600; }
    .highlight { color: #0284c7; font-weight: 700; }
    .image-preview-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center; }
    .image-preview-container img { max-width: 100%; max-height: 440px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #cbd5e1; }
    .btn-container { margin: 22px 0 10px 0; text-align: center; }
    .btn-download { display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-size: 14px; font-weight: 700; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(2,132,199,0.3); }
    .btn-zalo { display: inline-block; background: #0068ff; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-size: 13px; font-weight: 600; }
    .badge-optimized { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-top: 6px; }
    .footer { background: #fafaf9; padding: 16px 28px; font-size: 12px; color: #a8a29e; text-align: center; border-top: 1px solid #f5f5f4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>\u{1F514} C\xD3 \u0110\u01A0N \u0110\u1EB6T IN \u1EA2NH C\u1ED4NG C\u01AF\u1EDAI M\u1EDAI</h1>
      <p>Ghi nh\u1EADn t\u1EF1 \u0111\u1ED9ng t\u1EEB \u1EE9ng d\u1EE5ng Thi\u1EBFt K\u1EBF & \u0110\u1EB7t In \u1EA2nh C\u1ED5ng C\u01B0\u1EDBi Photobook Vietnam</p>
    </div>
    <div class="body">
      ${hasImageAttachment ? `
      <div class="section-title">\u{1F5BC} B\u1EA2N THI\u1EBET K\u1EBE \u0110\xCDNH K\xC8M (T\u1ED0I \u01AFU H\xD3A \u0110\u1EC2 IN \u1EA4N)</div>
      <div class="image-preview-container">
        <img src="cid:designImagePreview" alt="B\u1EA3n thi\u1EBFt k\u1EBF \u1EA3nh c\u1ED5ng c\u01B0\u1EDBi" />
        <div style="margin-top: 10px;">
          <span class="badge-optimized">\u2713 \u0110\xC3 T\u1ED0I \u01AFU N\xC9N NH\u1EB8 & S\u1EAEC N\xC9T (JPG/WEBP)</span>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
          \u{1F4CE} <b>File \u0111\xEDnh k\xE8m:</b> <code>${fileName || "Anh_Cong_Cuoi_ThietKe.jpg"}</code>
        </p>
        ${downloadUrl ? `
        <div style="margin-top: 14px;">
          <a href="${downloadUrl}" class="btn-download" target="_blank">
            \u{1F4E5} B\u1EA4M \u0110\u1EC2 T\u1EA2I FILE G\u1ED0C \u0110\u1ED8 N\xC9T CAO
          </a>
        </div>
        ` : ""}
      </div>
      ` : ""}

      <div class="section-title">TH\xD4NG TIN S\u1EA2N PH\u1EA8M IN</div>
      <table class="table">
        <tr>
          <td class="label">D\xE2u R\u1EC3:</td>
          <td class="value highlight">${groom} & ${bride}</td>
        </tr>
        <tr>
          <td class="label">Ng\xE0y c\u01B0\u1EDBi:</td>
          <td class="value">${weddingDate}</td>
        </tr>
        <tr>
          <td class="label">K\xEDch th\u01B0\u1EDBc in:</td>
          <td class="value">${size}</td>
        </tr>
        <tr>
          <td class="label">Ch\u1EA5t li\u1EC7u \xE9p g\u1ED7:</td>
          <td class="value highlight">${material}</td>
        </tr>
      </table>

      <div class="section-title">TH\xD4NG TIN KH\xC1CH H\xC0NG & GIAO H\xC0NG</div>
      <table class="table">
        <tr>
          <td class="label">H\u1ECD t\xEAn kh\xE1ch:</td>
          <td class="value">${name}</td>
        </tr>
        <tr>
          <td class="label">S\u1ED1 \u0111i\u1EC7n tho\u1EA1i / Zalo:</td>
          <td class="value"><a href="tel:${phone}" style="color:#0284c7; text-decoration:none; font-size:16px;">${phone}</a></td>
        </tr>
        <tr>
          <td class="label">Email kh\xE1ch:</td>
          <td class="value">${email}</td>
        </tr>
        <tr>
          <td class="label">\u0110\u1ECBa ch\u1EC9 giao:</td>
          <td class="value">${address}</td>
        </tr>
        <tr>
          <td class="label">Ghi ch\xFA:</td>
          <td class="value">${notes}</td>
        </tr>
        <tr>
          <td class="label">Th\u1EDDi gian \u0111\u1EB7t:</td>
          <td class="value" style="font-size:12px; color:#78716c;">${timeString}</td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="https://zalo.me/${phone.replace(/[^0-9]/g, "")}" class="btn-zalo" target="_blank">
          \u{1F4AC} B\u1EA5m \u0110\u1EC3 M\u1EDF Chat Zalo V\u1EDBi Kh\xE1ch H\xE0ng
        </a>
      </div>
    </div>
    <div class="footer">
      Email th\xF4ng b\xE1o \u0111\u01A1n h\xE0ng t\u1EF1 \u0111\u1ED9ng t\u1EEB Photobook Vietnam (G\u1EEDi t\u1EDBi: <b>${TARGET_EMAILS.join(", ")}</b>).<br>
      File \u1EA3nh thi\u1EBFt k\u1EBF t\u1ED1i \u01B0u JPG/WEBP \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\xEDnh k\xE8m v\xE0 l\u01B0u tr\u1EEF s\u1EB5n s\xE0ng \u0111\u1EC3 in.
    </div>
  </div>
</body>
</html>
  `.trim();
  const text = `
\u0110\u01A0N \u0110\u1EB6T IN \u1EA2NH C\u1ED4NG C\u01AF\u1EDAI - PHOTOBOOK VIETNAM
==============================================
- D\xE2u R\u1EC3: ${groom} & ${bride}
- Ng\xE0y c\u01B0\u1EDBi: ${weddingDate}
- K\xEDch th\u01B0\u1EDBc: ${size}
- Ch\u1EA5t li\u1EC7u \xE9p g\u1ED7: ${material}
${hasImageAttachment ? `- File thi\u1EBFt k\u1EBF: \u0110\xEDnh k\xE8m trong email (${fileName})` : ""}
${downloadUrl ? `- Link t\u1EA3i tr\u1EF1c ti\u1EBFp file g\u1ED1c: ${downloadUrl}` : ""}

TH\xD4NG TIN KH\xC1CH H\xC0NG
- Kh\xE1ch h\xE0ng: ${name}
- S\u0110T / Zalo: ${phone}
- Email: ${email}
- \u0110\u1ECBa ch\u1EC9 giao h\xE0ng: ${address}
- Ghi ch\xFA: ${notes}
- Th\u1EDDi gian: ${timeString}
==============================================
Chat Zalo: https://zalo.me/${phone.replace(/[^0-9]/g, "")}
`.trim();
  return { subject, html, text };
}
async function sendOrderEmail(order, baseUrl) {
  let imageBuffer = null;
  const groomSlug = (order.groomName || "Groom").replace(/\s+/g, "_");
  const brideSlug = (order.brideName || "Bride").replace(/\s+/g, "_");
  let ext = "jpg";
  if (order.designImageData) {
    if (order.designImageData.includes("image/webp")) ext = "webp";
    else if (order.designImageData.includes("image/jpeg") || order.designImageData.includes("image/jpg")) ext = "jpg";
    else if (order.designImageData.includes("image/png")) ext = "png";
  }
  let fileName = `Anh_Cong_${groomSlug}_${brideSlug}_${Date.now()}.${ext}`;
  let downloadUrl;
  if (order.designImageData && order.designImageData.startsWith("data:image")) {
    try {
      const base64Data = order.designImageData.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, "base64");
      const filePath = import_path.default.join(UPLOADS_DIR, fileName);
      import_fs.default.writeFileSync(filePath, imageBuffer);
      console.log(`[Uploads] Saved design image to disk: ${filePath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
      if (baseUrl) {
        downloadUrl = `${baseUrl}/uploads/${fileName}`;
      }
    } catch (saveErr) {
      console.error("[Uploads Error] Could not save design image:", saveErr);
    }
  }
  const hasAttachment = Boolean(imageBuffer);
  const { subject, html, text } = generateOrderEmailHtml(order, hasAttachment, fileName, downloadUrl);
  const targetEmailStr = TARGET_EMAILS.join(", ");
  try {
    const transporter = import_nodemailer.default.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass
      }
    });
    const mailOptions = {
      from: `"Photobook Vietnam" <${SMTP_CONFIG.user}>`,
      to: TARGET_EMAILS,
      replyTo: order.customerEmail || void 0,
      subject,
      text,
      html
    };
    if (imageBuffer) {
      mailOptions.attachments = [
        {
          filename: fileName,
          content: imageBuffer,
          cid: "designImagePreview"
          // used in <img src="cid:designImagePreview">
        }
      ];
    }
    const info = await transporter.sendMail(mailOptions);
    console.log("[SMTP Gmail Success] Order email sent with optimized image file! MessageId:", info.messageId);
    return {
      success: true,
      targetEmail: targetEmailStr,
      fileName: hasAttachment ? fileName : void 0,
      downloadUrl
    };
  } catch (err) {
    console.error("[SMTP Gmail Error]", err);
    return { success: false, targetEmail: targetEmailStr, error: err.message };
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "100mb" }));
  app.use(import_express.default.urlencoded({ limit: "100mb", extended: true }));
  app.use("/uploads", import_express.default.static(UPLOADS_DIR));
  app.get("/download/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = import_path.default.join(UPLOADS_DIR, filename);
    if (import_fs.default.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send("File kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n l\u01B0u tr\u1EEF.");
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      smtpUser: SMTP_CONFIG.user,
      targetEmails: TARGET_EMAILS,
      uploadsDir: UPLOADS_DIR
    });
  });
  app.post("/api/order/submit", async (req, res) => {
    const orderData = req.body;
    console.log("=== [NH\u1EACN \u0110\u01A0N \u0110\u1EB6T IN M\u1EDAI 300 DPI] === D\xE2u r\u1EC3:", orderData.groomName, orderData.brideName, "S\u0110T:", orderData.customerPhone);
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const baseUrl = `${protocol}://${host}`;
    const emailResult = await sendOrderEmail(orderData, baseUrl);
    res.json({
      success: true,
      emailSent: emailResult.success,
      targetEmail: emailResult.targetEmail,
      fileName: emailResult.fileName,
      downloadUrl: emailResult.downloadUrl,
      error: emailResult.error,
      message: emailResult.success ? `\u0110\xE3 g\u1EEDi email th\xF4ng b\xE1o \u0111\u01A1n h\xE0ng k\xE8m file \u1EA3nh thi\u1EBFt k\u1EBF 300 DPI th\xE0nh c\xF4ng \u0111\u1EBFn: ${emailResult.targetEmail}` : "\u0110\xE3 l\u01B0u \u0111\u01A1n h\xE0ng v\xE0o h\u1EC7 th\u1ED1ng.",
      order: {
        groomName: orderData.groomName,
        brideName: orderData.brideName,
        customerPhone: orderData.customerPhone
      }
    });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
