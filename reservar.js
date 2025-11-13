import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ==========================
// 🔹 Configuración Firebase
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyBhX59jBh2tUkEnEGcb9sFVyW2zJe9NB_w",
  authDomain: "eventia-9ead3.firebaseapp.com",
  projectId: "eventia-9ead3",
  storageBucket: "eventia-9ead3.appspot.com",
  messagingSenderId: "313661648136",
  appId: "1:313661648136:web:1c9eb73bbb3f78994c90bd",
  measurementId: "G-RDLNL394MH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================
// 🔸 Generar folio aleatorio (5 caracteres)
// ==========================
function generarFolioReserva() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let folio = "";
  for (let i = 0; i < 5; i++) {
    folio += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return folio;
}

// ==========================
// 🔹 Obtener proveedorId
// ==========================
function getProveedorIdFromLocalStorage() {
  const candidates = [
    localStorage.getItem("usuarioId"),
    localStorage.getItem("usuarioNegocio"),
    localStorage.getItem("proveedorId")
  ];
  for (const c of candidates) if (c) return c.trim();

  const ul = localStorage.getItem("usuarioLogueado");
  if (ul) {
    try {
      const parsed = JSON.parse(ul);
      return (parsed.correo || parsed.usuario || parsed.usuarioMinusculas || "").trim();
    } catch (e) {
      if (ul.includes("@")) return ul.trim();
    }
  }
  return null;
}

// ==========================
// 🔹 Prellenar campo del negocio
// ==========================
document.addEventListener("DOMContentLoaded", async () => {
  const negocioId = localStorage.getItem("negocioId");
  const proveedorId = getProveedorIdFromLocalStorage();

  if (proveedorId && negocioId) {
    try {
      const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioId);
      const snap = await getDoc(negocioRef);
      if (snap.exists()) {
        const datos = snap.data();
        const campoNegocio = document.getElementById("negocio");
        if (campoNegocio)
          campoNegocio.value = datos.negocio || datos.nombre || negocioId.replace(/_/g, " ");
      }
    } catch (err) {
      console.error("❌ Error al prellenar negocio:", err);
    }
  }
});

// ==========================
// 🔹 Guardar reserva (cliente + proveedor)
// ==========================
async function guardarReservaEnAmbosLados(proveedorId, negocioId, clienteId, reserva) {
  try {
    const folio = generarFolioReserva();

    const negocioDocRef = doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId);
    await setDoc(negocioDocRef, { negocioId, nombre: reserva.negocio, actualizadoEn: new Date() }, { merge: true });

    const clienteDocRef = doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId);
    await setDoc(clienteDocRef, { clienteId, correo: clienteId, actualizadoEn: new Date() }, { merge: true });

    const fechaCreacion = new Date();
    const limiteRespuesta = new Date(fechaCreacion.getTime() + 48 * 60 * 60 * 1000);

    await setDoc(
      doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", folio),
      {
        ...reserva,
        folio,
        creadoEn: fechaCreacion,
        limiteRespuesta: limiteRespuesta,
      }
    );

    console.log("✅ Guardado en reservas_recibidas:", folio);

    const negocioDocCliente = doc(db, "usuarios", clienteId, "reservas_hechas", negocioId);
    await setDoc(negocioDocCliente, { negocio: reserva.negocio, negocioId }, { merge: true });

    await setDoc(
      doc(db, "usuarios", clienteId, "reservas_hechas", negocioId, "reservas", folio),
      {
        ...reserva,
        folio,
        creadoEn: fechaCreacion,
        limiteRespuesta: limiteRespuesta,
      }
    );

    console.log("✅ Guardado en reservas_hechas:", folio);

  } catch (error) {
    console.error("❌ Error al guardar en ambos lados:", error);
    alert("Error al guardar la reservación. Intenta nuevamente.");
  }
}

// ==========================
// 🔹 Escuchar login y enviar formulario
// ==========================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("Debes iniciar sesión para hacer una reservación.");
    return;
  }

  const clienteId = (user.email || user.uid || "").toLowerCase().trim();
  const form = document.getElementById("formReserva");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fechaInput = document.getElementById("fecha").value;

    // 🔹 Conversión segura del input a Date
    let fechaTimestamp = null;
    if (fechaInput) {
      const partes = fechaInput.split("-");
      if (partes.length === 3) {
        fechaTimestamp = new Date(partes[0], partes[1] - 1, partes[2]);
      }
    }

    const negocioNombre = document.getElementById("negocio").value.trim();
    if (!negocioNombre) {
      alert("⚠️ No se ha podido obtener el nombre del negocio.");
      return;
    }

    const negocioIdNormalizado = negocioNombre.toLowerCase().replace(/\s+/g, "_");

    const reserva = {
      negocio: negocioNombre,
      evento: document.getElementById("evento").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      correoCliente: clienteId,
      fechaStr: fechaInput,
      fechaTimestamp: fechaTimestamp, // ✅ ahora siempre válido
      hora: document.getElementById("hora").value,
      ubicacion: document.getElementById("ubicacion").value.trim(),
      asistentes: document.getElementById("asistentes").value || "No especificado",
      creadoEn: new Date(),
      estado: "pendiente"
    };

    const proveedorId = getProveedorIdFromLocalStorage();
    if (!proveedorId) {
      console.warn("⚠️ No hay proveedorId en localStorage.");
      return;
    }

    await guardarReservaEnAmbosLados(proveedorId, negocioIdNormalizado, clienteId, reserva);

    alert("✅ Reservación guardada con éxito.");
    window.location.href = "misreservaciones.html";
  });
});
