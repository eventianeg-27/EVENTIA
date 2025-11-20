import { query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Función para verificar si un correo ya está en uso
async function correoYaRegistrado(correo) {
  const usuariosRef = collection(db, "usuarios");
  const q = query(usuariosRef, where("correo", "==", correo));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ✅ Configuración de Firebase corregida
const firebaseConfig = {
  apiKey: "AIzaSyBhX59jBh2tUkEnEGcb9sFVyW2zJe9NB_w",
  authDomain: "eventia-9ead3.firebaseapp.com",
  projectId: "eventia-9ead3",
  storageBucket: "eventia-9ead3.appspot.com",
  messagingSenderId: "313661648136",
  appId: "1:313661648136:web:1c9eb73bbb3f78994c90bd",
  measurementId: "G-RDLNL394MH"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.iniciarConGoogle = async function () {
  const provider = new GoogleAuthProvider();

  try {
    // Abrir ventana emergente
    const result = await signInWithPopup(auth, provider);

    // Datos del usuario de Google
    const user = result.user;
    const correo = user.email;

    // Verificar si el correo ya está registrado
    if (await correoYaRegistrado(correo)) {
      alert("Este correo ya está registrado. Inicia sesión con otra cuenta.");
      return;
    }

    let nombreOriginal = user.displayName?.trim();
    if (!nombreOriginal) {
      alert("No se pudo obtener el nombre del usuario desde Google.");
      return;
    }

    let nombreMinusculas = nombreOriginal.toLowerCase();
    const uid = user.uid;

    // Referencia al documento con el correo como ID
    let userDocRef = doc(db, "usuarios", correo);
    const docSnap = await getDoc(userDocRef);

    let userData = {
      usuario: nombreOriginal,            // 👉 nombre original
      usuarioMinusculas: nombreMinusculas, // 👉 para búsqueda
      correo: correo,
      esProveedor: false
    };

    if (!docSnap.exists()) {
      // Crear nuevo usuario
      await setDoc(userDocRef, userData);
    } else {
      // Si el correo ya existía (caso raro), actualizar datos
      await setDoc(userDocRef, userData, { merge: true });
    }

    // Guardar sesión en localStorage
    localStorage.setItem("nombreUsuario", correo); // ahora clave = correo
    localStorage.setItem("usuarioLogueado", JSON.stringify(userData));

    alert("Inicio de sesión con Google exitoso.");
    location.href = "principalpag.html";

  } catch (error) {
    console.error("Error con Google Auth:", error);
    if (error.code === "auth/popup-blocked") {
      alert("Tu navegador bloqueó la ventana de inicio de sesión. Intenta nuevamente.");
    } else if (error.code !== "auth/popup-closed-by-user") {
      alert("No se pudo iniciar sesión con Google.");
    }
  }
};

// Registro tradicional
window.submitUserOnly = async function () {
  let usuarioOriginal = document.getElementById("usuario").value.trim();
  let usuarioMinusculas = usuarioOriginal.toLowerCase();
  const correo = document.getElementById("correo").value.trim();
  const contraseña = document.getElementById("contraseña").value.trim();
  const confirmarContraseña = document.getElementById("confirmarContraseña").value.trim();
  const mensajeError = document.getElementById("mensaje-error");

  // Limpiar mensaje previo
  mensajeError.innerText = "";

  // Validar campos vacíos
  if (!usuarioOriginal || !correo || !contraseña || !confirmarContraseña) {
    mensajeError.innerText = "Por favor, completa todos los campos.";
    return;
  }

  // Validar confirmación de contraseña
  if (contraseña !== confirmarContraseña) {
    mensajeError.innerText = "Las contraseñas no coinciden.";
    return;
  }

  // Documento con el correo como ID
  const userDocRef = doc(db, "usuarios", correo);
  const userDocSnap = await getDoc(userDocRef);

  // Validar si ya existe ese correo
  if (userDocSnap.exists()) {
    mensajeError.innerText = "Este correo ya está registrado.";
    return;
  }

  // Validar correo en la colección
  if (await correoYaRegistrado(correo)) {
    mensajeError.innerText = "Este correo ya está registrado.";
    return;
  }

  try {
    const userData = {
      usuario: usuarioOriginal,
      usuarioMinusculas: usuarioMinusculas,
      correo: correo,
      contraseña: contraseña,
      esProveedor: false
    };

    // Crear usuario en Firestore
    await setDoc(userDocRef, userData);

    // Guardar sesión
    localStorage.setItem("nombreUsuario", correo);
    localStorage.setItem("usuarioLogueado", JSON.stringify(userData));

    alert("Usuario registrado correctamente.");
    location.href = "principalpag.html";
  } catch (error) {
    console.error("Error al registrar usuario: ", error);
    mensajeError.innerText = "Hubo un error al registrar. Intenta nuevamente.";
  }
};
