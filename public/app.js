window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

const mobileToggle = document.getElementById("mobileToggle");
const navMenu = document.getElementById("navMenu");

if (mobileToggle && navMenu) {
  mobileToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}

let contracts = [];
let activeContract = null;
let customerEmail = "";

const contractsGrid = document.getElementById("contractsGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const estimateCategory = document.getElementById("estimateCategory");
const estimateValue = document.getElementById("estimateValue");
const estimateSlider = document.getElementById("estimateSlider");
const baseFee = document.getElementById("baseFee");
const riskFee = document.getElementById("riskFee");
const totalFee = document.getElementById("totalFee");

const selectedContract = document.getElementById("selectedContract");
const selectedContractValue = document.getElementById("selectedContractValue");
const selectedContractInput = document.getElementById("selectedContractInput");
const feeAmount = document.getElementById("feeAmount");

function parseMoney(value) {
  const number = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatGBP(amount) {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(safeAmount);
}

function formatContractValue(value) {
  const number = parseMoney(value);

  if (!number) return "£0";

  // Values stored as 18, 42, etc. represent millions.
  if (number < 1000) {
    return `£${number}M`;
  }

  return formatGBP(number);
}

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

function calculateEstimatorFee(valueMillions, category) {
  const value = parseMoney(valueMillions);
  const contractValue = value * 1000000;
  const base = contractValue * 0.01;
  const risk = contractValue * getRiskRate(category);
  const total = base + risk;

  return { contractValue, base, risk, total };
}

function calculateContractFee(contract) {
  if (!contract) {
    return { base: 0, risk: 0, total: 0 };
  }

  const savedFee = parseMoney(contract.fee || contract.agencyFee);

  if (savedFee > 0) {
    return { base: savedFee, risk: 0, total: savedFee };
  }

  return calculateEstimatorFee(contract.value || contract.contractValue, contract.category);
}

function updateEstimator() {
  if (!estimateValue || !estimateCategory) return { base: 0, risk: 0, total: 0 };

  const fee = calculateEstimatorFee(estimateValue.value, estimateCategory.value);

  if (baseFee) baseFee.textContent = formatGBP(fee.base);
  if (riskFee) riskFee.textContent = formatGBP(fee.risk);
  if (totalFee) totalFee.textContent = formatGBP(fee.total);

  return fee;
}

function normalizeContract(contract) {
  return {
    ...contract,
    id: Number(contract.id),
    value: contract.value ?? contract.contractValue ?? 0,
    fee: contract.fee ?? contract.agencyFee ?? 0,
    status: contract.status || contract.Status || "Open"
  };
}

async function loadContracts() {
  try {
    const response = await fetch("/api/contracts");
    const data = await response.json();

    if (data.success) {
      contracts = (data.contracts || []).map(normalizeContract);
      renderContracts();
    }
  } catch (err) {
    console.error("Could not load contracts:", err);
  }
}

function renderContracts(list = contracts) {
  if (!contractsGrid) return;

  if (!list.length) {
    contractsGrid.innerHTML = `<p class="warning-box">No contracts found.</p>`;
    return;
  }

  contractsGrid.innerHTML = list.map((contract) => `
    <article class="contract-card">
      <div class="contract-top">
        <h3>${contract.title}</h3>
        <span class="status-tag">${contract.status}</span>
      </div>

      <div class="contract-meta">
        <div class="meta-box"><span>Category</span><strong>${contract.category}</strong></div>
        <div class="meta-box"><span>Location</span><strong>${contract.location}</strong></div>
        <div class="meta-box"><span>Value</span><strong>${formatContractValue(contract.value)}</strong></div>
        <div class="meta-box"><span>Status</span><strong>${contract.status}</strong></div>
      </div>

      <div class="contract-actions">
        <button class="small-btn primary" type="button" onclick="applyForContract(${contract.id})">Apply Now</button>
        <button class="small-btn" type="button" onclick="viewFee(${contract.id})">View Fee</button>
      </div>
    </article>
  `).join("");
}

function filterContracts() {
  if (!searchInput || !categoryFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;

  const filtered = contracts.filter((contract) => {
    const matchesSearch =
      String(contract.title || "").toLowerCase().includes(searchTerm) ||
      String(contract.category || "").toLowerCase().includes(searchTerm) ||
      String(contract.location || "").toLowerCase().includes(searchTerm);

    const matchesCategory = category === "All" || contract.category === category;

    return matchesSearch && matchesCategory;
  });

  renderContracts(filtered);
}

function selectContract(id) {
  const contract = contracts.find((item) => Number(item.id) === Number(id));
  if (!contract) return null;

  activeContract = contract;

  const valueOnly = parseMoney(contract.value);

  if (estimateCategory) estimateCategory.value = contract.category;
  if (estimateValue) estimateValue.value = valueOnly || 1;
  if (estimateSlider) estimateSlider.value = valueOnly || 1;

  updateEstimator();

  const fee = calculateContractFee(contract);

  if (selectedContract) selectedContract.textContent = contract.title;
  if (selectedContractValue) selectedContractValue.textContent = formatContractValue(contract.value);
  if (selectedContractInput) selectedContractInput.value = contract.title;
  if (feeAmount) feeAmount.textContent = formatGBP(fee.total);

  return contract;
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function applyForContract(id) {
  const contract = selectContract(id);
  if (!contract) return;
  scrollToSection("apply");
}

function viewFee(id) {
  const contract = selectContract(id);
  if (!contract) return;
  scrollToSection("payment");
}

// Make functions available for inline onclick handlers in rendered cards.
window.applyForContract = applyForContract;
window.viewFee = viewFee;
window.selectContract = selectContract;

if (estimateValue && estimateSlider) {
  estimateValue.addEventListener("input", () => {
    estimateSlider.value = estimateValue.value;
    updateEstimator();
  });

  estimateSlider.addEventListener("input", () => {
    estimateValue.value = estimateSlider.value;
    updateEstimator();
  });
}

if (estimateCategory) estimateCategory.addEventListener("change", updateEstimator);
if (searchInput) searchInput.addEventListener("input", filterContracts);
if (categoryFilter) categoryFilter.addEventListener("change", filterContracts);

const contractForm = document.getElementById("contractForm");

if (contractForm) {
  contractForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    customerEmail = document.getElementById("email")?.value || "";
    const formSuccess = document.getElementById("formSuccess");
    const formError = document.getElementById("formError");

    if (formSuccess) formSuccess.style.display = "none";
    if (formError) formError.style.display = "none";

    try {
      const formData = new FormData(event.target);

      const response = await fetch("/api/apply", {
        method: "POST",
        body: formData
      });

      const rawResponse = await response.text();

      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch {
        throw new Error("Backend returned invalid response. Check the server terminal for the real error.");
      }

      if (!data.success) {
        throw new Error(data.message || "Application could not be submitted.");
      }

      if (formSuccess) {
        formSuccess.textContent = "Application submitted successfully. Reference: " + data.application.reference;
        formSuccess.style.display = "block";
      }
    } catch (error) {
      if (formError) {
        formError.textContent = error.message || "Something went wrong while submitting your application.";
        formError.style.display = "block";
      }
    }
  });
}

const cryptoPaymentBtn = document.getElementById("cryptoPaymentBtn");
const paymentModal = document.getElementById("paymentModal");
const closePaymentModal = document.getElementById("closePaymentModal");
const paymentMethod = document.getElementById("paymentMethod");
const walletAddressText = document.getElementById("walletAddressText");
const modalContractName = document.getElementById("modalContractName");
const modalFeeAmount = document.getElementById("modalFeeAmount");
const networkLabel = document.getElementById("networkLabel");
const cancelPaymentModal = document.getElementById("cancelPaymentModal");
const paymentSuccessBox = document.getElementById("paymentSuccessBox");
const copyWallet = document.getElementById("copyWallet");
const submitCryptoPayment = document.getElementById("submitCryptoPayment");
const txHash = document.getElementById("txHash");
const paymentAmount = document.getElementById("paymentAmount");
const paymentEmail = document.getElementById("paymentEmail");

let paymentWallets = {};

async function loadPaymentWallets() {
  try {
    const response = await fetch("/api/payment-wallets");
    const data = await response.json();

    if (data.success) {
      paymentWallets = data.wallets || {};
      if (walletAddressText && paymentMethod) {
        walletAddressText.textContent = paymentWallets[paymentMethod.value] || "";
      }
    }
  } catch (error) {
    console.error("Could not load payment wallets:", error);
  }
}

function updateNetworkLabel() {
  if (!networkLabel || !paymentMethod) return;

  const labels = {
    BTC: "Bitcoin Network",
    USDT_TRC20: "TRON Network TRC20",
    USDT_ERC20: "Ethereum Network ERC20"
  };

  networkLabel.textContent = labels[paymentMethod.value] || "Crypto Network";
}

if (cryptoPaymentBtn) {
  cryptoPaymentBtn.addEventListener("click", async () => {
    if (!activeContract) {
      alert("Please select a contract before continuing to payment.");
      return;
    }

    await loadPaymentWallets();

    if (modalContractName) modalContractName.textContent = activeContract.title;
    if (modalFeeAmount && feeAmount) modalFeeAmount.textContent = feeAmount.textContent;
    if (paymentSuccessBox) paymentSuccessBox.classList.add("hidden");
    updateNetworkLabel();

    if (paymentModal) paymentModal.classList.remove("hidden");
  });
}

if (closePaymentModal) {
  closePaymentModal.addEventListener("click", () => paymentModal?.classList.add("hidden"));
}

if (paymentMethod) {
  paymentMethod.addEventListener("change", () => {
    if (walletAddressText) {
      walletAddressText.textContent = paymentWallets[paymentMethod.value] || "";
    }
    updateNetworkLabel();
  });
}

if (copyWallet) {
  copyWallet.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(walletAddressText?.textContent || "");
      copyWallet.textContent = "Copied";
      setTimeout(() => {
        copyWallet.textContent = "Copy Wallet Address";
      }, 1500);
    } catch {
      alert("Copy failed. Please copy manually.");
    }
  });
}

if (cancelPaymentModal) {
  cancelPaymentModal.addEventListener("click", () => paymentModal?.classList.add("hidden"));
}

if (submitCryptoPayment) {
  submitCryptoPayment.addEventListener("click", async () => {
    try {
      if (!activeContract) {
        alert("Please select a contract first.");
        return;
      }

      if (!txHash || !txHash.value.trim()) {
        alert("Please enter the transaction hash.");
        return;
      }

      const response = await fetch("/api/submit-crypto-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reference: "PAY-" + Date.now(),
          contract: activeContract.title,
          email: paymentEmail?.value || customerEmail || document.getElementById("email")?.value || "",
          method: paymentMethod ? paymentMethod.value : "BTC",
          walletAddress: walletAddressText ? walletAddressText.textContent : "",
          txHash: txHash.value.trim(),
          amount: paymentAmount ? paymentAmount.value.trim() : feeAmount?.textContent || ""
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Payment submission failed.");
      }

      if (paymentSuccessBox) paymentSuccessBox.classList.remove("hidden");
      if (paymentModal) paymentModal.classList.add("hidden");

      txHash.value = "";
      if (paymentAmount) paymentAmount.value = "";
    } catch (error) {
      alert(error.message || "Something went wrong.");
    }
  });
}

loadContracts();
updateEstimator();
