// ✅ FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDGS5r_ZgLKxoqzQR1XiZac1sMFyjJVBCM",
  authDomain: "employeetrac-d54e0.firebaseapp.com",
  databaseURL: "https://employeetrac-d54e0-default-rtdb.firebaseio.com",
  projectId: "employeetrac-d54e0",
  storageBucket: "employeetrac-d54e0.firebasestorage.app",
  messagingSenderId: "188113067539",
  appId: "1:188113067539:web:44146b8e0c31c300b969e6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// ✅ HELPER FUNCTIONS
function getPHTime() {
  return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

function getDateOnly() {
  const phNow = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const now = new Date(phNow);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


// ✅ ATTENDANCE FEATURE
function saveRecord(name, action) {
  const time = getPHTime();
  const date = getDateOnly();
  return db.ref("attendance").push({ name, action, time, date });
}

function timeIn() {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Please enter your name.");
  saveRecord(name, "IN").then(() => (document.getElementById("nameInput").value = ""));
}

function timeOut() {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Please enter your name.");
  saveRecord(name, "OUT").then(() => (document.getElementById("nameInput").value = ""));
}

function displayLogs(filterDate = getDateOnly()) {
  const tableBody = document.querySelector("#attendanceTable tbody");
  tableBody.innerHTML = "<tr><td colspan='4'>Loading records...</td></tr>";

  db.ref("attendance")
    .orderByChild("date")
    .equalTo(filterDate)
    .once("value", (snapshot) => {
      tableBody.innerHTML = "";
      if (!snapshot.exists()) {
        tableBody.innerHTML = `<tr><td colspan='4'>No records found for ${filterDate}</td></tr>`;
        return;
      }

      snapshot.forEach((child) => {
        const record = child.val();
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${record.date}</td>
          <td>${record.name}</td>
          <td>${record.action}</td>
          <td>${record.time}</td>
        `;
        tableBody.appendChild(row);
      });
    });
}


// ✅ ITINERARY FEATURE
function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveItinerary(date, name, time, activity, location, photoFile) {
  let photoBase64 = "";
  let filename = "";

  if (photoFile) {
    filename = photoFile.name;
    try {
      photoBase64 = await convertImageToBase64(photoFile);
    } catch (error) {
      console.error("Image conversion failed:", error);
    }
  }

  return db.ref("itinerary").child(date).push({
    name,
    time,
    activity,
    location,
    filename,
    photo: photoBase64,
    timestamp: Date.now(),
  });
}

function displayItineraries(filterDate = getDateOnly()) {
  const tableBody = document.querySelector("#itineraryTable tbody");
  tableBody.innerHTML = "<tr><td colspan='6'>Loading itinerary...</td></tr>";

  db.ref("itinerary").child(filterDate).once("value", (snapshot) => {
    tableBody.innerHTML = "";
    if (!snapshot.exists()) {
      tableBody.innerHTML = `<tr><td colspan='6'>No itineraries found for ${filterDate}.</td></tr>`;
      return;
    }

    Object.values(snapshot.val()).forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.name || "-"}</td>
        <td>${filterDate}</td>
        <td>${item.time}</td>
        <td>${item.activity}</td>
        <td>${item.location || "-"}</td>
        <td>
          ${
            item.photo
              ? `<div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                   <img src="${item.photo}" class="thumbnail" 
                        style="width:60px;height:60px;border-radius:8px;object-fit:cover;cursor:pointer;">
                   <span style="font-size:12px;color:gray;">${item.filename || "attached"}</span>
                 </div>`
              : "No photo"
          }
        </td>
      `;
      tableBody.appendChild(row);
    });
    enablePhotoViewer();
  });
}


// ✅ MODAL VIEWER
function enablePhotoViewer() {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const closeBtn = document.querySelector(".close-modal");

  document.querySelectorAll(".thumbnail").forEach((img) => {
    img.onclick = () => {
      modal.style.display = "block";
      modalImg.src = img.src;
    };
  });

  closeBtn.onclick = () => (modal.style.display = "none");
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}


// ✅ EVENT LISTENERS
window.onload = () => {
  // Attendance
  document.getElementById("timeInBtn").addEventListener("click", timeIn);
  document.getElementById("timeOutBtn").addEventListener("click", timeOut);
  document.getElementById("viewHistoryBtn").addEventListener("click", () => {
    const selectedDate = document.getElementById("attendanceDate").value;
    displayLogs(selectedDate || getDateOnly());
  });

  document.getElementById("deleteDataBtn").addEventListener("click", () => {
    const selectedDate = document.getElementById("attendanceDate").value;
    if (!selectedDate) return alert("Please select a date to delete.");
    if (confirm(`Delete all records for ${selectedDate}?`)) {
      db.ref("attendance")
        .once("value")
        .then((snapshot) => {
          snapshot.forEach((child) => {
            if (child.val().date === selectedDate) {
              db.ref("attendance").child(child.key).remove();
            }
          });
          alert(`✅ All records for ${selectedDate} deleted.`);
          displayLogs(selectedDate);
        });
    }
  });

  displayLogs();

  // Itinerary button
  document.getElementById("addItineraryBtn").addEventListener("click", async () => {
    const date = document.getElementById("itineraryDate").value;
    const name = document.getElementById("itineraryName").value.trim();
    const time = document.getElementById("itineraryTime").value;
    const activity = document.getElementById("itineraryTask").value.trim();
    const location = document.getElementById("itineraryLocation").value.trim();
    const photoFile = document.getElementById("itineraryPhoto").files[0];

    if (!date || !time || !activity || !name) {
      alert("⚠️ Please fill in all required fields (Date, Name, Time, Activity).");
      return;
    }

    if (!photoFile) {
      alert("⚠️ Please attach a photo before adding the itinerary.");
      return;
    }

    await saveItinerary(date, name, time, activity, location, photoFile);
    alert("✅ Itinerary added successfully with photo!");
    displayItineraries(date);

    // Clear fields
    document.getElementById("itineraryName").value = "";
    document.getElementById("itineraryTask").value = "";
    document.getElementById("itineraryLocation").value = "";
    document.getElementById("itineraryPhoto").value = "";
    document.getElementById("photoPreview").style.display = "none";
    document.getElementById("fileNameLabel").textContent = "";
  });

  document.getElementById("viewItineraryBtn").addEventListener("click", () => {
    const selectedDate = document.getElementById("viewItineraryDate").value;
    if (!selectedDate) return alert("Please select a date to view itinerary.");
    displayItineraries(selectedDate);
  });

  displayItineraries();

  // ✅ Preview selected photo + show filename
  const photoInput = document.getElementById("itineraryPhoto");
  const previewImg = document.getElementById("photoPreview");
  const fileNameLabel = document.getElementById("fileNameLabel");

  if (photoInput && previewImg && fileNameLabel) {
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewImg.style.display = "block";
          fileNameLabel.textContent = file.name;
        };
        reader.readAsDataURL(file);
      } else {
        previewImg.style.display = "none";
        fileNameLabel.textContent = "";
      }
    });
  }
};


/// ✅ DARK/LIGHT MODE FEATURE
const themeToggleBtn = document.getElementById("themeToggleBtn");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  themeToggleBtn.textContent = "☀️ Light Mode";
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  themeToggleBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});


// ✅ PDF GENERATION - Attendance (with logo)
document.getElementById("downloadAttendancePDF").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const img = new Image();
  img.src = "cdx.png"; // must be in same folder

  img.onload = () => {
    doc.addImage(img, "PNG", 14, 10, 18, 18);
    doc.setFontSize(16);
    doc.text("CDX Laboratory Product Center", 38, 20);
    doc.setFontSize(13);
    doc.text("Attendance Report", 38, 30);

    const table = document.getElementById("attendanceTable");
    const rows = Array.from(table.querySelectorAll("tbody tr")).map(tr =>
      Array.from(tr.querySelectorAll("td")).map(td => td.textContent)
    );

    let y = 45;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Date", 14, y);
    doc.text("Name", 55, y);
    doc.text("Action", 120, y);
    doc.text("Time", 160, y);
    doc.setFont("helvetica", "normal");

    y += 8;
    rows.forEach(row => {
      doc.text(row[0] || "-", 14, y);
      doc.text(row[1] || "-", 55, y);
      doc.text(row[2] || "-", 120, y);
      doc.text(row[3] || "-", 160, y);
      y += 8;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save("Attendance_Report.pdf");
  };
});


// ✅ PDF GENERATION - Itinerary (with logo)
document.getElementById("downloadItineraryPDF").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const img = new Image();
  img.src = "cdx.png";

  img.onload = () => {
    doc.addImage(img, "PNG", 14, 10, 18, 18);
    doc.setFontSize(16);
    doc.text("CDX Laboratory Product Center", 38, 20);
    doc.setFontSize(13);
    doc.text("Business Itinerary Report", 38, 30);

    const table = document.getElementById("itineraryTable");
    const rows = Array.from(table.querySelectorAll("tbody tr")).map(tr =>
      Array.from(tr.querySelectorAll("td")).map(td => td.textContent)
    );

    let y = 45;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Name", 14, y);
    doc.text("Date", 65, y);
    doc.text("Time", 95, y);
    doc.text("Task", 125, y);
    doc.text("Location", 170, y);
    doc.setFont("helvetica", "normal");

    y += 8;
    rows.forEach(row => {
      doc.text(row[0] || "-", 14, y);
      doc.text(row[1] || "-", 65, y);
      doc.text(row[2] || "-", 95, y);
      doc.text(row[3] || "-", 125, y);
      doc.text(row[4] || "-", 160, y);
      y += 8;
      if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save("Itinerary_Report.pdf");
  };
});
