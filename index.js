import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

// 🔔 Campanita y contador de actualizaciones
const auth = getAuth();
const campana = document.getElementById("notificacionCampana");
const indicador = document.getElementById("indicadorNotificacion");
const contadorElemento = document.getElementById("contadorActualizaciones");

let contadorActualizaciones = 0;

// Escucha cambios de reservas del cliente
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  const correoCliente = user.email;
  const reservasRef = collection(db, "usuarios", correoCliente, "reservas_hechas");
  const q = query(reservasRef, orderBy("fechaStr", "desc"));

  onSnapshot(q, (snapshot) => {
    let nuevas = 0;
    snapshot.docChanges().forEach(change => {
      const data = change.doc.data();
      if (change.type === "modified" && (data.estado === "aceptado" || data.estado === "rechazado")) {
        // Solo contar si no se ha marcado como vista
        if (!data.vistoPorCliente) nuevas++;
      }
    });

    if (nuevas > 0) {
      mostrarCampanita(nuevas);
    }
  });
});

function mostrarCampanita(cantidad) {
  contadorActualizaciones = cantidad;
  campana.style.display = "block";
  indicador.style.display = "block";
  contadorElemento.style.display = "inline-block";
  contadorElemento.textContent = contadorActualizaciones;

  // Animación simple
  indicador.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 800,
    iterations: Infinity,
  });

  campana.onclick = () => {
    // Cuando el usuario entra a mis reservaciones, se marca como vistas
    marcarReservasVistas().then(() => {
      campana.style.display = "none";
      indicador.style.display = "none";
      contadorElemento.style.display = "none";
      window.location.href = "misreservaciones.html";
    });
  };
}

// Marcar reservas como vistas (para que el contador se reinicie)
async function marcarReservasVistas() {
  const user = auth.currentUser;
  if (!user) return;
  const correoCliente = user.email;
  const reservasRef = collection(db, "usuarios", correoCliente, "reservas_hechas");
  const snapshot = await getDocs(reservasRef);

  snapshot.forEach(async docSnap => {
    const data = docSnap.data();
    if ((data.estado === "aceptado" || data.estado === "rechazado") && !data.vistoPorCliente) {
      const docRef = doc(db, "usuarios", correoCliente, "reservas_hechas", docSnap.id);
      await updateDoc(docRef, { vistoPorCliente: true });
    }
  });

  contadorActualizaciones = 0;
}
