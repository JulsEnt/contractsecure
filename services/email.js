require("dotenv").config();
const nodemailer = require("nodemailer");

function stripHtml(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBrandedTemplate({ subject, html }) {
  const frontendUrl = process.env.FRONTEND_URL || "https://contractsecure-6q6d.onrender.com";
  const brandName = process.env.MAIL_FROM_NAME || "ContractSecure";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#152033;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 45px rgba(15,23,42,.10);">
              <tr>
                <td style="background:linear-gradient(135deg,#071a33,#123e73);padding:30px 28px;color:#ffffff;">
                  <div style="font-size:24px;font-weight:800;letter-spacing:.3px;">${brandName}</div>
                  <div style="margin-top:7px;font-size:14px;opacity:.9;">Secure UK procurement application updates</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 28px;">
                  <div style="font-size:20px;font-weight:800;color:#0b1728;margin-bottom:18px;">${subject}</div>
                  <div style="font-size:15px;line-height:1.7;color:#334155;">
                    ${html}
                  </div>
                  <div style="margin-top:28px;">
                    <a href="${frontendUrl}" style="display:inline-block;background:#123e73;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;font-size:14px;">Open ContractSecure</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:20px 28px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.6;">
                  This is an automated notification from ${brandName}. Please keep your references and login details safe.
                  <br />© ${new Date().getFullYear()} ${brandName}. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set in environment variables.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) return null;

  const fromName = process.env.MAIL_FROM_NAME || "ContractSecure";
  const fromEmail = process.env.MAIL_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("MAIL_FROM_EMAIL must be set in environment variables.");
  }

  const transporter = getTransporter();
  const finalHtml = buildBrandedTemplate({ subject, html: html || "" });

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: finalHtml,
    text: text || stripHtml(html || subject)
  });
}

module.exports = { sendEmail, buildBrandedTemplate };
