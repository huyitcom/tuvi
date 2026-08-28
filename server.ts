import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

interface OrderPayload {
  groomName?: string;
  brideName?: string;
  connector?: string;
  weddingDate?: string;
  size?: string;
  materialId?: string;
  materialName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  notes?: string;
  designImageData?: string | null;
  timestamp?: string;
}

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// SMTP Configuration from Photobook Vietnam
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  user: process.env.SMTP_USER || 'photobookvietnam.net@gmail.com',
  pass: process.env.SMTP_PASS || 'pmgy mera pmts gfgp',
};

// Target Notification Emails
const TARGET_EMAILS = [
  process.env.ADMIN_EMAIL || 'huyitcom@gmail.com',
  'photobookvietnam.net@gmail.com',
];

// Generate Order Email HTML Template with Direct Print Download Link & Preview
function generateOrderEmailHtml(
  order: OrderPayload,
  hasImageAttachment: boolean,
  fileName?: string,
  downloadUrl?: string
): { subject: string; html: string; text: string } {
  const groom = order.groomName || 'Chú rể';
  const bride = order.brideName || 'Cô dâu';
  const weddingDate = order.weddingDate || 'Chưa rõ';
  const size = order.size || '60 x 90 cm (Khổ Đứng Chuẩn)';
  const material = order.materialName || 'Ảnh Cổng Ép Gỗ';
  const name = order.customerName || 'Chưa cung cấp';
  const phone = order.customerPhone || 'Chưa cung cấp';
  const email = order.customerEmail || 'Không có';
  const address = order.customerAddress || 'Tư vấn giao hàng tận nơi';
  const notes = order.notes || 'Không có';

  const now = new Date();
  const timeString = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const subject = `🔔 [ĐƠN ĐẶT IN ẢNH CỔNG CƯỚI] ${groom} & ${bride} - SĐT: ${phone}`;

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
      <h1>🔔 CÓ ĐƠN ĐẶT IN ẢNH CỔNG CƯỚI MỚI</h1>
      <p>Ghi nhận tự động từ ứng dụng Thiết Kế & Đặt In Ảnh Cổng Cưới Photobook Vietnam</p>
    </div>
    <div class="body">
      ${
        hasImageAttachment
          ? `
      <div class="section-title">🖼 BẢN THIẾT KẾ ĐÍNH KÈM (TỐI ƯU HÓA ĐỂ IN ẤN)</div>
      <div class="image-preview-container">
        <img src="cid:designImagePreview" alt="Bản thiết kế ảnh cổng cưới" />
        <div style="margin-top: 10px;">
          <span class="badge-optimized">✓ ĐÃ TỐI ƯU NÉN NHẸ & SẮC NÉT (JPG/WEBP)</span>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
          📎 <b>File đính kèm:</b> <code>${fileName || 'Anh_Cong_Cuoi_ThietKe.jpg'}</code>
        </p>
        ${
          downloadUrl
            ? `
        <div style="margin-top: 14px;">
          <a href="${downloadUrl}" class="btn-download" target="_blank">
            📥 BẤM ĐỂ TẢI FILE GỐC ĐỘ NÉT CAO
          </a>
        </div>
        `
            : ''
        }
      </div>
      `
          : ''
      }

      <div class="section-title">THÔNG TIN SẢN PHẨM IN</div>
      <table class="table">
        <tr>
          <td class="label">Dâu Rể:</td>
          <td class="value highlight">${groom} & ${bride}</td>
        </tr>
        <tr>
          <td class="label">Ngày cưới:</td>
          <td class="value">${weddingDate}</td>
        </tr>
        <tr>
          <td class="label">Kích thước in:</td>
          <td class="value">${size}</td>
        </tr>
        <tr>
          <td class="label">Chất liệu ép gỗ:</td>
          <td class="value highlight">${material}</td>
        </tr>
      </table>

      <div class="section-title">THÔNG TIN KHÁCH HÀNG & GIAO HÀNG</div>
      <table class="table">
        <tr>
          <td class="label">Họ tên khách:</td>
          <td class="value">${name}</td>
        </tr>
        <tr>
          <td class="label">Số điện thoại / Zalo:</td>
          <td class="value"><a href="tel:${phone}" style="color:#0284c7; text-decoration:none; font-size:16px;">${phone}</a></td>
        </tr>
        <tr>
          <td class="label">Email khách:</td>
          <td class="value">${email}</td>
        </tr>
        <tr>
          <td class="label">Địa chỉ giao:</td>
          <td class="value">${address}</td>
        </tr>
        <tr>
          <td class="label">Ghi chú:</td>
          <td class="value">${notes}</td>
        </tr>
        <tr>
          <td class="label">Thời gian đặt:</td>
          <td class="value" style="font-size:12px; color:#78716c;">${timeString}</td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="https://zalo.me/${phone.replace(/[^0-9]/g, '')}" class="btn-zalo" target="_blank">
          💬 Bấm Để Mở Chat Zalo Với Khách Hàng
        </a>
      </div>
    </div>
    <div class="footer">
      Email thông báo đơn hàng tự động từ Photobook Vietnam (Gửi tới: <b>${TARGET_EMAILS.join(', ')}</b>).<br>
      File ảnh thiết kế tối ưu JPG/WEBP đã được đính kèm và lưu trữ sẵn sàng để in.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
ĐƠN ĐẶT IN ẢNH CỔNG CƯỚI - PHOTOBOOK VIETNAM
==============================================
- Dâu Rể: ${groom} & ${bride}
- Ngày cưới: ${weddingDate}
- Kích thước: ${size}
- Chất liệu ép gỗ: ${material}
${hasImageAttachment ? `- File thiết kế: Đính kèm trong email (${fileName})` : ''}
${downloadUrl ? `- Link tải trực tiếp file gốc: ${downloadUrl}` : ''}

THÔNG TIN KHÁCH HÀNG
- Khách hàng: ${name}
- SĐT / Zalo: ${phone}
- Email: ${email}
- Địa chỉ giao hàng: ${address}
- Ghi chú: ${notes}
- Thời gian: ${timeString}
==============================================
Chat Zalo: https://zalo.me/${phone.replace(/[^0-9]/g, '')}
`.trim();

  return { subject, html, text };
}

// Send Real Order Email via Gmail SMTP with Attachment and Download Link
async function sendOrderEmail(
  order: OrderPayload,
  baseUrl?: string
): Promise<{
  success: boolean;
  targetEmail: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
}> {
  let imageBuffer: Buffer | null = null;
  const groomSlug = (order.groomName || 'Groom').replace(/\s+/g, '_');
  const brideSlug = (order.brideName || 'Bride').replace(/\s+/g, '_');
  
  // Determine file extension (jpg / webp / png)
  let ext = 'jpg';
  if (order.designImageData) {
    if (order.designImageData.includes('image/webp')) ext = 'webp';
    else if (order.designImageData.includes('image/jpeg') || order.designImageData.includes('image/jpg')) ext = 'jpg';
    else if (order.designImageData.includes('image/png')) ext = 'png';
  }

  let fileName = `Anh_Cong_${groomSlug}_${brideSlug}_${Date.now()}.${ext}`;
  let downloadUrl: string | undefined;

  // Process design base64 image if present
  if (order.designImageData && order.designImageData.startsWith('data:image')) {
    try {
      const base64Data = order.designImageData.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');

      // Save to server uploads folder
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`[Uploads] Saved design image to disk: ${filePath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

      if (baseUrl) {
        downloadUrl = `${baseUrl}/uploads/${fileName}`;
      }
    } catch (saveErr) {
      console.error('[Uploads Error] Could not save design image:', saveErr);
    }
  }

  const hasAttachment = Boolean(imageBuffer);
  const { subject, html, text } = generateOrderEmailHtml(order, hasAttachment, fileName, downloadUrl);
  const targetEmailStr = TARGET_EMAILS.join(', ');

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
    });

    const mailOptions: any = {
      from: `"Photobook Vietnam" <${SMTP_CONFIG.user}>`,
      to: TARGET_EMAILS,
      replyTo: order.customerEmail || undefined,
      subject: subject,
      text: text,
      html: html,
    };

    // Attach image to the email and embed it
    if (imageBuffer) {
      mailOptions.attachments = [
        {
          filename: fileName,
          content: imageBuffer,
          cid: 'designImagePreview', // used in <img src="cid:designImagePreview">
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[SMTP Gmail Success] Order email sent with optimized image file! MessageId:', info.messageId);
    return {
      success: true,
      targetEmail: targetEmailStr,
      fileName: hasAttachment ? fileName : undefined,
      downloadUrl,
    };
  } catch (err: any) {
    console.error('[SMTP Gmail Error]', err);
    return { success: false, targetEmail: targetEmailStr, error: err.message };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large Base64 image payload (up to 100MB for 300DPI 7087x10630 canvas)
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Static directory for uploaded master print files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Direct download route for print shop
  app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File không tồn tại hoặc đã hết hạn lưu trữ.');
    }
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      smtpUser: SMTP_CONFIG.user,
      targetEmails: TARGET_EMAILS,
      uploadsDir: UPLOADS_DIR,
    });
  });

  // API: Submit order & send actual email via Gmail SMTP
  app.post('/api/order/submit', async (req, res) => {
    const orderData: OrderPayload = req.body;
    console.log('=== [NHẬN ĐƠN ĐẶT IN MỚI 300 DPI] === Dâu rể:', orderData.groomName, orderData.brideName, 'SĐT:', orderData.customerPhone);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const emailResult = await sendOrderEmail(orderData, baseUrl);

    res.json({
      success: true,
      emailSent: emailResult.success,
      targetEmail: emailResult.targetEmail,
      fileName: emailResult.fileName,
      downloadUrl: emailResult.downloadUrl,
      error: emailResult.error,
      message: emailResult.success
        ? `Đã gửi email thông báo đơn hàng kèm file ảnh thiết kế 300 DPI thành công đến: ${emailResult.targetEmail}`
        : 'Đã lưu đơn hàng vào hệ thống.',
      order: {
        groomName: orderData.groomName,
        brideName: orderData.brideName,
        customerPhone: orderData.customerPhone,
      },
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
