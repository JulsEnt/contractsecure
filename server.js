const express = require("express");
const multer = require("multer");
const Stripe = require("stripe");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const db = require("./database/database");
const session = require("express-session");
const bcrypt = require("bcrypt");
const requireLogin = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const applicationRoutes = require("./routes/applications");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const applicantAuthRoutes = require("./routes/applicantAuth");


db.prepare(`
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT,
    fullName TEXT,
    companyName TEXT,
    email TEXT,
    phone TEXT,
    category TEXT,
    contract TEXT,
    location TEXT,
    experience TEXT,
    message TEXT,
    documents TEXT,
    paymentStatus TEXT,
    procurementStatus TEXT,
    procurementReference TEXT,
    createdAt TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)
`).run();

const adminExists = db.prepare(
    "SELECT * FROM admins WHERE username=?"
).get("admin");

if (!adminExists) {
    const hash = bcrypt.hashSync("ContractSecure2026!", 10);

    db.prepare(`
        INSERT INTO admins(username,password)
        VALUES (?,?)
    `).run("admin", hash);

    console.log("Default admin created.");
}

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret: "ContractSecureSuperSecret2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 2
    }
}));

app.use(authRoutes);
app.use(adminRoutes);
app.use(applicationRoutes);
app.use(paymentRoutes);
app.use(dashboardRoutes);
app.use(applicantAuthRoutes);

const PORT = process.env.PORT || 5000;

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

const applications = [];

const contracts = [
  { id: 1, title: "London Road Resurfacing Framework", category: "Road Construction", location: "London", value: 18 },
  { id: 2, title: "Manchester Commercial Office Development", category: "Commercial Buildings", location: "Manchester", value: 42 },
  { id: 3, title: "Birmingham Public Housing Renovation", category: "Housing Development", location: "Birmingham", value: 26 },
  { id: 4, title: "Leeds Hospital Equipment Supply", category: "Goods Supply", location: "Leeds", value: 8 },
  { id: 5, title: "Glasgow Bridge Maintenance Package", category: "Civil Works", location: "Glasgow", value: 15 },
  { id: 6, title: "Liverpool School Facility Upgrade", category: "Facility Maintenance", location: "Liverpool", value: 6 },
  { id: 7, title: "Bristol Electrical Installation Works", category: "Electrical Installation", location: "Bristol", value: 11 },
  { id: 8, title: "Sheffield Logistics Fleet Supply", category: "Goods Supply", location: "Sheffield", value: 9 },
  { id: 9, title: "Newcastle Drainage and Roadworks", category: "Road Construction", location: "Newcastle", value: 13 },
  { id: 10, title: "Cardiff Civic Centre Refurbishment", category: "Commercial Buildings", location: "Cardiff", value: 21 },
  { id: 11, title: "Nottingham Social Housing Build", category: "Housing Development", location: "Nottingham", value: 35 },
  { id: 12, title: "Oxford University Facility Maintenance", category: "Facility Maintenance", location: "Oxford", value: 7 },
  { id: 13, title: "Cambridge Medical Consumables Supply", category: "Medical Supply", location: "Cambridge", value: 5 },
  { id: 14, title: "Southampton Port Access Road", category: "Road Construction", location: "Southampton", value: 31 },
  { id: 15, title: "Edinburgh Rail Support Infrastructure", category: "Railway Works", location: "Edinburgh", value: 48 }
];

function getRiskRate(category) {
  const rates = {
    "Road Construction": 0.018,
    "Commercial Buildings": 0.015,
    "Goods Supply": 0.012,
    "Railway Works": 0.019,
    "Housing Development": 0.014,
    "Facility Maintenance": 0.013,
    "Electrical Installation": 0.014,
    "Medical Supply": 0.012,
    "Civil Works": 0.017
  };

  return rates[category] || 0.014;
}

function calculateFee(valueMillions, category) {
  const contractValue = Number(valueMillions) * 1000000;
  const baseFee = contractValue * 0.01;
  const riskFee = contractValue * getRiskRate(category);
  const totalFee = baseFee + riskFee;

  return {
    contractValue,
    baseFee,
    riskFee,
    totalFee
  };
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/contracts", (req, res) => {
  const db = require("./database/database");

  const contracts = db.prepare(`
    SELECT
      id,
      title,
      category,
      location,
      contractValue AS value,
      agencyFee AS fee,
      description,
      status
    FROM contracts
    WHERE status = 'Open'
    ORDER BY id DESC
  `).all();

  res.json({
    success: true,
    contracts
  });
});

app.post("/api/create-payment", async (req, res) => {
  try {
    const { contractId, customerEmail } = req.body;

    const contract = db.prepare(`
      SELECT
        id,
        title,
        category,
        location,
        contractValue AS value,
        agencyFee AS fee,
        description,
        status
      FROM contracts
      WHERE id = ?
    `).get(contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Selected contract was not found."
      });
    }

    const savedFee = Number(String(contract.fee || "0").replace(/[^0-9.]/g, ""));
    const fee = savedFee > 0
      ? { totalFee: savedFee }
      : calculateFee(contract.value, contract.category);

    if (!stripe) {
      return res.json({
        success: true,
        message: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env to activate checkout.",
        contract,
        fee
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `ContractSecure Fee Review - ${contract.title}`,
              description: `${contract.category} | ${contract.location} | ${contract.value}`
            },
            unit_amount: Math.round(fee.totalFee * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${frontendUrl}/?payment=success`,
      cancel_url: `${frontendUrl}/?payment=cancelled`
    });

    res.json({
      success: true,
      checkoutUrl: session.url
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Payment session failed."
    });
  }
});

app.get("/api/contracts", (req, res) => {

    const db = require("./database/database");

    const contracts = db.prepare(`
        SELECT *
        FROM contracts
        WHERE status = 'Open'
        ORDER BY id DESC
    `).all();

    res.json({
        success: true,
        contracts
    });

});

app.listen(PORT, () => {
  console.log(`ContractSecure running on http://localhost:${PORT}`);
});
