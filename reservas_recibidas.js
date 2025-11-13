import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  deleteDoc
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
// 🔹 Obtener proveedorId desde localStorage
// ==========================
function getProveedorIdFromLocalStorage() {
  const posibles = [
    localStorage.getItem("usuarioId"),
    localStorage.getItem("usuarioNegocio"),
    localStorage.getItem("proveedorId")
  ];
  for (const v of posibles) if (v) return v.trim();

  const userData = localStorage.getItem("usuarioLogueado");
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      return (parsed.correo || parsed.usuario || parsed.usuarioMinusculas || "").trim();
    } catch {
      if (userData.includes("@")) return userData.trim();
    }
  }
  return null;
}

// ==========================
// 🔹 Función para formatear fecha
// ==========================
function formatearFecha(fecha) {
  if (!fecha) return "-";
  let d = fecha;
  if (fecha.toDate) d = fecha.toDate();
  else if (fecha.seconds) d = new Date(fecha.seconds * 1000);
  else if (typeof fecha === "string") d = new Date(fecha);
  if (isNaN(d)) return "-";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia} - ${mes} - ${anio}`;
}

// ==========================
// 📋 Variables
// ==========================
const negocioId = localStorage.getItem("negocioId");
const contenedor = document.getElementById("contenedorReservas");
const modalDetalle = document.getElementById("detalleReserva");
let reservas = [];
let reservasFiltradas = [];

// ==========================
// 🏪 Mostrar encabezado del negocio
// ==========================
async function mostrarEncabezadoNegocio(proveedorId, negocioId) {
  try {
    const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioId);
    const negocioSnap = await getDoc(negocioRef);
    if (negocioSnap.exists()) {
      const data = negocioSnap.data();
      document.getElementById("nombreNegocio").textContent = data.nombreNegocio || negocioId;
      document.getElementById("fotoNegocio").src = data.urlImagen || "https://via.placeholder.com/80";
    } else {
      document.getElementById("nombreNegocio").textContent = "Negocio no encontrado";
    }
  } catch (err) {
    console.error("❌ Error al cargar datos del negocio:", err);
  }
}

// ==========================
// 🧩 Agrupar reservas por día
// ==========================
function agruparPorDia(reservas) {
  const grupos = {};
  reservas.forEach(r => {
    const ts = r.data.creadoEn?.toDate ? r.data.creadoEn.toDate() : new Date(r.data.creadoEn);
    const fechaClave = formatearFecha(ts);
    if (!grupos[fechaClave]) grupos[fechaClave] = [];
    grupos[fechaClave].push(r);
  });
  return grupos;
}

// ==========================
// 📊 Render tabla (ya con botones funcionales)
// ==========================
function renderTabla(lista = reservasFiltradas) {
  contenedor.innerHTML = "";
  const reservasPorDia = agruparPorDia(lista);
  const fechasOrdenadas = Object.keys(reservasPorDia).sort((a, b) => {
    const [diaA, mesA, anioA] = a.split(" - ").map(Number);
    const [diaB, mesB, anioB] = b.split(" - ").map(Number);
    return new Date(anioB, mesB - 1, diaB) - new Date(anioA, mesA - 1, diaA);
  });

  fechasOrdenadas.forEach(fecha => {
    const grupo = reservasPorDia[fecha];
    const divDia = document.createElement("div");
    divDia.classList.add("mb-4", "p-3", "border", "rounded", "bg-light");

    divDia.innerHTML = `
      <h4 class="fw-bold mb-1">Reservas recibidas el día:</h4>
      <p>📅 <strong>${fecha}</strong>
      <span class="text-muted" style="font-size:0.9em;">&nbsp;&nbsp;Tienes 48 hrs para dar una respuesta al cliente.</span></p>
    `;

    const tabla = document.createElement("table");
    tabla.classList.add("table", "table-striped", "mt-3");
    tabla.innerHTML = `
      <thead class="table-dark">
        <tr>
          <th>Folio</th>
          <th>Correo Cliente</th>
          <th>Evento</th>
          <th>Hora del evento</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tabla.querySelector("tbody");

    grupo.forEach(({ id, clienteId, data }) => {
      const ahora = new Date();
      const limite = data.limiteRespuesta?.toDate ? data.limiteRespuesta.toDate() : new Date(data.limiteRespuesta);
      let estadoActual = data.estado || "pendiente";
      if (estadoActual === "pendiente" && limite && ahora > limite) {
        estadoActual = "expirada";
        const proveedorId = getProveedorIdFromLocalStorage();
        if (proveedorId) {
          const reservaRef = doc(
            db,
            "usuarios",
            proveedorId,
            "reservas_recibidas",
            negocioId,
            "clientes",
            clienteId,
            "reservas",
            id
          );
          updateDoc(reservaRef, { estado: "expirada" }).catch(() => { });
        }
      }

      let colorEstado = "purple";
      if (estadoActual === "aceptado") colorEstado = "green";
      else if (estadoActual === "rechazado") colorEstado = "red";
      else if (estadoActual === "expirada") colorEstado = "gray";

      const correoMostrar = data.correoCliente || clienteId || "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.folio || "-"}</td>
        <td>${correoMostrar}</td>
        <td>${data.evento || "-"}</td>
        <td>${data.hora || "-"}</td>
        <td class="estado" style="color:${colorEstado}; font-weight:bold;">${estadoActual}</td>
        <td>
          <button class="btn btn-info btn-sm" data-info='${JSON.stringify(data)}'>Info</button>
          <button class="btn btn-success btn-sm btn-aceptar" ${estadoActual !== "pendiente" ? "disabled" : ""}>Aceptar</button>
          <button class="btn btn-danger btn-sm btn-rechazar" ${estadoActual !== "pendiente" ? "disabled" : ""}>Rechazar</button>
        </td>
      `;
      tbody.appendChild(tr);

      // ✅ Botón Info
      tr.querySelector(".btn-info").addEventListener("click", e => {
        const d = JSON.parse(e.currentTarget.dataset.info);
        let fechaRegistro = "-";
        if (d.creadoEn) {
          if (d.creadoEn.toDate) fechaRegistro = formatearFecha(d.creadoEn.toDate());
          else if (d.creadoEn.seconds) fechaRegistro = formatearFecha(new Date(d.creadoEn.seconds * 1000));
          else fechaRegistro = formatearFecha(new Date(d.creadoEn));
        }

        let fechaEvento = "-";
        if (d.fechaStr) {
          const partes = d.fechaStr.split("-");
          if (partes.length === 3) fechaEvento = `${partes[2]} - ${partes[1]} - ${partes[0]}`;
        }

        modalDetalle.innerHTML = `
          <p><strong>Cliente:</strong> ${d.correoCliente || "-"}</p>
          <p><strong>Folio:</strong> ${d.folio || "-"}</p>
          <p><strong>Estado:</strong> ${d.estado || "-"}</p>
          <p><strong>Evento:</strong> ${d.evento || "-"}</p>
          <p><strong>Fecha de registro:</strong> ${fechaRegistro}</p>
          <p><strong>Fecha del evento:</strong> ${fechaEvento}</p>
          <p><strong>Hora del evento:</strong> ${d.hora || "-"}</p>
          <p><strong>Ubicación:</strong> ${d.ubicacion || "-"}</p>
          <p><strong>Teléfono:</strong> ${d.telefono || "-"}</p>
          <p><strong>Asistentes:</strong> ${d.asistentes || "-"}</p>
        `;
        new bootstrap.Modal(document.getElementById("modalInfo")).show();
      });

      // ✅ Botón Aceptar
      tr.querySelector(".btn-aceptar").addEventListener("click", async () => {
        const proveedorId = getProveedorIdFromLocalStorage();
        const reservaRef = doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id);
        await updateDoc(reservaRef, { estado: "aceptado" });
        // 🔹 Actualiza en pantalla al instante
        tr.querySelector(".estado").textContent = "aceptado";
        tr.querySelector(".estado").style.color = "green";
        tr.querySelector(".btn-aceptar").disabled = true;
        tr.querySelector(".btn-rechazar").disabled = true;
      });

      // ✅ Botón Rechazar
      tr.querySelector(".btn-rechazar").addEventListener("click", async () => {
        const proveedorId = getProveedorIdFromLocalStorage();
        const reservaRef = doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id);
        await updateDoc(reservaRef, { estado: "rechazado" });
        // 🔹 Actualiza en pantalla al instante
        tr.querySelector(".estado").textContent = "rechazado";
        tr.querySelector(".estado").style.color = "red";
        tr.querySelector(".btn-aceptar").disabled = true;
        tr.querySelector(".btn-rechazar").disabled = true;
      });
    });

    divDia.appendChild(tabla);
    contenedor.appendChild(divDia);
  });
}


// ==========================
// 🔁 Cargar reservas
// ==========================
onAuthStateChanged(auth, async user => {
  const proveedorId = getProveedorIdFromLocalStorage() || (user?.email?.toLowerCase());
  if (!proveedorId) {
    alert("Debes iniciar sesión o definir el proveedorId.");
    return;
  }

  await mostrarEncabezadoNegocio(proveedorId, negocioId);

  const clientesRef = collection(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes");
  const snapshotClientes = await getDocs(clientesRef);
  reservas = [];

  for (const clienteDoc of snapshotClientes.docs) {
    const clienteId = clienteDoc.id;
    const reservasRef = collection(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas");
    const snapshotReservas = await getDocs(reservasRef);
    snapshotReservas.forEach(reservaDoc => {
      reservas.push({ id: reservaDoc.id, clienteId, data: reservaDoc.data() });
    });
  }

  reservasFiltradas = [...reservas];
  renderTabla();

  // 🔍 Buscador de folios
  const buscador = document.createElement("input");
  buscador.type = "text";
  buscador.placeholder = "🔍 Buscar por folio...";
  buscador.classList.add("form-control", "mb-4");
  buscador.style.maxWidth = "350px";
  buscador.style.margin = "0 auto";
  buscador.addEventListener("input", e => {
    const texto = e.target.value.toLowerCase().trim();
    if (texto === "") reservasFiltradas = [...reservas];
    else reservasFiltradas = reservas.filter(r =>
      (r.data.folio || "").toLowerCase().includes(texto)
    );
    renderTabla();
  });
  contenedor.parentNode.insertBefore(buscador, contenedor);
});



// ==========================
// 🚀 Navegación de botones
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  // 🔸 Botón "Aceptadas"
  const btnVerAceptadas = document.getElementById("btnVerAceptadas");
  if (btnVerAceptadas) {
    btnVerAceptadas.addEventListener("click", () => {
      const negocioId = localStorage.getItem("negocioId");
      if (!negocioId) {
        alert("⚠️ No se encontró el negocioId en localStorage.");
        return;
      }
      // Redirigir a la página de reservas aceptadas
      window.location.href = "reservas_aceptadas.html";
    });
  }

  // 🔸 Botón "Rechazadas"
  const btnVerRechazadas = document.getElementById("btnVerRechazadas");
  if (btnVerRechazadas) {
    btnVerRechazadas.addEventListener("click", () => {
      const negocioId = localStorage.getItem("negocioId");
      if (!negocioId) {
        alert("⚠️ No se encontró el negocioId en localStorage.");
        return;
      }
      // Redirigir a la página de reservas rechazadas
      window.location.href = "reservas_rechazadas.html";
    });
  }
});
