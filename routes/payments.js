const express = require("express");
const db = require("../database/database");

const router = express.Router();

const wallets = {
  BTC: process.env.BTC_WALLET || "your_btc_wallet_here",
  USDT_TRC20: process.env.USDT_TRC20_WALLET || "your_usdt_trc20_wallet_here",
  USDT_ERC20: process.env.USDT_ERC20_WALLET || "your_usdt_erc20_wallet_here"
};

router.get("/api/payment-wallets", (req, res) => {
  res.json({
    success: true,
    wallets
  });
});

router.post("/api/submit-crypto-payment", (req, res) => {
  const {
    reference,
    contract,
    email,
    method,
    txHash,
    amount
  } = req.body;

  if (!method || !txHash) {
    return res.status(400).json({
      success: false,
      message: "Payment method and transaction hash are required."
    });
  }

  const walletAddress = wallets[method];

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment method."
    });
  }

  const payment = {
    reference: reference || "PAY-" + Date.now(),
    contract: contract || "",
    email: email || "",
    method,
    walletAddress,
    txHash,
    amount: amount || "",
    status: "Pending Review",
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO payments (
      reference, contract, email, method, walletAddress,
      txHash, amount, status, createdAt
    ) VALUES (
      @reference, @contract, @email, @method, @walletAddress,
      @txHash, @amount, @status, @createdAt
    )
  `).run(payment);

  res.json({
    success: true,
    message: "Crypto payment submitted for review.",
    payment
  });
});

router.get("/api/payments", (req, res) => {
  const payments = db.prepare(`
    SELECT * FROM payments
    ORDER BY id DESC
  `).all();

  res.json({
    success: true,
    payments
  });
});

module.exports = router;