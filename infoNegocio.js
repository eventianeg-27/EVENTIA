import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Configuración de Firebase corregida (del primer código)
const firebaseConfig = {
  apiKey: "AIzaSyBhX59jBh2tUkEnEGcb9sFVyW2zJe9NB_w",
  authDomain: "eventia-9ead3.firebaseapp.com",
  projectId: "eventia-9ead3",
  storageBucket: "eventia-9ead3.firebasestorage.app",
  messagingSenderId: "313661648136",
  appId: "1:313661648136:web:1c9eb73bbb3f78994c90bd",
  measurementId: "G-RDLNL394MH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const div = document.getElementById("contenidoNegocio");
const galeriaDiv = document.getElementById("galeriaNegocio");
const negocioId = localStorage.getItem("negocioSeleccionado")?.trim();
const proveedorId = localStorage.getItem("usuarioNegocio")?.trim();

if (!negocioId || !proveedorId) {
  div.innerHTML = "<p>No hay datos válidos del negocio.</p>";
} else {
  const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioId);

  getDoc(negocioRef).then(docSnap => {
    if (docSnap.exists()) {
      const datos = docSnap.data();

      localStorage.setItem("categoriaNegocioActual", datos.especialidad || "");

      const redesHTML = Array.isArray(datos.redesSociales)
        ? datos.redesSociales.map(red => {
          const enlace = datos.usuariosRedes?.[red] || "";
          return enlace
            ? `<li><strong>${red}:</strong> <a href="${enlace}" target="_blank">${enlace}</a></li>`
            : `<li><strong>${red}</strong></li>`;
        }).join("")
        : "";

      div.innerHTML = `
        <div class="d-flex align-items-center mb-4">
          <img src="${datos.urlImagen}" alt="Foto de perfil" class="rounded-circle me-3" style="width: 100px; height: 100px; object-fit: cover;" />
          <h4 class="mb-0">${datos.negocio}</h4>
        </div>
        <p><strong>Teléfono:</strong> ${datos.telefono}</p>
        <p><strong>Ubicación:</strong> 
          ${datos.ubicacionLink
          ? `<a href="${datos.ubicacionLink}" target="_blank">${datos.ubicacion}</a>`
          : (datos.ubicacion || 'No disponible')}
        </p>

        ${datos.referenciaUbicacion
          ? `<p><strong>Referencia de ubicación:</strong> ${datos.referenciaUbicacion}</p>`
          : ''}

        ${datos.urlFachada
          ? `<div class="mt-3 text-center">
             <h5 class="text-primary mb-2"><i class="bi bi-shop me-2"></i>Fachada del negocio</h5>
             <img src="${datos.urlFachada}" 
                  alt="Fachada del negocio" 
                  class="img-fluid rounded shadow-sm" 
                  style="max-width: 400px; border-radius: 10px; margin-bottom: 30px;"/>
        </div>`
     : ''}
    
        <p><strong>Especialidad:</strong> ${datos.especialidad}</p>
        <p><strong>Descripción:</strong> ${datos.descripcion}</p>
        <p><strong>Horario:</strong> ${datos.horario}</p>
        <h5>Redes Sociales:</h5>
        <ul>${redesHTML}</ul>
        <p><strong>Monto Inicial:</strong> $${datos.montoInicial}</p>
        
      `;

      // Mostrar galería a la izquierda
      if (galeriaDiv) {
        galeriaDiv.innerHTML = ""; // Limpiar antes de insertar

        if (Array.isArray(datos.evidencias) && datos.evidencias.length > 0) {
          datos.evidencias.forEach(url => {
            const col = document.createElement("div");
            col.className = "col-6 mb-2";

            if (url.match(/\.(mp4|webm|ogg)$/)) {
              col.innerHTML = `<video src="${url}" controls class="img-fluid rounded shadow-sm"></video>`;
            } else {
              col.innerHTML = `<img src="${url}" class="img-fluid rounded shadow-sm" alt="Imagen del negocio">`;
            }

            galeriaDiv.appendChild(col);
          });
        } else {
          galeriaDiv.innerHTML = "<p class='text-muted'>Sin imágenes disponibles.</p>";
        }
      }



    } else {
      div.innerHTML = "<p>No se encontró información del negocio.</p>";
    }
  }).catch(error => {
    console.error("Error al obtener datos:", error);
    div.innerHTML = "<p>Error al cargar los datos del negocio.</p>";
  });
}

// Acción para el botón RESERVAR
window.irAReservar = () => {
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
  const negocioId = localStorage.getItem("negocioSeleccionado")?.trim();
  const proveedorId = localStorage.getItem("usuarioNegocio")?.trim();

  // Guardar con las claves que reservar.js espera
  if (negocioId && proveedorId) {
    localStorage.setItem("negocioId", negocioId);
    localStorage.setItem("usuarioId", proveedorId);
  } else {
    console.warn("Faltan datos del negocio o proveedor");
  }

  if (usuarioLogueado && usuarioLogueado.correo) {
    window.location.href = "reservar.html";
  } else {
    localStorage.setItem("redirigirAReserva", "true");
    window.location.href = "IniciaRegis.html";
  }
};

// Lógica para el botón Regresar
const btnRegresar = document.getElementById("btnRegresar");
if (btnRegresar) {
  btnRegresar.addEventListener("click", () => {
    const userData = localStorage.getItem("usuarioLogueado");

    if (userData) {
      window.location.href = "negocios.html";
    } else {
      window.location.href = "index.html";
    }
  });
}
