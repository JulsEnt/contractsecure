require("dotenv").config();

async function sendEmail({ to, subject, html }) {
  if (!to) return;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: process.env.MAIL_FROM_NAME || "ContractSecure",
        email: process.env.MAIL_FROM_EMAIL
      },
      to: [
        {
          email: to
        }
      ],
      subject,
      htmlContent: html
    })
  });

  const result = await response.text();

  if (!response.ok) {
    throw new Error(result);
  }

  return result;
}

module.exports = { sendEmail };