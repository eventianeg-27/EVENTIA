import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async () => {
    const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    const proveedorId = (usuarioLogueado.correo || "").trim().toLowerCase();
    const contenedor = document.getElementById("negociosContainer");

    if (!proveedorId) {
        contenedor.innerHTML = "<p>No se encontró un usuario válido. Inicia sesión.</p>";
        return;
    }

    try {
        const negociosRef = collection(db, "usuarios", proveedorId, "negocios");
        const snapshot = await getDocs(negociosRef);

        contenedor.innerHTML = "";

        if (snapshot.empty) {
            contenedor.innerHTML = "<p>No tienes negocios registrados.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const negocio = doc.data();
            const negocioId = doc.id;

            const card = document.createElement("div");
            card.className = "col-md-4";

            card.innerHTML = `
                <div class="card card-negocio text-center p-3 shadow-sm">
                    <img src="${negocio.urlImagen || 'https://via.placeholder.com/150'}"
                         alt="Logo del negocio"
                         class="logo-negocio mx-auto mb-3"
                         style="max-height:150px; object-fit:contain;" />
                    <h5 class="card-title mb-3">${negocio.negocio || "Negocio sin nombre"}</h5>
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary btn-perfil">Mi Perfil</button>
                        <button class="btn btn-success btn-reservas">Reservas Recibidas</button>
                    </div>
                </div>
            `;

            // 👉 Botón para ir a perfilNegocio
            card.querySelector(".btn-perfil").addEventListener("click", () => {
                localStorage.setItem("negocioId", negocioId);
                window.location.href = "perfilNegocio.html";
            });

            // 👉 Botón para ir a reservas_recibidas
            card.querySelector(".btn-reservas").addEventListener("click", () => {
                localStorage.setItem("negocioId", negocioId);
                window.location.href = "reservas_recibidas.html";
            });

            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error al obtener los negocios:", error);
        contenedor.innerHTML = "<p>Ocurrió un error al cargar los negocios.</p>";
    }
});
