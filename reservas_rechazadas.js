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

// Config Firebase
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

const tbody = document.querySelector("#tablaRechazadas tbody");
const modalDetalle = document.getElementById("detalleReserva");
const negocioId = localStorage.getItem("negocioId");

let reservasRechazadas = [];

function renderTabla() {
  tbody.innerHTML = "";
  reservasRechazadas.forEach(({ id, data }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.correo || "-"}</td>
      <td>${data.evento || "-"}</td>
      <td style="color:red; font-weight:bold;">rechazado</td>
      <td>
        <button class="btn btn-info btn-sm" data-info='${JSON.stringify(data)}'>Info</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".btn-info").addEventListener("click", (e) => {
      const d = JSON.parse(e.currentTarget.dataset.info);
      modalDetalle.innerHTML = `
        <p><strong>Cliente:</strong> ${d.correo || "-"}</p>
        <p><strong>Evento:</strong> ${d.evento || "-"}</p>
        <p><strong>Fecha:</strong> ${d.fechaStr || "-"}</p>
        <p><strong>Hora:</strong> ${d.hora || "-"}</p>
        <p><strong>Ubicación:</strong> ${d.ubicacion || "-"}</p>
        <p><strong>Teléfono:</strong> ${d.telefono || "-"}</p>
        <p><strong>Asistentes:</strong> ${d.asistentes || "-"}</p>
        <p><strong>Estado:</strong> rechazado</p>
      `;
      new bootstrap.Modal(document.getElementById("modalInfo")).show();
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return alert("Debes iniciar sesión");

  const proveedorId = user.email.toLowerCase();
  const clientesRef = collection(db, "usuarios", proveedorId, "reservas_rechazadas", negocioId, "clientes");
  const snapshot = await getDocs(clientesRef);
  reservasRechazadas = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
  renderTabla();
});

// Botón volver
document.getElementById("btnVolver").addEventListener("click", () => {
  window.location.href = "reservas_recibidas.html";
});
