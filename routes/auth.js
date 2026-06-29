const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/database");

const router = express.Router();

router.get("/login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>ContractSecure Admin Login</title>
</head>
<body style="margin:0;background:#07111f;color:white;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;">
  <form method="POST" action="/login" style="width:360px;background:#0b1728;padding:30px;border-radius:16px;">
    <h1>Admin Login</h1>
    <input name="username" placeholder="Username" required style="width:100%;padding:14px;margin:10px 0;background:#102033;color:white;border:1px solid #334155;border-radius:10px;">
    <input name="password" type="password" placeholder="Password" required style="width:100%;padding:14px;margin:10px 0;background:#102033;color:white;border:1px solid #334155;border-radius:10px;">
    <button style="width:100%;padding:14px;background:#34d399;border:0;border-radius:10px;font-weight:bold;">Login</button>
  </form>
</body>
</html>
  `);
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const admin = db.prepare(
    "SELECT * FROM admins WHERE username = ?"
  ).get(username);

  if (!admin) {
    return res.redirect("/login");
  }

  const passwordMatch = bcrypt.compareSync(password, admin.password);

  if (!passwordMatch) {
    return res.redirect("/login");
  }

  req.session.admin = {
    id: admin.id,
    username: admin.username
  };

  res.redirect("/admin");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;