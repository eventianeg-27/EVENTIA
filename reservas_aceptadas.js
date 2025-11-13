import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ==========================
// 🔧 Configuración Firebase
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyBhX59jBh2tUkEnEGcb9sFVyW2zJe9NB_w",
  authDomain: "eventia-9ead3.firebaseapp.com",
  projectId: "eventia-9ead3",
  storageBucket: "eventia-9ead3.appspot.com",
  messagingSenderId: "313661648136",
  appId: "1:313661648136:web:1c9eb73bbb3f78994c90bd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==========================
// 📅 Elementos del calendario
// ==========================
const mesActualEl = document.getElementById("mesActual");
const calendarGrid = document.getElementById("calendarGrid");
const monthBar = document.getElementById("monthBar");
const modalDetalle = document.getElementById("detalleReserva");

let currentDate = new Date();
let eventos = [];
const meses = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

// ==========================
// 📆 Render barra de meses
// ==========================
function renderMonthBar() {
  monthBar.innerHTML = "";
  meses.forEach((m, i) => {
    const btn = document.createElement("button");
    btn.textContent = m;
    if (i === currentDate.getMonth()) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentDate.setMonth(i);
      renderCalendar();
    });
    monthBar.appendChild(btn);
  });
}

// ==========================
// 📅 Render calendario
// ==========================
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  mesActualEl.textContent = `${meses[month]} ${year}`;
  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Espacios vacíos al inicio del mes
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.innerHTML = `<strong>${d}</strong>`;

    // Filtrar reservas de este día
    const reservasDia = eventos.filter(ev => {
      let fechaEv;
      if (ev.fechaStr) {
        const [yyyy, mm, dd] = ev.fechaStr.split("-").map(Number);
        fechaEv = new Date(yyyy, mm - 1, dd);
      } else if (ev.fecha?.toDate) {
        fechaEv = ev.fecha.toDate();
      } else {
        fechaEv = new Date(ev.fecha);
      }

      return (
        fechaEv.getFullYear() === year &&
        fechaEv.getMonth() === month &&
        fechaEv.getDate() === d
      );
    });

    if (reservasDia.length > 0) {
      reservasDia.forEach(ev => {
        const info = document.createElement("div");
        info.className = "event-info";
        info.innerHTML =
          `<strong>Evento:</strong> ${ev.evento || "-"}<br>` +
          `<strong>Ubicación:</strong> ${ev.ubicacion || "Sin ubicación"}`;
        cell.appendChild(info);

        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-info info-btn";
        btn.textContent = "Info";
        btn.addEventListener("click", () => mostrarInfo(ev));
        cell.appendChild(btn);
      });
      cell.classList.add("event-day");
    }

    calendarGrid.appendChild(cell);
  }
}

// ==========================
// 🧾 Mostrar información de reserva
// ==========================
function mostrarInfo(ev) {
  modalDetalle.innerHTML = `
    <p><strong>Cliente:</strong> ${ev.clienteId}</p>
    <p><strong>Evento:</strong> ${ev.evento || "-"}</p>
    <p><strong>Fecha:</strong> ${ev.fechaStr || (ev.fecha instanceof Date ? ev.fecha.toLocaleDateString() : "-")}</p>
    <p><strong>Hora:</strong> ${ev.hora || "-"}</p>
    <p><strong>Ubicación:</strong> ${ev.ubicacion || "-"}</p>
    <p><strong>Teléfono:</strong> ${ev.telefono || "-"}</p>
    <p><strong>Asistentes:</strong> ${ev.asistentes || "-"}</p>
  `;
  new bootstrap.Modal(document.getElementById("modalInfo")).show();
}

// ==========================
// ⏪⏩ Navegación de meses
// ==========================
document.getElementById("prevMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// ==========================
// 🔁 Cargar reservas aceptadas
// ==========================
onAuthStateChanged(auth, async user => {
  if (!user) return;

  const proveedorId = user.email.toLowerCase();
  const negocioId = localStorage.getItem("negocioId");

  if (!negocioId) {
    alert("⚠️ No se encontró 'negocioId' en localStorage.");
    return;
  }

  try {
    // 🔹 Obtener todos los clientes dentro del negocio
    const clientesSnap = await getDocs(
      collection(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes")
    );

    eventos = [];

    // 🔹 Recorrer cada cliente y traer sus reservas
    for (const clienteDoc of clientesSnap.docs) {
      const clienteId = clienteDoc.id;
      const reservasRef = collection(
        db,
        "usuarios",
        proveedorId,
        "reservas_recibidas",
        negocioId,
        "clientes",
        clienteId,
        "reservas"
      );
      const reservasSnap = await getDocs(reservasRef);

      reservasSnap.forEach(rDoc => {
        const data = rDoc.data();
        if (data.estado === "aceptado") {
          eventos.push({
            id: rDoc.id,
            clienteId,
            fecha: data.fecha || null,
            fechaStr: data.fechaStr || null,
            evento: data.evento || "",
            hora: data.hora || "",
            ubicacion: data.ubicacion || "",
            telefono: data.telefono || "",
            asistentes: data.asistentes || ""
          });
        }
      });
    }

    renderMonthBar();
    renderCalendar();
    console.log(`✅ ${eventos.length} reservas aceptadas cargadas.`);
  } catch (err) {
    console.error("❌ Error al cargar reservas aceptadas:", err);
  }
});
