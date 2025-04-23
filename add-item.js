import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// DOM Elements
const itemForm = document.getElementById("itemForm");
const quantityInput = document.getElementById("quantity");
const serialsContainer = document.getElementById("serialNumbersContainer");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const recentItemsTbody = document.querySelector("#recentItemsTable tbody");

// Hint text for serial numbers
const serialHint = document.createElement("small");
serialHint.style.gridColumn = "span 2";
serialHint.style.color = "#555";
serialHint.style.fontSize = "0.9rem";
serialsContainer.insertAdjacentElement("afterend", serialHint);

// Chart.js reference
let statusChart;

// ─────────────────────────────────────────────
// SERIAL INPUTS
// ─────────────────────────────────────────────
function createSerialInputs(count) {
  serialsContainer.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = `serialNumber${i}`;
    input.placeholder = `Serial Number / Service Tag #${i}`;
    input.required = true;
    input.classList.add("serial-input");
    serialsContainer.appendChild(input);
  }
}

quantityInput.addEventListener("input", () => {
  const quantity = parseInt(quantityInput.value, 10);
  if (isNaN(quantity) || quantity < 1) {
    createSerialInputs(1);
    serialHint.textContent = "Enter a quantity of 1 or more to add serial numbers.";
    return;
  }
  createSerialInputs(quantity);
  serialHint.textContent = `Please input ${quantity} serial number(s).`;
});

// ─────────────────────────────────────────────
// FIREBASE STATS + CHART
// ─────────────────────────────────────────────
async function fetchStats() {
  try {
    const itemsSnap = await getDocs(collection(db, "items"));
    const totalItems = itemsSnap.size;

    let passed = 0, failed = 0, underQC = 0, ready = 0;

    itemsSnap.forEach((doc) => {
      const status = doc.data().status;
      if (status === "QC Passed") passed++;
      else if (status === "QC Failed") failed++;
      else if (status === "Under QC") underQC++;
      else if (status === "Ready for Delivery") ready++;
    });

    document.querySelector("#totalItems .stat-text").textContent = `Total Items: ${totalItems}`;
    document.querySelector("#qcPassed .stat-text").textContent = `QC Passed: ${passed}`;
    document.querySelector("#qcFailed .stat-text").textContent = `QC Failed: ${failed}`;
    document.querySelector("#underQC .stat-text").textContent = `Under QC: ${underQC}`;
    document.querySelector("#readyDelivery .stat-text").textContent = `Ready for Delivery: ${ready}`;

    updateStatusChart([passed, failed, underQC, ready]);
  } catch (err) {
    console.error("Error fetching stats:", err);
  }
}

function updateStatusChart(data) {
  const ctx = document.getElementById("statusChart").getContext("2d");

  if (statusChart) {
    statusChart.data.datasets[0].data = data;
    statusChart.update();
  } else {
    statusChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["QC Passed", "QC Failed", "Under QC", "Ready for Delivery"],
        datasets: [{
          data,
          backgroundColor: ["#4ade80", "#f87171", "#facc15", "#60a5fa"],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });

    renderCustomLegend([
      { label: "QC Passed", color: "#4ade80" },
      { label: "QC Failed", color: "#f87171" },
      { label: "Under QC", color: "#facc15" },
      { label: "Ready for Delivery", color: "#60a5fa" },
    ]);
  }
}

function renderCustomLegend(items) {
  const legendContainer = document.getElementById("customLegend");
  legendContainer.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.className = "legend-row";

  const bottomRow = document.createElement("div");
  bottomRow.className = "legend-row";

  items.forEach((item, index) => {
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${item.color}"></span>
      <span class="legend-label">${item.label}</span>
    `;
    index < 2 ? topRow.appendChild(legendItem) : bottomRow.appendChild(legendItem);
  });

  legendContainer.appendChild(topRow);
  legendContainer.appendChild(bottomRow);
}

// ─────────────────────────────────────────────
// FORM SUBMIT HANDLER
// ─────────────────────────────────────────────
itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = itemForm.querySelector("button[type='submit']");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  const quantity = parseInt(quantityInput.value, 10);
  const serialInputs = document.querySelectorAll("#serialNumbersContainer input");
  const serialNumbers = Array.from(serialInputs).map(input => input.value.trim());

  try {
    await addDoc(collection(db, "items"), {
      entryDate: document.getElementById("entryDate").value,
      itemModel: document.getElementById("itemModel").value,
      quantity,
      serialNumbers,
      checkedBy: document.getElementById("checkedBy").value,
      receivedBy: document.getElementById("receivedBy").value,
      distributorSupplier: document.getElementById("distributorSupplier").value,
      remarks: document.getElementById("remarks").value,
      endUser: document.getElementById("endUser").value,
      poNumber: document.getElementById("poNumber").value,
      dateDelivered: document.getElementById("dateDelivered").value,
      deliveredBy: document.getElementById("deliveredBy").value,
      notes: document.getElementById("notes").value,
      unitPrice: document.getElementById("unitPrice").value,
      status: document.getElementById("status").value,
      createdAt: Timestamp.now(),
    });

    alert("Item successfully added!");
    itemForm.reset();
    createSerialInputs(1);
    serialHint.textContent = "Please input 1 serial number.";
    fetchStats();
    loadRecentItems();
  } catch (err) {
    console.error("Error adding item:", err);
    alert("Error adding item.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit";
  }
});

// ─────────────────────────────────────────────
// RECENTLY ADDED ITEMS TABLE
// ─────────────────────────────────────────────
async function loadRecentItems() {
  try {
    const snapshot = await getDocs(collection(db, "items"));
    const items = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      items.push({
        date: data.entryDate,
        item: data.itemModel,
        quantity: data.quantity,
        serialNumbers: data.serialNumbers.join(", "),
        status: data.status
      });
    });

    renderRecentItems(items);
  } catch (err) {
    console.error("Error loading recent items:", err);
  }
}

function renderRecentItems(items) {
  recentItemsTbody.innerHTML = "";
  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.date}</td>
      <td>${item.item}</td>
      <td>${item.quantity}</td>
      <td>${item.serialNumbers}</td>
      <td>${item.status}</td>
    `;
    recentItemsTbody.appendChild(row);
  });

  applyFilters();
}

// Search & filter handler
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const status = statusFilter.value;

  const rows = recentItemsTbody.querySelectorAll("tr");
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    const matchesSearch = Array.from(cells).some(cell =>
      cell.textContent.toLowerCase().includes(search)
    );
    const matchesStatus = status === "" || cells[4].textContent === status;
    row.style.display = matchesSearch && matchesStatus ? "" : "none";
  });
}

searchInput.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  createSerialInputs(1);
  serialHint.textContent = "Please input 1 serial number.";
  fetchStats();
  loadRecentItems();
});
