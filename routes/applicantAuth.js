const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/database");

const router = express.Router();

router.get("/applicant-login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Applicant Login | ContractSecure</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }

    body {
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(47,201,178,.18), transparent 35%),
        linear-gradient(135deg, #07111f, #0b1b32);
      color: #fff;
      display: grid;
      place-items: center;
      padding: 20px;
    }

    .login-card {
      width: min(100%, 440px);
      background: rgba(11,31,55,.9);
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 24px;
      padding: 34px;
      box-shadow: 0 24px 80px rgba(0,0,0,.35);
    }

    .brand {
      font-size: 24px;
      font-weight: 900;
      color: #2fc9b2;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 30px;
      margin-bottom: 10px;
    }

    p {
      color: #b9c7d9;
      margin-bottom: 24px;
      line-height: 1.6;
    }

    label {
      display: block;
      margin: 14px 0 8px;
      font-weight: 800;
      color: #d8e3f0;
    }

    input {
      width: 100%;
      padding: 15px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.14);
      background: #102033;
      color: #fff;
      font-size: 15px;
      outline: none;
    }

    input:focus {
      border-color: #2fc9b2;
      box-shadow: 0 0 0 4px rgba(47,201,178,.12);
    }

    button {
      width: 100%;
      margin-top: 24px;
      padding: 15px;
      border: 0;
      border-radius: 14px;
      background: linear-gradient(135deg, #2fc9b2, #73f7dc);
      color: #06111f;
      font-weight: 900;
      font-size: 15px;
      cursor: pointer;
    }

    .help {
      margin-top: 18px;
      font-size: 13px;
      color: #94a3b8;
      text-align: center;
    }

    .help a {
      color: #73f7dc;
      text-decoration: none;
      font-weight: 800;
    }
  </style>
</head>

<body>
  <main class="login-card">
    <div class="brand">ContractSecure</div>

    <h1>Applicant Login</h1>
    <p>Access your procurement dashboard, payment status, and contract evaluation progress.</p>

    <form method="POST" action="/applicant-login">
      <label for="email">Email Address</label>
      <input id="email" type="email" name="email" placeholder="you@company.com" required />

      <label for="password">Password</label>
      <input id="password" type="password" name="password" placeholder="Enter your password" required />

      <button type="submit">Access Dashboard</button>
    </form>

    <div class="help">
      New applicant? Submit a contract request from the <a href="/">main portal</a>.
    </div>
  </main>
</body>
</html>
`);
});

router.post("/applicant-login", (req, res) => {
  const { email, password } = req.body;

  const applicant = db.prepare(`
    SELECT *
    FROM applications
    WHERE email = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(email);

  if (!applicant) {
    return res.send("No application found for this email.");
  }

  if (!applicant.password) {
    return res.send("No password has been created for this application yet.");
  }

  const validPassword = bcrypt.compareSync(password, applicant.password);

  if (!validPassword) {
    return res.send("Invalid password.");
  }

  req.session.applicantEmail = applicant.email;

  res.redirect("/dashboard");
});

router.get("/applicant-logout", (req, res) => {
  req.session.applicantEmail = null;
  res.redirect("/applicant-login");
});

module.exports = router;
