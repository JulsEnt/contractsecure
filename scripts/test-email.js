require("dotenv").config();
const { sendEmail } = require("../services/email");

const to = process.argv[2];

if (!to) {
  console.error("Usage: node scripts/test-email.js your-email@example.com");
  process.exit(1);
}

sendEmail({
  to,
  subject: "ContractSecure Email Test",
  html: `
    <p>Hello,</p>
    <p>This is a test email from <strong>ContractSecure</strong>.</p>
    <p>If you received this, SMTP email sending is working correctly.</p>
  `
})
  .then((info) => {
    console.log("Email sent successfully:", info.messageId || info.response || info);
  })
  .catch((error) => {
    console.error("Email failed:", error.message);
    process.exit(1);
  });
