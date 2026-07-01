const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../database/database");
const bcrypt = require("bcrypt");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post("/api/apply", upload.array("documents", 8), (req, res) => {
  const reference = "CS-" + Date.now();
  const createdAt = new Date().toISOString();

  const documents = (req.files || []).map((file) => ({
    originalName: file.originalname,
    filename: file.filename,
    path: "/uploads/" + file.filename,
    size: file.size,
    mimeType: file.mimetype
  }));

  const application = {
    reference,
    fullName: req.body.fullName || "",
    companyName: req.body.companyName || "",
    email: req.body.email || "",
    phone: req.body.phone || "",
    category: req.body.neededCategory || "",
    contract: req.body.selectedContract || "",
    location: req.body.preferredLocation || "",
    experience: req.body.experience || "",
    message: req.body.message || "",
    documents: JSON.stringify(documents),
    password: req.body.password ? bcrypt.hashSync(req.body.password, 10) : "",
    createdAt
  };

  db.prepare(`
    INSERT INTO applications (
      reference, fullName, companyName, email, phone,
      category, contract, location, experience, message,
      documents, password, createdAt
    ) VALUES (
      @reference, @fullName, @companyName, @email, @phone,
      @category, @contract, @location, @experience, @message,
      @documents, @password, @createdAt
    )
  `).run(application);

  res.json({
    success: true,
    message: "Application submitted successfully.",
    application: {
      ...application,
      documents
    }
  });
});

router.get("/api/applications", (req, res) => {
  const applications = db.prepare(`
    SELECT * FROM applications
    ORDER BY id DESC
  `).all();

  const parsedApplications = applications.map((app) => ({
    ...app,
    documents: JSON.parse(app.documents || "[]")
  }));

  res.json({
    success: true,
    applications: parsedApplications
  });
});

module.exports = router;
