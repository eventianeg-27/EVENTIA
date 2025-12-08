// ==========================
// 🔧 Conexión a Firebase
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

    if (usuarioLogueado.esProveedor) {
      if (modoProveedorTexto) modoProveedorTexto.style.display = "block";
      if (btnMisNegocios) btnMisNegocios.style.display = "block";

      const negociosRef = collection(db, "usuarios", usuarioLogueado.correo, "negocios");
      const negociosSnap = await getDocs(negociosRef);

      const cantidadNegocios = negociosSnap.size;
      const plan = (localStorage.getItem("planTexto") || "Básico").toLowerCase();

      let limite = 1;

      if (plan === "plus") limite = 2;
      if (plan === "premium") limite = 3;

      // 🔥 Mostrar botón SOLO si aún puede agregar
      if (botonRegistro) {
        if (cantidadNegocios < limite) {
          botonRegistro.style.display = "block";
          botonRegistro.textContent = cantidadNegocios === 0 ? "Registrar negocio" : "Agregar más negocios";
        } else {
          botonRegistro.style.display = "none";
        }
      }
    }


  }

  localStorage.setItem("proveedorId", usuarioLogueado.correo);


  // ==========================
  // 🟡 Mostrar plan elegido
  // ==========================
  const planElegido = localStorage.getItem("planTexto");

  // Mostrar plan elegido dentro del menú
  const btnPlanesMenu = document.getElementById("btnPlanesMenu");

  if (btnPlanesMenu && planElegido) {
    // Crear etiqueta debajo del botón
    const etiquetaPlan = document.createElement("p");
    etiquetaPlan.className = "text-center fw-bold mt-2 text-success";
    etiquetaPlan.textContent = "Plan actual: " + planElegido;

    btnPlanesMenu.appendChild(etiquetaPlan);
  }

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
// VALIDAR PLAN Y CANTIDAD DE NEGOCIOS
// ==========================
const btnRegistroNegocio = document.getElementById("btnRegistroNegocio");

if (btnRegistroNegocio) {
  btnRegistroNegocio.addEventListener("click", async () => {

    const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    const planTexto = localStorage.getItem("planTexto"); // 📌 Aquí detectamos si NO ha elegido plan

    // 1️⃣ Si NO hay sesión → enviar a iniciar sesión
    if (!usuarioLogueado.correo) {
      window.location.href = "iniciaRegis.html";
      return;
    }

    // 2️⃣ Si NO ha elegido un plan → enviar a planes.html
    if (!planTexto) {
      Swal.fire({
        icon: "info",
        title: "Elige un plan",
        text: "Debes seleccionar un plan antes de registrar negocios.",
        confirmButtonColor: "#3085d6"
      }).then(() => {
        window.location.href = "planes.html";
      });
      return;
    }

    // Plan del usuario
    const plan = planTexto.toLowerCase();

    // 3️⃣ Contamos negocios existentes
    const negociosRef = collection(db, "usuarios", usuarioLogueado.correo, "negocios");
    const negociosSnap = await getDocs(negociosRef);
    const cantidad = negociosSnap.size;

    // 4️⃣ Límites según plan
    let limite = 1;
    if (plan === "plus") limite = 2;
    if (plan === "premium") limite = 3;

    // Usuario puede agregar negocio
    if (cantidad < limite) {
      window.location.href = "negoregistro.html"; // Puede registrar
      return;
    }

    // ❌ Límite alcanzado → Mostrar alerta
    Swal.fire({
      icon: "error",
      title: "Límite alcanzado",
      html: `
        Tu plan <strong>${planTexto}</strong> permite un máximo de 
        <strong>${limite} negocio(s)</strong>.<br><br>
        Para agregar más negocios, mejora tu plan.
      `,
      confirmButtonText: "Ver planes",
      confirmButtonColor: "#d33",
    }).then(() => {
      window.location.href = "planes.html";
    });

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

    // 📌 **PRIORIDAD NUEVA DE IMÁGENES**
    const imgPrincipal =
      negocio.evidencias?.[0] ||
      negocio.urlImagen ||
      negocio.fotoPerfil ||
      "https://via.placeholder.com/300x200";

    const imgPerfil =
      negocio.fotoPerfil ||
      negocio.urlImagen ||
      negocio.evidencias?.[0] ||
      "https://via.placeholder.com/100";

    const slide = document.createElement("div");
    slide.className = "card-slide";
    slide.innerHTML = `
      <div class="card-negocio" style="background-image: url('${imgPrincipal}');">
        <div class="foto-perfil-circular">
          <img src="${imgPerfil}" alt="Perfil">
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
// 🔔 Notificaciones
// ==========================
function escucharCambiosReservasCliente(clienteCorreo) {
  const vistas = JSON.parse(localStorage.getItem("reservasVistas") || "[]");
  const campana = document.getElementById("notificacionIcono");
  const contador = document.getElementById("contadorReservas");

  if (campana) campana.style.display = "none";
  if (contador) contador.style.display = "none";

  try {
    onSnapshot(collection(db, "usuarios"), usuariosSnap => {
      const proveedores = usuariosSnap.docs.filter(d => d.data().esProveedor === true);

      proveedores.forEach(proveedorDoc => {
        const proveedorId = proveedorDoc.id;

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
                if (data.estado !== "pendiente" && !data.vistoPorCliente) {
                  nuevas.push(rDoc.id);
                }
              });

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
    });
  } catch (err) {
    console.error("Error al escuchar cambios de reservas:", err);
  }

}

document.addEventListener("DOMContentLoaded", () => {
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  if (usuarioLogueado?.correo) {
    escucharCambiosReservasCliente(usuarioLogueado.correo);
  }
});
