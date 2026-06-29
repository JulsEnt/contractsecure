const express = require("express");
const db = require("../database/database");

const router = express.Router();

router.get("/dashboard", (req, res) => {
    const email = req.session.applicantEmail;

    if (!email) {
        return res.redirect("/applicant-login");
    }

    const application = db.prepare(`
        SELECT *
        FROM applications
        WHERE email = ?
        ORDER BY id DESC
        LIMIT 1
    `).get(email);

    if (!application) {
        return res.send("No application found.");
    }

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Applicant Dashboard | ContractSecure</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #07111f;
      color: #ffffff;
    }

    .dashboard {
      min-height: 100vh;
      padding: 28px;
      background:
        radial-gradient(circle at top left, rgba(47, 201, 178, 0.18), transparent 35%),
        linear-gradient(135deg, #07111f, #0b1b32);
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }

    .brand {
      font-size: 22px;
      font-weight: 800;
      color: #2fc9b2;
    }

    .logout {
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.08);
      color: #fff;
      padding: 10px 16px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
    }

    .hero {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 24px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.28);
    }

    .hero h1 {
      margin: 0 0 10px;
      font-size: 34px;
    }

    .hero p {
      margin: 0;
      color: #b9c7d9;
      font-size: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-bottom: 24px;
    }

    .card {
      background: rgba(11, 31, 55, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 22px;
      padding: 22px;
      box-shadow: 0 15px 45px rgba(0,0,0,0.25);
    }

    .card h3 {
      margin: 0 0 14px;
      color: #9fb3ca;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .value {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.25;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      font-weight: 800;
      background: rgba(47, 201, 178, 0.18);
      color: #73f7dc;
      border: 1px solid rgba(47, 201, 178, 0.35);
    }

    .copy-row {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }

    .copy-btn {
      border: 0;
      background: #2fc9b2;
      color: #06111f;
      padding: 10px 14px;
      border-radius: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    .wide-grid {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 18px;
    }

    .timeline {
      display: grid;
      gap: 14px;
      margin-top: 8px;
    }

    .step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      color: #c7d3e3;
    }

    .dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #2fc9b2;
      flex: 0 0 22px;
      box-shadow: 0 0 0 6px rgba(47,201,178,0.12);
    }

    .dot.pending {
      background: #41556f;
      box-shadow: none;
    }

    .info-list {
      display: grid;
      gap: 12px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 10px;
      color: #b9c7d9;
    }

    .info-item strong {
      color: #fff;
      text-align: right;
    }

    .notice {
      margin-top: 18px;
      padding: 16px;
      border-radius: 16px;
      background: rgba(47,201,178,0.12);
      border: 1px solid rgba(47,201,178,0.25);
      color: #d8fff7;
    }

    @media (max-width: 900px) {
      .dashboard {
        padding: 18px;
      }

      .grid,
      .wide-grid {
        grid-template-columns: 1fr;
      }

      .hero h1 {
        font-size: 28px;
      }

      .copy-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  </style>
</head>

<body>
  <main class="dashboard">
    <div class="topbar">
      <div class="brand">ContractSecure</div>
      <a class="logout" href="/applicant-logout">Logout</a>
    </div>

    <section class="hero">
      <h1>Welcome back, ${application.fullName || "Applicant"}</h1>
      <p>${
          application.procurementStatus === "Pending Review"
          ? `${application.contract} is currently being reviewed by ContractSecure.`
          : application.procurementStatus === "Technical Review"
          ? `${application.contract} is currently undergoing technical review.`
          : application.procurementStatus === "Financial Review"
          ? `${application.contract} is currently undergoing financial review.`
          : application.procurementStatus === "Approved"
          ? `Congratulations! Your application has been approved.`
          : application.procurementStatus === "In Progress"
          ? `Your procurement has begun. Track updates below.`
          : application.procurementStatus === "Awarded"
          ? `Congratulations! Your contract has been awarded.`
          : application.procurementStatus === "Completed"
          ? `Your procurement has been completed successfully.`
          : application.procurementStatus === "Rejected"
          ? `Your application was not approved. Please contact support for further information.`
          : `Your application is currently being processed.`
          }</p>
    </section>

    <section class="grid">
      <div class="card">
        <h3>Procurement Status</h3>
        <div class="badge">${application.procurementStatus || "Pending Review"}</div>
      </div>

      <div class="card">
        <h3>Payment Status</h3>
        <div class="badge">${application.paymentStatus || "Awaiting Payment"}</div>
      </div>

      <div class="card">
        <h3>Procurement Reference</h3>
        <div class="copy-row">
          <div class="value" id="procurementRef">${application.procurementReference || "Pending"}</div>
          <button class="copy-btn" onclick="copyReference()">Copy</button>
        </div>
      </div>
    </section>

    <section class="wide-grid">
      <div class="card">
        <h3>Application Progress</h3>

        <div class="timeline">
          <div class="step">
            <span class="dot"></span>
            <div>
              <strong>Application Submitted</strong><br>
              <span>Your procurement application has been received.</span>
            </div>
          </div>

          <div class="step">
            <span class="dot"></span>
            <div>
              <strong>Payment Confirmed</strong><br>
              <span>Your payment has been reviewed by finance.</span>
            </div>
          </div>

          <div class="step">
            <span class="dot"></span>
            <div>
              <strong>Procurement Review</strong><br>
              <span>Your file is under procurement evaluation.</span>
            </div>
          </div>

          <div class="step">
            <span class="dot pending"></span>
            <div>
              <strong>Award Decision</strong><br>
              <span>The final decision will appear here once available.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Contract Summary</h3>

        <div class="info-list">
          <div class="info-item">
            <span>Applicant</span>
            <strong>${application.fullName || "N/A"}</strong>
          </div>

          <div class="info-item">
            <span>Company</span>
            <strong>${application.companyName || "N/A"}</strong>
          </div>

          <div class="info-item">
            <span>Contract</span>
            <strong>${application.contract || "N/A"}</strong>
          </div>

          <div class="info-item">
            <span>Submitted</span>
            <strong>${application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "N/A"}</strong>
          </div>

          <div class="info-item">
            <span>Estimated Review</span>
            <strong>5-10 working days</strong>
          </div>
        </div>

        <div class="notice">
          Keep your procurement reference safe. You may need it when contacting ContractSecure support.
        </div>
      </div>
    </section>
  </main>

  <script>
    function copyReference() {
      const value = document.getElementById("procurementRef").textContent;
      navigator.clipboard.writeText(value);
      alert("Procurement reference copied.");
    }
  </script>
</body>
</html>
`);
});

module.exports = router;