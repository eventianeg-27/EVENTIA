import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";


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
const db = getFirestore(app);

// ==========================
// Carrusel de negocios aprobados
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
    const negociosSnapshot = await getDocs(query(negociosRef, orderBy("timestamp", "desc")));

    negociosSnapshot.forEach((negocioDoc) => {
      const negocioData = negocioDoc.data();

      // Solo mostrar los negocios aprobados
      if (negocioData.estado === "aprobado") {
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

  // Solo los 10 más recientes
  negocios.sort((a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.());
  const recientes = negocios.slice(0, 10);

  recientes.forEach((negocio) => {
    const slide = document.createElement("div");
    slide.className = "card-slide";
    slide.innerHTML = `
      <div class="card-negocio" style="background-image: url('${(negocio.evidencias?.[0]) || negocio.urlImagen || negocio.fotoPerfil || 'https://via.placeholder.com/300x200'}');">
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

//Auto desplazamiento
let intervalo;
function iniciarCarruselAuto() {
  intervalo = setInterval(() => {
    if (indiceActual < totalSlides - 1) {
      indiceActual++;
      mostrarSlide(indiceActual);
    } else {
      indiceActual++;
      mostrarSlide(indiceActual);

      setTimeout(() => {
        const contenedor = document.getElementById("contenedorCarrusel");
        contenedor.style.transition = "none";
        indiceActual = 0;
        contenedor.style.transform = `translateX(-${indiceActual * contenedor.offsetWidth}px)`;

        void contenedor.offsetWidth;
        contenedor.style.transition = "transform 0.5s ease-in-out";
      }, 500);
    }
  }, 5000);
}

// Iniciar automáticamente
window.addEventListener("DOMContentLoaded", () => {
  cargarNegociosRecientes().then(iniciarCarruselAuto);

  // ==========================
  // Contadores de negocios por estado
  // ==========================
  async function contarNegociosPorEstado() {
    const usuariosSnap = await getDocs(collection(db, "usuarios"));

    let totalAprobados = 0;
    let totalPendientes = 0;
    let totalRechazados = 0;

    for (const usuario of usuariosSnap.docs) {
      const negociosSnap = await getDocs(collection(db, `usuarios/${usuario.id}/negocios`));
      negociosSnap.forEach((negocioDoc) => {
        const data = negocioDoc.data();
        switch (data.estado) {
          case "aprobado":
            totalAprobados++;
            break;
          case "pendiente":
            totalPendientes++;
            break;
          case "rechazado":
            totalRechazados++;
            break;
        }
      });
    }

    // Mostrar los resultados si existen los elementos en el HTML
    const contAprobados = document.getElementById("count-aprobados");
    const contPendientes = document.getElementById("count-pendientes");
    const contRechazados = document.getElementById("count-rechazados");

    if (contAprobados) contAprobados.textContent = totalAprobados;
    if (contPendientes) contPendientes.textContent = totalPendientes;
    if (contRechazados) contRechazados.textContent = totalRechazados;
  }

  // Ejecutar los contadores junto al carrusel
  window.addEventListener("DOMContentLoaded", () => {
    cargarNegociosRecientes().then(iniciarCarruselAuto);
    contarNegociosPorEstado();
  });

});


document.querySelectorAll(".dropdown-item").forEach(item => {
  item.addEventListener("click", function (e) {
    e.preventDefault();
    const categoria = this.dataset.categoria;
    window.location.href = `negocios.html?categoria=${encodeURIComponent(categoria)}`;
  });
});
