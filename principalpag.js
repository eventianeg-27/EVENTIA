// ==========================
// 🔧 Conexión a Firebase
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

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
// 🔹 Redirigir según especialidad
// ==========================
window.redirigir = function (especialidad) {
  localStorage.setItem("especialidadSeleccionada", especialidad.trim());
  window.location.href = "negocios.html";
};

// ==========================
// Sidebar
// ==========================
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeBtn = sidebar?.querySelector(".close-btn");

if (menuBtn && sidebar && closeBtn) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    menuBtn.classList.add("hidden");
  });

  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("active");
    menuBtn.classList.remove("hidden");
  });
}

// ==========================
// Mostrar datos del usuario
// ==========================
document.addEventListener("DOMContentLoaded", async () => {
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  const nombreSpan = document.getElementById("usuarioNombre");
  const correoSpan = document.getElementById("usuarioCorreo");
  const modoProveedorTexto = document.getElementById("modoProveedorTexto");
  const btnMisNegocios = document.getElementById("btnMisNegociosContainer");
  const botonRegistro = document.getElementById("btnRegistroNegocio");

  if (!usuarioLogueado) return;

  if (nombreSpan) nombreSpan.textContent = usuarioLogueado.usuario || "No disponible";
  if (correoSpan) correoSpan.textContent = usuarioLogueado.correo || "No disponible";

  if (usuarioLogueado.esProveedor) {
    if (modoProveedorTexto) modoProveedorTexto.style.display = "block";
    if (btnMisNegocios) btnMisNegocios.style.display = "block";

    const negociosRef = collection(db, "usuarios", usuarioLogueado.correo, "negocios");
    const negociosSnap = await getDocs(negociosRef);

    if (!negociosSnap.empty && botonRegistro) {
      botonRegistro.textContent = "Agregar más negocios";
    }
  }

  localStorage.setItem("proveedorId", usuarioLogueado.correo);
});

// ==========================
// Cerrar sesión
// ==========================
const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
if (cerrarSesionBtn) {
  cerrarSesionBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.clear();
      window.location.href = "index.html";
    }).catch((error) => {
      console.error("Error al cerrar sesión:", error);
      alert("Ocurrió un error al cerrar sesión. Inténtalo de nuevo.");
    });
  });
}

// ==========================
// Validar cantidad de negocios
// ==========================
const btnRegistroNegocio = document.getElementById("btnRegistroNegocio");
if (btnRegistroNegocio) {
  btnRegistroNegocio.addEventListener("click", async () => {
    const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");

    if (!usuarioLogueado.correo) {
      alert("Debes iniciar sesión para registrar un negocio.");
      return;
    }

    const negociosRef = collection(db, "usuarios", usuarioLogueado.correo, "negocios");
    const negociosSnap = await getDocs(negociosRef);

    if (negociosSnap.size >= 2) {
      alert("Solo puedes registrar hasta 2 negocios.");
    } else {
      window.location.href = "NegoRegistro.html";
    }
  });
}

// ==========================
// Buscar categoría desde dropdown
// ==========================
document.querySelectorAll(".dropdown-item").forEach(item => {
  item.addEventListener("click", function (e) {
    e.preventDefault();
    const categoria = this.dataset.categoria;
    localStorage.setItem("especialidadSeleccionada", categoria.trim());
    window.location.href = `negocios.html?categoria=${encodeURIComponent(categoria)}`;
  });
});

// ==========================
// Carrusel negocios
// ==========================
let indiceActual = 0;
let totalSlides = 0;

async function cargarNegociosRecientes() {
  const contenedor = document.getElementById("contenedorCarrusel");
  contenedor.innerHTML = "";

  const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
  const negocios = [];

  for (const usuarioDoc of usuariosSnapshot.docs) {
    const usuarioId = usuarioDoc.id;
    const negociosRef = collection(db, "usuarios", usuarioId, "negocios");
    const negociosSnapshot = await getDocs(negociosRef);

    negociosSnapshot.forEach((negocioDoc) => {
      const negocioData = negocioDoc.data();
      if (negocioData.estado?.toLowerCase() === "aprobado") {
        negocios.push({
          ...negocioData,
          negocioId: negocioDoc.id,
          usuarioId,
        });
      }
    });
  }

  if (negocios.length === 0) {
    contenedor.innerHTML = `<div class="text-muted">No hay negocios registrados aún.</div>`;
    return;
  }

  negocios.sort((a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.());
  const recientes = negocios.slice(0, 10);

  recientes.forEach((negocio) => {
    const slide = document.createElement("div");
    slide.className = "card-slide";
    slide.innerHTML = `
      <div class="card-negocio" style="background-image: url('${negocio.urlImagen || 'https://via.placeholder.com/300x200'}');">
        <div class="foto-perfil-circular">
          <img src="${negocio.urlImagen || 'https://via.placeholder.com/100'}" alt="Perfil">
        </div>
        <div class="info-negocio">
          <h5 class="titulo-negocio">${negocio.negocio}</h5>
          <p class="descripcion-negocio">${negocio.descripcion || ''}</p>
        </div>
      </div>
    `;

    slide.addEventListener('click', () => {
      localStorage.setItem('negocioSeleccionado', negocio.negocioId);
      localStorage.setItem('usuarioNegocio', negocio.usuarioId);
      window.location.href = 'infoNegocio.html';
    });

    contenedor.appendChild(slide);
  });

  totalSlides = recientes.length;
  mostrarSlide(indiceActual);
}

function mostrarSlide(indice) {
  const contenedor = document.getElementById("contenedorCarrusel");
  const anchoSlide = contenedor.offsetWidth;
  contenedor.style.transition = "transform 0.5s ease-in-out";
  contenedor.style.transform = `translateX(-${indice * anchoSlide}px)`;
}

document.getElementById("flechaIzquierda").addEventListener("click", () => {
  indiceActual = (indiceActual - 1 + totalSlides) % totalSlides;
  mostrarSlide(indiceActual);
});

document.getElementById("flechaDerecha").addEventListener("click", () => {
  indiceActual = (indiceActual + 1) % totalSlides;
  mostrarSlide(indiceActual);
});

let intervalo;
function iniciarCarruselAuto() {
  intervalo = setInterval(() => {
    indiceActual = (indiceActual + 1) % totalSlides;
    mostrarSlide(indiceActual);
  }, 5000);
}

window.addEventListener("DOMContentLoaded", () => {
  cargarNegociosRecientes().then(iniciarCarruselAuto);
});

// ==========================
// 🔔 Notificaciones para el cliente
// ==========================
// ==========================
// 🔔 Escuchar cambios reales de reservas del cliente
// ==========================
function escucharCambiosReservasCliente(clienteCorreo) {
  const vistas = JSON.parse(localStorage.getItem("reservasVistas") || "[]");
  const campana = document.getElementById("notificacionIcono");
  const contador = document.getElementById("contadorReservas");

  // Ocultar por defecto
  if (campana) campana.style.display = "none";
  if (contador) contador.style.display = "none";

  onSnapshot(collection(db, "usuarios"), usuariosSnap => {
    const proveedores = usuariosSnap.docs.filter(d => d.data().esProveedor === true);

    proveedores.forEach(proveedorDoc => {
      const proveedorId = proveedorDoc.id;

      // Escuchar cada negocio del proveedor
      const reservasRecibidasRef = collection(db, "usuarios", proveedorId, "reservas_recibidas");
      getDocs(reservasRecibidasRef).then(reservasSnap => {
        reservasSnap.forEach(reservaDoc => {
          const negocioId = reservaDoc.id;

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

          onSnapshot(reservasRef, snapshot => {
            const nuevas = [];

            snapshot.forEach(rDoc => {
              const data = rDoc.data();
              // Detectar reservas con cambio de estado y no vistas
              if (data.estado !== "pendiente" && !data.vistoPorCliente) {
                nuevas.push(rDoc.id);
              }
            });

            // Mostrar notificación solo si hay nuevas no vistas
            if (nuevas.length > 0) {
              if (campana) campana.style.display = "inline-block";
              if (contador) {
                contador.style.display = "inline-block";
                contador.textContent = nuevas.length;
              }
            } else {
              if (campana) campana.style.display = "none";
              if (contador) contador.style.display = "none";
            }

            localStorage.setItem("reservasVistas", JSON.stringify(nuevas));
          });
        });
      });
    });
  }).catch(err => {
    console.error("Error al escuchar cambios de reservas:", err);
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  if (usuarioLogueado?.correo) {
    escucharCambiosReservasCliente(usuarioLogueado.correo);
  }
});
