import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  updateDoc
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

const contenedor = document.getElementById("contenedorReservas");
let reservasCliente = [];

// ==========================
// 📊 Renderizar reservas
// ==========================
function renderReservas(reservas) {
  contenedor.innerHTML = "";

  if (reservas.length === 0) {
    contenedor.innerHTML = `<div class="col-12 text-center text-muted">No tienes reservaciones registradas.</div>`;
    return;
  }

  reservas.forEach(({ id, negocio, data, estado, urlImagen }) => {
    contenedor.innerHTML += `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="reserva-card text-center p-3 shadow-sm rounded-4" style="background: #fff;">
          <img 
            src="${urlImagen || 'https://via.placeholder.com/150'}" 
            class="img-fluid mb-3"
            style="
              width: 120px; 
              height: 120px; 
              object-fit: cover; 
              border-radius: 50%; 
              border: 3px solid #d4af37; 
              box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            "
            alt="Imagen negocio"
          >
          <h5 class="mt-2"><strong>Negocio:</strong> ${negocio}</h5>
          <p><strong>Folio:</strong> ${data.folio || "-"}</p>
          <span class="estado ${estado}" 
            style="
              display:inline-block; 
              padding:4px 10px; 
              border-radius:12px; 
              font-weight:bold; 
              text-transform: capitalize;
              margin-bottom: 10px;
            ">
            ${estado}
          </span>
          <p><strong>Evento:</strong> ${data.evento || "-"}</p>
          <p><strong>Fecha:</strong> ${data.fechaStr || "-"}</p>
          <p><strong>Hora:</strong> ${data.hora || "-"}</p>
          <p><strong>Ubicación:</strong> ${data.ubicacion || "-"}</p>
          <p><strong>Teléfono:</strong> ${data.telefono || "-"}</p>
          <p><strong>Asistentes:</strong> ${data.asistentes || "-"}</p>
        </div>
      </div>
    `;
  });
}

// ==========================
// 🔁 Cargar reservas del usuario
// ==========================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    contenedor.innerHTML = `<div class="col-12 text-center text-danger">Debes iniciar sesión para ver tus reservaciones.</div>`;
    return;
  }

  const clienteCorreo = user.email.toLowerCase().trim();
  reservasCliente = [];

  try {
    const usuariosSnap = await getDocs(collection(db, "usuarios"));
    const proveedores = usuariosSnap.docs.filter(doc => doc.data().esProveedor === true);

    for (const proveedorDoc of proveedores) {
      const proveedorId = proveedorDoc.id;
      const reservasRecibidasRef = collection(db, "usuarios", proveedorId, "reservas_recibidas");
      const reservasSnap = await getDocs(reservasRecibidasRef);

      for (const reservaDoc of reservasSnap.docs) {
        const negocioId = reservaDoc.id;

        // 🔹 Buscar directamente las reservas usando clienteCorreo como ID
        const reservasRef = collection(
          db,
          "usuarios",
          proveedorId,
          "reservas_recibidas",
          negocioId,
          "clientes",
          clienteCorreo,
          "reservas"
        );

        onSnapshot(reservasRef, async snapshot => {
          let urlImagen = "";
          try {
            const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioId);
            const negocioSnap = await getDoc(negocioRef);
            if (negocioSnap.exists()) urlImagen = negocioSnap.data().urlImagen || "";
          } catch (err) {
            console.warn("No se pudo obtener la imagen del negocio:", err);
          }

          snapshot.docs.forEach(rDoc => {
            const data = rDoc.data();
            const reservaObj = {
              id: rDoc.id,
              negocio: negocioId,
              data,
              estado: data.estado || "pendiente",
              urlImagen
            };

            const index = reservasCliente.findIndex(r => r.id === rDoc.id);
            if (index > -1) reservasCliente[index] = reservaObj;
            else reservasCliente.push(reservaObj);
          });

          // 🔽 NUEVO: ordenar para que la más reciente quede primero
          reservasCliente.sort((a, b) => {
            const fechaA = a.data.fechaRegistro ? new Date(a.data.fechaRegistro) : 0;
            const fechaB = b.data.fechaRegistro ? new Date(b.data.fechaRegistro) : 0;
            return fechaB - fechaA;
          });

          renderReservas(reservasCliente);
        });
      }
    }

    // ✅ Marcar todas las reservas como vistas cuando el cliente entra aquí
    await marcarReservasComoVistas(clienteCorreo);

    // ✅ Limpiar las notificaciones locales
    localStorage.removeItem("reservasVistas");
    localStorage.removeItem("contadorReservas");
    console.log("🔔 Notificaciones locales eliminadas correctamente.");

  } catch (err) {
    console.error("Error al cargar reservaciones:", err);
    contenedor.innerHTML = `<div class="col-12 text-center text-danger">Error al cargar reservaciones.</div>`;
  }
});

// ==========================
// ✅ Marcar reservas como vistas en Firestore
// ==========================
async function marcarReservasComoVistas(correoCliente) {
  try {
    const usuariosSnap = await getDocs(collection(db, "usuarios"));
    for (const proveedorDoc of usuariosSnap.docs) {
      const proveedorId = proveedorDoc.id;
      const reservasRecibidasRef = collection(db, "usuarios", proveedorId, "reservas_recibidas");
      const reservasSnap = await getDocs(reservasRecibidasRef);

      for (const reservaDoc of reservasSnap.docs) {
        const negocioId = reservaDoc.id;

        const reservasRef = collection(
          db,
          "usuarios",
          proveedorId,
          "reservas_recibidas",
          negocioId,
          "clientes",
          correoCliente,
          "reservas"
        );

        const reservasSnap2 = await getDocs(reservasRef);
        for (const rDoc of reservasSnap2.docs) {
          const data = rDoc.data();
          if (data.estado !== "pendiente" && !data.vistoPorCliente) {
            const reservaRef = doc(reservasRef, rDoc.id);
            await updateDoc(reservaRef, { vistoPorCliente: true });
          }
        }
      }
    }
    console.log("✅ Reservas marcadas como vistas en Firestore.");
  } catch (err) {
    console.error("Error al marcar reservas como vistas:", err);
  }
}
