const express = require("express");
const db = require("../database/database");
const requireLogin = require("../middleware/auth");
const { sendEmail } = require("../services/email");

const router = express.Router();


function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderContractForm({ mode, contract = {}, action }) {
  const isEdit = mode === "edit";

  return `
<!DOCTYPE html>
<html>
<head>
<title>${isEdit ? "Edit Contract" : "New Contract"}</title>
<style>
body{font-family:Arial;background:#07111f;color:white;padding:40px}
.card{max-width:900px;margin:auto;background:#0b1b32;padding:30px;border-radius:18px}
h1{color:#2fc9b2;margin-bottom:25px}
label{display:block;margin-top:18px;margin-bottom:8px;font-weight:bold}
input,textarea,select{width:100%;padding:14px;border-radius:10px;border:1px solid #223b56;background:#102033;color:white}
textarea{min-height:140px;resize:vertical}
button{margin-top:28px;padding:14px 24px;border:none;border-radius:10px;background:#2fc9b2;font-weight:bold;cursor:pointer;color:#06111f}
a{color:#7dd3fc;text-decoration:none}.hint{color:#94a3b8;margin-bottom:20px}.row{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:700px){.row{grid-template-columns:1fr}body{padding:18px}}
</style>
</head>
<body>
<div class="card">
<h1>${isEdit ? "Edit Contract" : "Create New Contract"}</h1>
<p class="hint">${isEdit ? "Update the contract details below." : "Add a new public contract opportunity."}</p>
<form method="POST" action="${action}">
<label>Contract Title</label>
<input name="title" value="${escapeHtml(contract.title || "")}" required>
<div class="row">
  <div>
    <label>Category</label>
    <input name="category" value="${escapeHtml(contract.category || "")}" required>
  </div>
  <div>
    <label>Location</label>
    <input name="location" value="${escapeHtml(contract.location || "")}" required>
  </div>
</div>
<div class="row">
  <div>
    <label>Contract Value</label>
    <input name="contractValue" value="${escapeHtml(contract.contractValue || "")}" placeholder="Example: 18 or 18M" required>
  </div>
  <div>
    <label>Agency Fee</label>
    <input name="agencyFee" value="${escapeHtml(contract.agencyFee || "")}" placeholder="Example: 50000" required>
  </div>
</div>
<label>Description</label>
<textarea name="description">${escapeHtml(contract.description || "")}</textarea>
<label>Status</label>
<select name="status">
  <option value="Open" ${(contract.status || "Open") === "Open" ? "selected" : ""}>Open</option>
  <option value="Closed" ${(contract.status || "Open") === "Closed" ? "selected" : ""}>Closed</option>
</select>
<button type="submit">${isEdit ? "Update Contract" : "Create Contract"}</button>
</form>
<br><br>
<a href="/admin/contracts">← Back to Contracts</a>
</div>
</body>
</html>`;
}

router.get("/admin/payments", requireLogin, (req, res) => {

    const payments = db.prepare(`
        SELECT *
        FROM payments
        ORDER BY id DESC
    `).all();

    const rows = payments.map(payment => `
        <tr>
            <td>${payment.reference}</td>
            <td>${payment.contract || "N/A"}</td>
            <td>${payment.amount}</td>
            <td>${payment.network || payment.method || "N/A"}</td>
            <td>${payment.status}</td>
            <td>
                <a href="/admin/payment/${payment.id}">
                    View
                </a>
            </td>
        </tr>
    `).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Payment Verification</title>

<style>

body{
font-family:Arial;
background:#081a2d;
color:white;
padding:40px;
}

table{
width:100%;
border-collapse:collapse;
}

td,th{
padding:14px;
border-bottom:1px solid #2b3b54;
}

a{
color:#37d5b5;
text-decoration:none;
font-weight:bold;
}

</style>

</head>

<body>

<h1>Payment Verification</h1>

<table>

<tr>

<th>Reference</th>
<th>Contract</th>
<th>Amount</th>
<th>Network</th>
<th>Status</th>
<th>Action</th>

</tr>

${rows}

</table>

</body>

</html>
`);

});

router.get("/admin/payment/:id", requireLogin, (req, res) => {
  const payment = db.prepare(`
    SELECT *
    FROM payments
    WHERE id = ?
  `).get(req.params.id);

  if (!payment) {
    return res.send("Payment not found.");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Payment Detail</title>
<style>
body{font-family:Arial;background:#081a2d;color:#fff;padding:40px}
.card{max-width:800px;margin:auto;background:#0b1b32;padding:30px;border-radius:18px}
.row{margin:16px 0}
strong{color:#37d5b5}
a,button{display:inline-block;margin:10px 8px 0 0;padding:12px 18px;border-radius:10px;border:0;font-weight:bold;text-decoration:none;cursor:pointer}
.back{background:#7dd3fc;color:#06111f}
.approve{background:#73f7dc;color:#06111f}
.reject{background:#ff6b6b;color:#fff}
</style>
</head>
<body>
<div class="card">
<h1>Payment Detail</h1>

<div class="row"><strong>Reference:</strong> ${payment.reference}</div>
<div class="row"><strong>Contract:</strong> ${payment.contract || "N/A"}</div>
<div class="row"><strong>Email:</strong> ${payment.email || "N/A"}</div>
<div class="row"><strong>Method:</strong> ${payment.method || "N/A"}</div>
<div class="row"><strong>Wallet:</strong> ${payment.walletAddress || "N/A"}</div>
<div class="row"><strong>Transaction Hash:</strong> ${payment.txHash || "N/A"}</div>
<div class="row"><strong>Amount:</strong> ${payment.amount || "N/A"}</div>
<div class="row"><strong>Status:</strong> ${payment.status || "Pending Review"}</div>

${
  payment.status === "Approved"
    ? `<div class="row"><strong>Status:</strong> Payment Verified</div>`
    : payment.status === "Rejected"
    ? `<div class="row"><strong>Status:</strong> Payment Rejected</div>`
    : `
      <form method="POST" action="/admin/payment/${payment.id}/approve">
        <button class="approve" type="submit">Verify Payment</button>
      </form>

      <form method="POST" action="/admin/payment/${payment.id}/reject">
        <button class="reject" type="submit">Reject Payment</button>
      </form>
    `
}

<a class="back" href="/admin/payments">Back to Payments</a>
</div>
</body>
</html>
`);
});

router.get("/admin", requireLogin, (req, res) => {
     const applications = db.prepare(`
    SELECT * FROM applications
    ORDER BY id DESC
  `).all();

  const payments = db.prepare(`
  SELECT * FROM payments
  ORDER BY id DESC
  `).all();

  const parsedApplications = applications.map((app) => ({
    ...app,
    documents: JSON.parse(app.documents || "[]")
  }));

  const totalApplications = parsedApplications.length;

const pendingReview = parsedApplications.filter(
  app => (app.procurementStatus || "Pending Review") === "Pending Review"
).length;

const awaitingPayment = parsedApplications.filter(
  app => (app.paymentStatus || "Awaiting Payment") === "Awaiting Payment"
).length;

const paymentConfirmed = parsedApplications.filter(
  app => app.paymentStatus === "Approved"
).length;

const contractsAwarded = parsedApplications.filter(
  app => app.procurementStatus === "Awarded"
).length;

  const totalPayments = payments.length;
  const pendingPayments = payments.filter((pay) => pay.status === "Pending Review").length;
  const approvedPayments = payments.filter((pay) => pay.status === "Approved").length;

  const rows = parsedApplications.map((app) => {
    const documents = app.documents || [];

    return `
      <tr>
        <td><strong>${app.reference}</strong></td>
        <td>
          <strong>${app.companyName || "N/A"}</strong>
          <span>${app.fullName || "No contact name"}</span>
        </td>
        <td>${app.email || "N/A"}</td>
        <td>${app.phone || "N/A"}</td>
        <td>${app.category || "N/A"}</td>
        <td>${app.contract || "N/A"}</td>
        <td>
          <span class="status ${String(app.procurementStatus || "Pending Review").toLowerCase().replace(/\s+/g, "-")}">
            ${app.procurementStatus || "Pending Review"}
          </span>
        </td>
        <td>${new Date(app.createdAt).toLocaleString()}</td>
        <td>
          ${
            documents.length
              ? documents.map((doc) => `<a class="doc-link" href="${doc.path}" target="_blank">${doc.originalName}</a>`).join("")
              : `<span class="muted">No files</span>`
          }
        </td>
        <td>
        ${
          ["approved", "in progress", "awarded"].includes(
            String(app.procurementStatus || "").toLowerCase()
          )
            ? `<span class="status approved">Action Completed</span>`
            : String(app.procurementStatus || "").toLowerCase() === "rejected"
            ? `<span class="status rejected">Rejected</span>`
            : `
              <form method="POST" action="/admin/application/${app.id}/approve">
                <button class="approve-btn" type="submit">Approve</button>
              </form>

              <form method="POST" action="/admin/application/${app.id}/reject">
                <button class="reject-btn" type="submit">Reject</button>
              </form>
            `
        }
      </td>
      </tr>
    `;
  }).join("");

  const paymentRows = payments.map((pay) => `
  <tr>
    <td><strong>${pay.reference}</strong></td>
    <td>${pay.contract || "N/A"}</td>
    <td>${pay.email || "N/A"}</td>
    <td>${pay.method || "N/A"}</td>
    <td>${pay.amount || "N/A"}</td>
    <td><span class="tx-hash">${pay.txHash || "N/A"}</span></td>
    <td><span class="status pending">${pay.status || "Pending Review"}</span></td>
    <td>${new Date(pay.createdAt).toLocaleString()}</td>
    <td>
      ${
        (pay.status || "").trim() === "Pending Review"
          ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <form method="POST" action="/admin/payment/${pay.id}/approve">
                <button class="approve-btn" type="submit">Approve</button>
              </form>

              <form method="POST" action="/admin/payment/${pay.id}/reject">
                <button class="reject-btn" type="submit">Reject</button>
              </form>
            </div>
          `
          : "-"
      }
    </td>
  </tr>
`).join("");


  res.send(`
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width,initial-scale=1">

<title>ContractSecure Admin Dashboard</title>

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:Segoe UI,Arial,sans-serif;
}

body{
background:#07111f;
color:#f8fafc;
padding:30px;
}

.approve-btn{
    background:#18b566;
    color:#fff;
    border:none;
    padding:8px 14px;
    border-radius:8px;
    cursor:pointer;
    font-weight:600;
}

.reject-btn{
    background:#d63a3a;
    color:#fff;
    border:none;
    padding:8px 14px;
    border-radius:8px;
    cursor:pointer;
    font-weight:600;
}

.approve-btn:hover{
    opacity:.9;
}

.reject-btn:hover{
    opacity:.9;
}

.topbar{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:30px;
gap:20px;
}

.topbar h1{
font-size:34px;
}

.topbar p{
margin-top:8px;
color:#94a3b8;
}

.logout{
background:#ef4444;
padding:12px 18px;
border-radius:10px;
text-decoration:none;
color:white;
font-weight:700;
}

.stats{
display:grid;
grid-template-columns:repeat(5,1fr);
gap:18px;
margin-bottom:32px;
}

.admin-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-actions form {
  margin: 0;
}

.view-btn,
.approve-btn,
.reject-btn {
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  color: #06111f;
}

.view-btn {
  background: #7dd3fc;
}

.approve-btn {
  background: #73f7dc;
}

.reject-btn {
  background: #ff6b6b;
  color: #fff;
}

.card{
background:#0b1728;
border:1px solid rgba(255,255,255,.08);
border-radius:18px;
padding:22px;
}

.card span{
display:block;
font-size:13px;
color:#94a3b8;
}

.card strong{
display:block;
margin-top:8px;
font-size:30px;
color:#34d399;
}

.panel{
background:#0b1728;
border-radius:20px;
overflow:hidden;
border:1px solid rgba(255,255,255,.08);
}

.panel-header{
padding:22px;
border-bottom:1px solid rgba(255,255,255,.08);
display:flex;
justify-content:space-between;
align-items:center;
}

.panel-header p{
color:#94a3b8;
margin-top:6px;
}

table{
width:100%;
border-collapse:collapse;
}

th{
background:#102033;
padding:15px;
font-size:12px;
letter-spacing:.08em;
text-transform:uppercase;
color:#34d399;
text-align:left;
}

td{
padding:15px;
border-bottom:1px solid rgba(255,255,255,.06);
vertical-align:top;
font-size:14px;
}

td span{
display:block;
margin-top:4px;
font-size:12px;
color:#94a3b8;
}

.status{
display:inline-block;
padding:6px 12px;
border-radius:999px;
font-size:12px;
font-weight:700;
}

.pending{
background:rgba(252,211,77,.12);
color:#fcd34d;
}

.doc-link{
display:block;
color:#38bdf8;
text-decoration:none;
margin-bottom:6px;
}

.muted{
color:#94a3b8;
}

@media(max-width:1200px){

.stats{
grid-template-columns:repeat(2,1fr);
}

.panel{
overflow-x:auto;
}

table{
min-width:1100px;
}

}

@media(max-width:700px){

body{
padding:18px;
}

.topbar{
flex-direction:column;
align-items:flex-start;
}

.stats{
grid-template-columns:1fr;
}

}

</style>

</head>

<body>

<div class="topbar">

<div>

<h1>ContractSecure Admin Dashboard</h1>

<p>Monitor applications, uploaded documents and procurement activity.</p>

</div>

<a href="/logout" class="logout">
Logout
</a>

</div>

<div class="stats">

<div class="card">
<span>Total Applications</span>
<strong>${totalApplications}</strong>
</div>

<div class="card">
<span>Pending Review</span>
<strong>${pendingReview}</strong>
</div>

<div class="card">
<span>Awaiting Payment</span>
<strong>${awaitingPayment}</strong>
</div>

<div class="card">
<span>Payment Confirmed</span>
<strong>${paymentConfirmed}</strong>
</div>

<div class="card">
<span>Contracts Awarded</span>
<strong>${contractsAwarded}</strong>
</div>

</div>

<div class="panel">

<div class="panel-header">

<div>

<h2>Applications</h2>

<p>Newest applications appear first.</p>

</div>

</div>

<table>

<thead>

<tr>

<th>Reference</th>

<th>Applicant</th>

<th>Email</th>

<th>Phone</th>

<th>Category</th>

<th>Contract</th>

<th>Status</th>

<th>Date</th>

<th>Documents</th>

<th>Actions</th>

</tr>

</thead>

<tbody>

${rows || `
<tr>
<td colspan="9" class="muted">
No applications found.
</td>
</tr>
`}

</tbody>

</table>

</div>

<div class="panel" style="margin-top:30px;">
  <div class="panel-header">
    <div>
      <h2>Crypto Payments</h2>
      <p>Submitted BTC and USDT payments awaiting finance review.</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Reference</th>
        <th>Contract</th>
        <th>Email</th>
        <th>Method</th>
        <th>Amount</th>
        <th>Transaction Hash</th>
        <th>Status</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>
      ${
        paymentRows ||
        `<tr>
          <td colspan="8" class="muted">No crypto payments found.</td>
        </tr>`
      }
    </tbody>
  </table>
</div>

</body>

</html>

`);

});

router.post("/admin/payment/:id/approve", requireLogin, async (req, res) => {
  const paymentId = req.params.id;
  const payment = db.prepare(`
    SELECT * FROM payments
    WHERE id = ?
    `).get(paymentId);
  const procurementRef =
  "CS-" + Math.floor(1000000000 + Math.random() * 9000000000);

  db.prepare(`
    UPDATE payments
    SET status = ?
    WHERE id = ?
  `).run("Approved", paymentId);

  db.prepare(`
    UPDATE applications
    SET
        paymentStatus = 'Payment Confirmed',
        procurementStatus = 'In Progress',
        procurementReference = ?
    WHERE email = ?
    AND contract = ?
    `).run(procurementRef, payment.email, payment.contract);

  try {
  await sendEmail({
    to: payment.email,
    subject: "ContractSecure Payment Confirmed",
    html: `
      <h2>Payment Approved Successfully</h2>
      <p>Your submitted payment has been verified successfully.</p>
      <p><strong>Reference:</strong> ${payment.reference}</p>
      <p><strong>Procurement Reference:</strong> ${procurementRef}</p>
      <p><strong>Contract:</strong> ${payment.contract}</p>
      <p><strong>Status:</strong> Payment Confirmed</p>
      <p>Your payment has been approved and your application has entered the procurement evaluation
      stage. please keep your Procurement Reference for future correspondence with ContractSecure</p>
    `
  });
} catch (error) {
  console.log("Email failed:", error.message);
}

  res.redirect("/admin");
});


router.post("/admin/payment/:id/reject", requireLogin, async (req, res) => {
  const paymentId = req.params.id;

  const payment = db.prepare(`
    SELECT * FROM payments
    WHERE id = ?
  `).get(paymentId);

  db.prepare(`
    UPDATE payments
    SET status = ?
    WHERE id = ?
  `).run("Rejected", paymentId);

  try {
  await sendEmail({
    to: payment.email,
    subject: "ContractSecure Payment Confirmed",
    html: `
      <h2>Payment Confirmed</h2>
      <p>Your submitted payment has been verified successfully.</p>
      <p><strong>Reference:</strong> ${payment.reference}</p>
      <p><strong>Contract:</strong> ${payment.contract}</p>
      <p><strong>Status:</strong> Payment Confirmed</p>
      <p>Your application has now moved to procurement evaluation.</p>
    `
  });
} catch (error) {
  console.log("Email failed:", error.message);
}

  res.redirect("/admin");
});

router.get("/admin/application/:id", requireLogin, (req, res) => {
  const application = db.prepare(`
    SELECT *
    FROM applications
    WHERE id = ?
  `).get(req.params.id);

  if (!application) {
    return res.send("Application not found.");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Application Details</title>

<style>
body{
    font-family:Arial,sans-serif;
    background:#07111f;
    color:#fff;
    margin:0;
    padding:40px;
}

.card{
    max-width:900px;
    margin:auto;
    background:#0b1b32;
    padding:30px;
    border-radius:18px;
}

h1{
    color:#2fc9b2;
}

.row{
    margin:16px 0;
}

strong{
    color:#2fc9b2;
}

.back{
    display:inline-block;
    margin-top:30px;
    padding:12px 20px;
    background:#2fc9b2;
    color:#07111f;
    text-decoration:none;
    border-radius:10px;
    font-weight:bold;
}
</style>

</head>

<body>

<div class="card">

<h1>Application Details</h1>

<div class="row"><strong>Reference:</strong> ${application.reference}</div>

<div class="row"><strong>Name:</strong> ${application.fullName}</div>

<div class="row"><strong>Company:</strong> ${application.companyName}</div>

<div class="row"><strong>Email:</strong> ${application.email}</div>

<div class="row"><strong>Phone:</strong> ${application.phone}</div>

<div class="row"><strong>Contract:</strong> ${application.contract}</div>

<div class="row"><strong>Category:</strong> ${application.category}</div>

<div class="row"><strong>Location:</strong> ${application.location}</div>

<div class="row"><strong>Experience:</strong> ${application.experience}</div>

<div class="row"><strong>Message:</strong><br>${application.message}</div>

<select name="status" required>
  <option value="Pending Review" ${application.procurementStatus === "Pending Review" ? "selected" : ""}>Pending Review</option>
  <option value="Technical Review" ${application.procurementStatus === "Technical Review" ? "selected" : ""}>Technical Review</option>
  <option value="Financial Review" ${application.procurementStatus === "Financial Review" ? "selected" : ""}>Financial Review</option>
  <option value="Approved" ${application.procurementStatus === "Approved" ? "selected" : ""}>Approved</option>
  <option value="In Progress" ${application.procurementStatus === "In Progress" ? "selected" : ""}>In Progress</option>
  <option value="Payment Confirmed" ${application.procurementStatus === "Payment Confirmed" ? "selected" : ""}>Payment Confirmed</option>
  <option value="Awarded" ${application.procurementStatus === "Awarded" ? "selected" : ""}>Awarded</option>
  <option value="Rejected" ${application.procurementStatus === "Rejected" ? "selected" : ""}>Rejected</option>
</select>
<form method="POST" action="/admin/application/${application.id}/status">

  <button id="saveStatus">Update Status</button>

</form>

<a class="back" href="/admin">← Back to Dashboard</a>

</div>

</body>
</html>
`);
});

router.post("/admin/application/:id/approve", requireLogin, async (req, res) => {
  const applicationId = req.params.id;

  const application = db.prepare(`
    SELECT *
    FROM applications
    WHERE id = ?
  `).get(applicationId);

  if (!application) {
    return res.send("Application not found.");
  }

  const procurementRef =
    application.procurementReference ||
    "CS-" + Math.floor(1000000000 + Math.random() * 9000000000);

  db.prepare(`
    UPDATE applications
    SET
      procurementStatus = ?,
      paymentStatus = ?,
      procurementReference = ?
    WHERE id = ?
  `).run("Approved", "Approved", procurementRef, applicationId);

try {
  await sendEmail({
    to: application.email,
    subject: "ContractSecure Application Approved",
    html: `
      <h2>Application Approved</h2>
      <p>Your procurement application has been approved.</p>
      <p><strong>Contract:</strong> ${application.contract}</p>
      <p><strong>Procurement Reference:</strong> ${procurementRef}</p>
      <p>You can now log in to your applicant dashboard to track progress.</p>
    `
  });
} catch (error) {
  console.log("Approval email failed:", error.message);
}

  res.redirect("/admin");
});

router.post("/admin/application/:id/reject", requireLogin, async (req, res) => {
  const applicationId = req.params.id;

  const application = db.prepare(`
    SELECT *
    FROM applications
    WHERE id = ?
  `).get(applicationId);

  if (!application) {
    return res.send("Application not found.");
  }

  db.prepare(`
    UPDATE applications
    SET
      procurementStatus = ?,
      paymentStatus = ?
    WHERE id = ?
  `).run("Rejected", "Rejected", applicationId);

  try {
  await sendEmail({
    to: application.email,
    subject: "ContractSecure Application Update",
    html: `
      <h2>Application Update</h2>
      <p>Your procurement application was not approved at this stage.</p>
      <p><strong>Contract:</strong> ${application.contract}</p>
      <p>You can contact ContractSecure support if you need clarification.</p>
    `
  });
} catch (error) {
  console.log("Rejection email failed:", error.message);
}

  res.redirect("/admin");
});

router.post("/admin/application/:id/status", requireLogin, (req, res) => {

    const { status } = req.body;

    db.prepare(`
        UPDATE applications
        SET procurementStatus = ?
        WHERE id = ?
    `).run(status, req.params.id);

    res.redirect("/admin/application/" + req.params.id);

});

router.post("/admin/application/:id/status", requireLogin, (req, res) => {

    const applicationId = req.params.id;
    const { status } = req.body;

    db.prepare(`
        UPDATE applications
        SET procurementStatus = ?
        WHERE id = ?
    `).run(status, applicationId);

    res.redirect("/admin/application/" + applicationId);

});


router.get("/admin/contracts", requireLogin, (req, res) => {
  const contracts = db.prepare(`
    SELECT *
    FROM contracts
    ORDER BY id DESC
  `).all();

  const rows = contracts.map((contract) => `
    <tr>
      <td><strong>${escapeHtml(contract.title)}</strong></td>
      <td>${escapeHtml(contract.category)}</td>
      <td>${escapeHtml(contract.location)}</td>
      <td>${escapeHtml(contract.contractValue)}</td>
      <td>${escapeHtml(contract.agencyFee)}</td>
      <td><span class="pill ${String(contract.status).toLowerCase()}">${escapeHtml(contract.status || "Open")}</span></td>
      <td>
        <div class="actions">
          <a class="edit" href="/admin/contracts/${contract.id}/edit">Edit</a>
          <form method="POST" action="/admin/contracts/${contract.id}/delete" onsubmit="return confirm('Delete this contract permanently?');">
            <button class="delete" type="submit">Delete</button>
          </form>
        </div>
      </td>
    </tr>
  `).join("");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Manage Contracts</title>
<style>
body{font-family:Arial;background:#07111f;color:#fff;padding:40px}
a{color:#2fc9b2;font-weight:bold;text-decoration:none}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:18px}
.btn{background:#2fc9b2;color:#06111f;padding:12px 18px;border-radius:10px}
table{width:100%;border-collapse:collapse;background:#0b1b32;border-radius:16px;overflow:hidden}
th,td{padding:14px;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;vertical-align:top}
th{color:#2fc9b2;background:#102033}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.actions form{margin:0}.edit{background:#7dd3fc;color:#06111f;padding:9px 12px;border-radius:9px}.delete{background:#ef4444;color:white;border:0;padding:10px 12px;border-radius:9px;cursor:pointer;font-weight:bold}.pill{display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(52,211,153,.15);color:#34d399;font-weight:bold}.pill.closed{background:rgba(239,68,68,.15);color:#f87171}@media(max-width:800px){body{padding:18px}.header{flex-direction:column;align-items:flex-start}table{min-width:800px}.table-wrap{overflow-x:auto}}
</style>
</head>
<body>
<div class="header">
  <h1>Manage Contracts</h1>
  <a class="btn" href="/admin/contracts/new">Add New Contract</a>
</div>

<div class="table-wrap">
<table>
<thead>
<tr>
  <th>Title</th>
  <th>Category</th>
  <th>Location</th>
  <th>Contract Value</th>
  <th>Agency Fee</th>
  <th>Status</th>
  <th>Actions</th>
</tr>
</thead>
<tbody>
${rows || `<tr><td colspan="7">No contracts yet.</td></tr>`}
</tbody>
</table>
</div>

<p style="margin-top:24px;"><a href="/admin">← Back to Admin</a></p>
</body>
</html>
`);
});

router.get("/admin/contracts/new", requireLogin, (req, res) => {
  res.send(renderContractForm({
    mode: "create",
    action: "/admin/contracts/new"
  }));
});

router.post("/admin/contracts/new", requireLogin, (req, res) => {
  const { title, category, location, contractValue, agencyFee, description, status } = req.body;

  if (!title || !category || !location || !contractValue || !agencyFee) {
    return res.status(400).send("Missing required contract fields.");
  }

  db.prepare(`
    INSERT INTO contracts (
      title,
      category,
      location,
      contractValue,
      agencyFee,
      description,
      status
    )
    VALUES (?,?,?,?,?,?,?)
  `).run(
    title.trim(),
    category.trim(),
    location.trim(),
    String(contractValue).trim(),
    String(agencyFee).trim(),
    description || "",
    status || "Open"
  );

  res.redirect("/admin/contracts");
});

router.get("/admin/contracts/:id/edit", requireLogin, (req, res) => {
  const contract = db.prepare(`
    SELECT *
    FROM contracts
    WHERE id = ?
  `).get(req.params.id);

  if (!contract) {
    return res.status(404).send("Contract not found.");
  }

  res.send(renderContractForm({
    mode: "edit",
    contract,
    action: `/admin/contracts/${contract.id}/edit`
  }));
});

router.post("/admin/contracts/:id/edit", requireLogin, (req, res) => {
  const { title, category, location, contractValue, agencyFee, description, status } = req.body;

  if (!title || !category || !location || !contractValue || !agencyFee) {
    return res.status(400).send("Missing required contract fields.");
  }

  const result = db.prepare(`
    UPDATE contracts
    SET
      title = ?,
      category = ?,
      location = ?,
      contractValue = ?,
      agencyFee = ?,
      description = ?,
      status = ?
    WHERE id = ?
  `).run(
    title.trim(),
    category.trim(),
    location.trim(),
    String(contractValue).trim(),
    String(agencyFee).trim(),
    description || "",
    status || "Open",
    req.params.id
  );

  if (!result.changes) {
    return res.status(404).send("Contract not found.");
  }

  res.redirect("/admin/contracts");
});

router.post("/admin/contracts/:id/delete", requireLogin, (req, res) => {
  db.prepare(`
    DELETE FROM contracts
    WHERE id = ?
  `).run(req.params.id);

  res.redirect("/admin/contracts");
});

module.exports = router;