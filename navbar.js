// Conexión a Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
const auth = getAuth();

(async () => {
  // Dropdown redirección
  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const categoria = item.dataset.categoria;
      if (categoria) {
        window.location.href = `negocios.html?categoria=${encodeURIComponent(categoria)}`;
      }
    });
  });

  // Mostrar botón hamburguesa si hay usuario
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const closeBtn = document.querySelector(".close-btn");

  // Mostrar siempre el botón
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const userData = localStorage.getItem("usuarioLogueado");
      if (userData) {
        sidebar.classList.add("active");
      } else {
        alert("Debes iniciar sesión para acceder a esta opción.");
      }
    });
  }

  // Cerrar panel lateral
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");
    });
  }

  // Mostrar datos del usuario
  const nombreUsuario = localStorage.getItem("nombreUsuario");
  const nombreSpan = document.getElementById("usuarioNombre");
  const correoSpan = document.getElementById("usuarioCorreo");
  const modoProveedorTexto = document.getElementById("modoProveedorTexto");
  const btnMisNegocios = document.getElementById("btnMisNegociosContainer");

  if (!nombreUsuario || !nombreSpan || !correoSpan) return;

  const userRef = doc(db, "usuarios", nombreUsuario);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    nombreSpan.textContent = data.usuario || nombreUsuario;
    correoSpan.textContent = data.correo || "No disponible";

    if (data.esProveedor) {
      modoProveedorTexto.style.display = "block";
      btnMisNegocios.style.display = "block";
    } else {
      modoProveedorTexto.style.display = "none";
      btnMisNegocios.style.display = "none";
    }
  } else {
    nombreSpan.textContent = nombreUsuario;
    correoSpan.textContent = "No disponible";
  }

  // Cerrar sesión
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", () => {
      signOut(auth).then(() => {
        localStorage.clear();
        setTimeout(() => {
          window.location.href = "index.html";
        }, 300);
      }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
        alert("Ocurrió un error al cerrar sesión. Inténtalo de nuevo.");
      });
    });
  }
})(); // ✅ cierre correcto del async IIFE
