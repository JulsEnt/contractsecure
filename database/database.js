const Database = require("better-sqlite3");

const db = new Database("contractsecure.db");

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
  createdAt TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,

    contractValue TEXT NOT NULL,
    agencyFee TEXT NOT NULL,

    description TEXT,

    status TEXT DEFAULT 'Open',

    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

const applicationColumns = db.prepare("PRAGMA table_info(applications)").all();
const applicationColumnNames = applicationColumns.map((column) => column.name);

function addApplicationColumn(columnName, sqlDefinition) {
  if (!applicationColumnNames.includes(columnName)) {
    db.prepare(`ALTER TABLE applications ADD COLUMN ${sqlDefinition}`).run();
  }
}

addApplicationColumn("procurementStatus", "procurementStatus TEXT DEFAULT 'Pending Review'");
addApplicationColumn("paymentStatus", "paymentStatus TEXT DEFAULT 'Awaiting Payment'");
addApplicationColumn("procurementReference", "procurementReference TEXT");
addApplicationColumn("password", "password TEXT");

db.prepare(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT,
  contract TEXT,
  email TEXT,
  method TEXT,
  walletAddress TEXT,
  txHash TEXT,
  amount TEXT,
  status TEXT,
  createdAt TEXT
)
`).run();

const appColumns = db.prepare("PRAGMA table_info(applications)").all();
const appColumnNames = appColumns.map((column) => column.name);

if (!appColumnNames.includes("paymentStatus")) {
  db.prepare("ALTER TABLE applications ADD COLUMN paymentStatus TEXT").run();
}

if (!appColumnNames.includes("procurementStatus")) {
  db.prepare("ALTER TABLE applications ADD COLUMN procurementStatus TEXT").run();
}

if (!appColumnNames.includes("procurementReference")) {
  db.prepare("ALTER TABLE applications ADD COLUMN procurementReference TEXT").run();
}

const appColumnsForPassword = db.prepare("PRAGMA table_info(applications)").all();
const appColumnNamesForPassword = appColumnsForPassword.map((column) => column.name);

if (!appColumnNamesForPassword.includes("password")) {
  db.prepare("ALTER TABLE applications ADD COLUMN password TEXT").run();
}

module.exports = db;