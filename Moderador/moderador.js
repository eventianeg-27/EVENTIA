import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

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

const lista = document.getElementById("listaNegocios");
const tabPendientes = document.getElementById("tabPendientes");
const tabAprobados = document.getElementById("tabAprobados");
const tabRechazados = document.getElementById("tabRechazados");

// Contadores
const countPendientes = document.getElementById("countPendientes");
const countAprobados = document.getElementById("countAprobados");
const countRechazados = document.getElementById("countRechazados");

tabPendientes.addEventListener("click", () => cargarNegocios("pendiente"));
tabAprobados.addEventListener("click", () => cargarNegocios("aprobado"));
tabRechazados.addEventListener("click", () => cargarNegocios("rechazado"));

// Cargar por defecto los pendientes
cargarNegocios("pendiente");
actualizarContadores();

//cargar negocios según estado
async function cargarNegocios(estado) {
  lista.innerHTML = `<p class="text-center text-secondary">Cargando negocios ${estado}s...</p>`;
  marcarTabActivo(estado);

  const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
  const negocios = [];

  for (const usuarioDoc of usuariosSnapshot.docs) {
    const usuarioId = usuarioDoc.id;
    const negociosRef = collection(db, "usuarios", usuarioId, "negocios");
    const negociosSnapshot = await getDocs(negociosRef);

    negociosSnapshot.forEach((negocioDoc) => {
      const negocioData = negocioDoc.data();
      // Si no tiene campo "estado", asumimos que es pendiente (para compatibilidad)
      const estadoActual = negocioData.estado || "pendiente"; // Si no existe, lo tratamos como pendiente

      if (estadoActual === estado) {
        negocios.push({
          ...negocioData,
          usuarioId,
          negocioId: negocioDoc.id,
          estado: estadoActual,
        });
      }
    });
  }

  if (negocios.length === 0) {
    lista.innerHTML = `<div class="alert alert-info text-center mt-4">No hay negocios ${estado}s.</div>`;
    return;
  }

  lista.innerHTML = "";
  negocios.forEach((negocio) => {
    const card = document.createElement("div");
    card.className = "card mb-3 shadow-sm";

    card.innerHTML = `
      <div class="row g-0">
        <div class="col-md-4">
          <img src="${negocio.urlFachada || negocio.urlImagen || 'https://via.placeholder.com/400x300'}" 
               class="img-fluid rounded-start" alt="Fachada del negocio">
        </div>
        <div class="col-md-8">
          <div class="card-body">
            <h5 class="card-title">${negocio.negocio}</h5>
            <p class="card-text">${negocio.descripcion || "Sin descripción"}</p>
            <p class="card-text"><strong>Categoría:</strong> ${negocio.especialidad || "N/A"}</p>
            <p class="card-text"><strong>Teléfono:</strong> ${negocio.telefono || "N/A"}</p>
            <p class="card-text"><a href="${negocio.ubicacionLink}" target="_blank">Ver ubicación</a></p>

            <div class="mt-3 acciones"></div>
          </div>
        </div>
      </div>
    `;

    const acciones = card.querySelector(".acciones");

    // Botones según estado
    if (estado === "pendiente") {
      acciones.innerHTML = `
        <button class="btn btn-success me-2 aprobar-btn">Aprobar</button>
        <button class="btn btn-danger rechazar-btn">Rechazar</button>
      `;
    } else if (estado === "aprobado") {
      acciones.innerHTML = `
        <button class="btn btn-warning rechazar-btn">Mover a rechazados</button>
      `;
    } else if (estado === "rechazado") {
      acciones.innerHTML = `
        <button class="btn btn-success aprobar-btn">Reaprobar</button>
      `;
    }

    // Evento aprobar
    const aprobarBtn = card.querySelector(".aprobar-btn");
    if (aprobarBtn) {
      aprobarBtn.addEventListener("click", async () => {
        await actualizarEstado(negocio, "aprobado");
        alert(`Negocio "${negocio.negocio}" aprobado.`);
        card.remove();
        actualizarContadores();
      });
    }

    // Evento rechazar
    const rechazarBtn = card.querySelector(".rechazar-btn");
    if (rechazarBtn) {
      rechazarBtn.addEventListener("click", async () => {
        await actualizarEstado(negocio, "rechazado");
        alert(`Negocio "${negocio.negocio}" movido a rechazados.`);
        card.remove();
        actualizarContadores();
      });
    }

    lista.appendChild(card);
  });
}

// Función para cambiar estado en Firestore
async function actualizarEstado(negocio, nuevoEstado) {
  const ref = doc(db, "usuarios", negocio.usuarioId, "negocios", negocio.negocioId);
  await updateDoc(ref, {estado: nuevoEstado,});
}

// Marcar pestaña activa
function marcarTabActivo(estado) {
  document.querySelectorAll("#tabs .nav-link").forEach(btn => btn.classList.remove("active"));
  if (estado === "pendiente") tabPendientes.classList.add("active");
  if (estado === "aprobado") tabAprobados.classList.add("active");
  if (estado === "rechazado") tabRechazados.classList.add("active");
}


// Actualizar contadores
async function actualizarContadores() {
  const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
  let pendientes = 0, aprobados = 0, rechazados = 0;

  for (const usuarioDoc of usuariosSnapshot.docs) {
    const negociosRef = collection(db, "usuarios", usuarioDoc.id, "negocios");
    const negociosSnapshot = await getDocs(negociosRef);

    negociosSnapshot.forEach((negocioDoc) => {
      const estado = negocioDoc.data().estado || "pendiente";
      if (estado === "pendiente") pendientes++;
      if (estado === "aprobado") aprobados++;
      if (estado === "rechazado") rechazados++;
    });
  }

  countPendientes.textContent = pendientes;
  countAprobados.textContent = aprobados;
  countRechazados.textContent = rechazados;
}