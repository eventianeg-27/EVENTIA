import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async () => {
  const especialidadSeleccionada = (
    new URLSearchParams(window.location.search).get("categoria") ||
    localStorage.getItem("especialidadSeleccionada") ||
    ""
  ).trim();

  console.log("Especialidad seleccionada:", especialidadSeleccionada);

  const contenedor = document.getElementById("contenedorNegocios");
  const titulo = document.getElementById("tituloEspecialidad");

  if (titulo) titulo.textContent = especialidadSeleccionada;

  if (!especialidadSeleccionada || !contenedor) {
    console.error("Falta contenedor o especialidad");
    return;
  }

  contenedor.innerHTML = `<p class="text-center">Cargando negocios...</p>`;

  try {
    // Obtener todos los usuarios
    const usuariosSnap = await getDocs(collection(db, "usuarios"));
    contenedor.innerHTML = "";

    let hayNegocios = false;

    for (const usuarioDoc of usuariosSnap.docs) {
      const idUsuario = usuarioDoc.id;

      // Obtener negocios del usuario filtrados por especialidad
      const negociosQuery = query(
        collection(db, "usuarios", idUsuario, "negocios"),
        where("especialidad", "==", especialidadSeleccionada)
      );

      const negociosSnap = await getDocs(negociosQuery);

      for (const negocioDoc of negociosSnap.docs) {
        const negocio = negocioDoc.data();

        // Mostrar solo los negocios con estado = "aprobado"
        if (negocio.estado === "aprobado") {
          hayNegocios = true;

          // 📊 Calcular calificación promedio
          const calificacionesRef = collection(
            db,
            "usuarios",
            idUsuario,
            "negocios",
            negocioDoc.id,
            "calificaciones"
          );
          const calificacionesSnap = await getDocs(calificacionesRef);
          let promedio = 0;
          const total = calificacionesSnap.size;

          if (total > 0) {
            let suma = 0;
            calificacionesSnap.forEach(doc => suma += doc.data().estrella);
            promedio = (suma / total).toFixed(1);
          }

          // Crear tarjeta del negocio
          const card = document.createElement("div");
          card.classList.add("col-md-6", "col-lg-4");

          card.innerHTML = `
            <div class="negocio-card shadow-sm h-100" style="cursor: pointer;">
              <div class="negocio-img-container">
                <img src="${negocio.urlImagen || 'https://via.placeholder.com/400x200'}" 
                     alt="Foto del negocio" 
                     class="negocio-img" />
              </div>
              <div class="negocio-info text-center p-3">
                <h5 class="fw-bold mb-1">${negocio.negocio || "Negocio sin nombre"}</h5>
                <p class="text-muted mb-0">
                  <i class="bi bi-geo-alt-fill me-1"></i>
                  ${negocio.ubicacion || "Ubicación no especificada"}
                </p>
                <div class="mt-2">
                  <div class="estrellas" data-idusuario="${idUsuario}" data-idnegocio="${negocioDoc.id}">
                    ${generarEstrellas(promedio)}
                  </div>
                  <small class="text-secondary">${promedio ? promedio + " / 5" : "Sin calificaciones"}</small>
                </div>
              </div>
            </div>
          `;

          // 🎯 Evento para abrir perfil de negocio
          card.querySelector(".negocio-card").addEventListener("click", (e) => {
            if (e.target.classList.contains("bi-star") || e.target.classList.contains("bi-star-fill")) return;
            localStorage.setItem("negocioSeleccionado", negocioDoc.id);
            localStorage.setItem("usuarioNegocio", idUsuario);
            window.location.href = "infoNegocio.html";
          });

          // ⭐ Añadir evento de calificación
          const estrellas = card.querySelectorAll(".estrellas i");
          estrellas.forEach((estrella, index) => {
            estrella.addEventListener("click", async (e) => {
              e.stopPropagation();
              const user = JSON.parse(localStorage.getItem("usuarioLogueado"));
              if (!user) {
                alert("Debes iniciar sesión para calificar.");
                return;
              }

              const nuevaCalificacion = index + 1;
              const calificacionRef = collection(
                db,
                "usuarios",
                idUsuario,
                "negocios",
                negocioDoc.id,
                "calificaciones"
              );
              await addDoc(calificacionRef, {
                usuario: user.email || "anónimo",
                estrella: nuevaCalificacion,
                fecha: new Date()
              });

              alert(`Has calificado este negocio con ${nuevaCalificacion} estrella${nuevaCalificacion > 1 ? 's' : ''}.`);
              location.reload();
            });
          });

          contenedor.appendChild(card);
        }
      }
    }

    if (!hayNegocios) {
      contenedor.innerHTML = `<p class="text-center">No hay negocios aprobados en esta especialidad.</p>`;
    }

  } catch (error) {
    console.error("Error al cargar negocios:", error);
    contenedor.innerHTML = `<p class="text-danger text-center">Hubo un error al cargar los negocios.</p>`;
  }
});

// 🔹 Función auxiliar para generar las estrellas
function generarEstrellas(promedio) {
  let html = "";
  const rating = Math.round(promedio);
  for (let i = 1; i <= 5; i++) {
    html += `<i class="bi ${i <= rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'}"></i>`;
  }
  return html;
}
