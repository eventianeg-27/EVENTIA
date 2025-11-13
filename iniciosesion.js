import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ✅ Configuración de Firebase corregida (del primer código)
const firebaseConfig = {
  apiKey: "AIzaSyBhX59jBh2tUkEnEGcb9sFVyW2zJe9NB_w",
  authDomain: "eventia-9ead3.firebaseapp.com",
  projectId: "eventia-9ead3",
  storageBucket: "eventia-9ead3.appspot.com", // corregido
  messagingSenderId: "313661648136",
  appId: "1:313661648136:web:1c9eb73bbb3f78994c90bd",
  measurementId: "G-RDLNL394MH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById("btnIniciarSesion").addEventListener("click", async (e) => {
  e.preventDefault();

  const usuarioOriginal = document.getElementById("username").value.trim();
  const contraseña = document.getElementById("password").value.trim();

  if (!usuarioOriginal || !contraseña) {
    alert("Por favor completa todos los campos.");
    return;
  }

  const usuarioMinusculas = usuarioOriginal.toLowerCase();

  // Buscar directamente por usuario (ya en minúsculas) y contraseña
  const q = query(
    collection(db, "usuarios"),
    where("usuarioMinusculas", "==", usuarioMinusculas),
    where("contraseña", "==", contraseña)
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userData = querySnapshot.docs[0].data();

    // Guardar datos en localStorage
    localStorage.setItem("nombreUsuario", usuarioMinusculas); 
    localStorage.setItem("usuarioLogueado", JSON.stringify(userData));

    // Verificar si el usuario venía desde "Reservar"
    const redirigir = localStorage.getItem("redirigirAReserva");

    if (redirigir === "true") {
      localStorage.removeItem("redirigirAReserva");
      window.location.href = "reservar.html";
    } else {
      window.location.href = "principalpag.html";
    }
  } else {
    alert("Nombre de usuario o contraseña incorrectos.");
  }
});

// Inicio de sesión con Google
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.getElementById("btnGoogle").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Buscar usuario por correo en la colección "usuarios"
    const usuariosRef = collection(db, "usuarios");
    const q = query(usuariosRef, where("correo", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Usuario encontrado: iniciar sesión
      const usuarioData = querySnapshot.docs[0].data();
      const nombreUsuario = usuarioData.usuario;

      localStorage.setItem("nombreUsuario", nombreUsuario);
      localStorage.setItem("usuarioLogueado", JSON.stringify(usuarioData));
      localStorage.setItem("userUID", user.uid);

      alert("Inicio de sesión con Google exitoso.");

      // Verificar si el usuario venía desde "Reservar"
      const redirigir = localStorage.getItem("redirigirAReserva");

      if (redirigir === "true") {
        localStorage.removeItem("redirigirAReserva");
        window.location.href = "reservar.html";
      } else {
        window.location.href = "principalpag.html";
      }

    } else {
      // Usuario no registrado: redirigir a página informativa
      localStorage.setItem("correoNoRegistrado", user.email);
      window.location.href = "no_hay_cuentaG.html";
    }
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    alert("Error al iniciar sesión con Google.");
  }
});
