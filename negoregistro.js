import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ Configuración de Firebase (del primer código)
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

// ✅ Mostrar el plan elegido
document.addEventListener("DOMContentLoaded", () => {
  const plan = localStorage.getItem('planSeleccionado');
  if (plan) {
    const planElemento = document.getElementById('planElegido');
    if (planElemento) {
      planElemento.textContent = `Plan elegido: ${plan}`;
    }
  }
});

// Establecer proveedorId si no existe pero nombreUsuario sí
if (!localStorage.getItem("proveedorId") && localStorage.getItem("usuarioLogueado")) {
  localStorage.setItem("proveedorId", localStorage.getItem("usuarioLogueado").toLowerCase());
}


// Subir archivo a Cloudinary y devolver la URL (del primer código)
async function subirImagenACloudinary(file, proveedorId) {
  const esVideo = file.type.startsWith("video/");
  const tipo = esVideo ? "video" : "image";

  const url = `https://api.cloudinary.com/v1_1/dfokhncek/${tipo}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "Eventia");
  formData.append("folder", `eventia/${proveedorId}`);

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!response.ok) throw new Error("Error al subir archivo a Cloudinary");

  const data = await response.json();
  return data.secure_url;
}

// Variables para URL de imagen de perfil y evidencias
let imagenPerfilUrl = "";
const evidenciasUrls = [];

// Variables para la imagen de la fachada del negocio
let imagenFachadaUrl = "";
let archivoImagenFachada = null;

// Variables necesarias para almacenar los archivos seleccionados
let archivoImagenPerfil = null;
const archivosEvidencias = [];


// 🔗 Variable global para guardar el link de Google Maps
let ubicacionLink = "";

// Cuando el usuario haga clic en "Ver en Maps"
document.getElementById("verEnMapa").addEventListener("click", () => {
  const ubicacionTexto = document.getElementById("ubicacion").value.trim();
  if (!ubicacionTexto) {
    alert("Por favor, ingresa una ubicación antes de abrir Google Maps.");
    return;
  }

  // Codificar texto y generar URL de búsqueda en Maps
  ubicacionLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacionTexto)}`;

  // Abrir nueva pestaña con la ubicación
  window.open(ubicacionLink, "_blank");

  // Mostrar enlace en la página
  const linkEl = document.getElementById("mapLink");
  const linkText = document.getElementById("mapLinkText");
  linkEl.href = ubicacionLink;
  linkText.style.display = "block";
});


// Botón registrar
document.getElementById("btnRegistro").addEventListener("click", async () => {
  const proveedorId = localStorage.getItem("proveedorId")?.trim();
  if (!proveedorId) return alert("No se encontró proveedor. Inicia sesión nuevamente.");

  // Subir imagen de perfil si se seleccionó
  if (archivoImagenPerfil) {
    try {
      imagenPerfilUrl = await subirImagenACloudinary(archivoImagenPerfil, proveedorId);
    } catch (error) {
      console.error("Error al subir imagen de perfil:", error);
      return alert("Error al subir la imagen de perfil.");
    }
  }


  // Subir imagen de perfil si se seleccionó
  if (archivoImagenPerfil) {
    try {
      imagenPerfilUrl = await subirImagenACloudinary(archivoImagenPerfil, proveedorId);
    } catch (error) {
      console.error("Error al subir imagen de perfil:", error);
      return alert("Error al subir la imagen de perfil.");
    }
  }

  // ✅ Subir imagen de fachada si se seleccionó
  if (archivoImagenFachada) {
    try {
      imagenFachadaUrl = await subirImagenACloudinary(archivoImagenFachada, proveedorId);
    } catch (error) {
      console.error("Error al subir imagen de fachada:", error);
      return alert("Error al subir la imagen de la fachada del negocio.");
    }
  }


  // Subir evidencias
  evidenciasUrls.length = 0; // limpiar
  for (const file of archivosEvidencias) {
    try {
      const url = await subirImagenACloudinary(file, proveedorId);
      evidenciasUrls.push(url);
    } catch (error) {
      console.error("Error al subir evidencia:", error);
      return alert("Error al subir una de las evidencias.");
    }
  }

  const negocio = document.getElementById("negocio").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const ubicacionTexto = document.getElementById("ubicacion").value.trim();
  const especialidad = document.getElementById("especialidad").value;
  const descripcion = document.getElementById("descripcion").value.trim();

  const horaApertura = document.getElementById("horaApertura").value;
  const horaCierre = document.getElementById("horaCierre").value;

  // Obtener los días seleccionados
  const diasSeleccionados = [];
  [
    "diaLunes", "diaMartes", "diaMiercoles",
    "diaJueves", "diaViernes", "diaSabado", "diaDomingo"
  ].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox.checked) diasSeleccionados.push(checkbox.value);
  });

  // Validación: debe elegir al menos un día
  if (diasSeleccionados.length === 0) {
    return alert("Por favor, selecciona al menos un día en que el negocio abre.");
  }


  // Validación simple
  if (!horaApertura || !horaCierre) {
    return alert("Por favor, seleccione las horas de apertura y cierre.");
  }

  const horario = `${horaApertura} - ${horaCierre}`;
  const montoInicial = parseFloat(document.getElementById("montoInicial").value);

  const redesSociales = [];
  const usuariosRedes = {};
  ["facebook", "instagram", "otro"].forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox.checked) {
      redesSociales.push(checkbox.value);
      const input = document.querySelector(`#usuario-${id}`);
      if (input) usuariosRedes[checkbox.value] = input.value.trim();
    }
  });


  const referenciaUbicacion = document.getElementById("referencias").value.trim();

  const nuevoNegocio = {
    negocio,
    telefono,
    ubicacion: ubicacionTexto,
    ubicacionLink, // Guardar el enlace a Google Maps
    especialidad,
    descripcion,
    diasAbierto: diasSeleccionados,
    horaApertura: horaApertura,   
    horaCierre: horaCierre,   
    montoInicial,
    referenciaUbicacion,
    urlImagen: imagenPerfilUrl,
    urlFachada: imagenFachadaUrl, // Guardar URL de la fachada
    redesSociales,
    usuariosRedes,
    evidencias: evidenciasUrls,
    timestamp: new Date(),  // Marca temporal de registro
    validado: false         // Campo para moderación
  };

  try {
    const negocioId = negocio.toLowerCase().replace(/\s+/g, "_");
    const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioId);
    await setDoc(negocioRef, nuevoNegocio);

    // Marcar al usuario como proveedor
    await setDoc(doc(db, "usuarios", proveedorId), {
      esProveedor: true
    }, { merge: true });


    // También actualizar el objeto usuarioLogueado
    let usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    usuarioLogueado.esProveedor = true;
    localStorage.setItem("usuarioLogueado", JSON.stringify(usuarioLogueado));



    // También actualizar localStorage inmediatamente
    //localStorage.setItem("esProveedor", "true");

    alert("Negocio registrado correctamente.");
    window.location.href = "misNegocios.html";
  } catch (error) {
    console.error("Error al registrar negocio:", error);
    alert("Error al registrar el negocio. Intenta nuevamente.");
  }
});

// Vista previa y subida de imagen de perfil
document.getElementById("fotoPerfil").addEventListener("change", async (event) => {
  try {
    archivoImagenPerfil = event.target.files[0];
    if (!archivoImagenPerfil) return;

    const preview = document.getElementById("previewImagen");
    preview.src = URL.createObjectURL(archivoImagenPerfil);
    preview.style.display = "block";

  } catch (error) {
    console.error("Error al subir imagen de perfil:", error);
    alert("No se pudo subir la imagen de perfil.");
  }
});


// Vista previa y subida de imagen de perfil
document.getElementById("fotoPerfil").addEventListener("change", async (event) => {
  try {
    archivoImagenPerfil = event.target.files[0];
    if (!archivoImagenPerfil) return;

    const preview = document.getElementById("previewImagen");
    preview.src = URL.createObjectURL(archivoImagenPerfil);
    preview.style.display = "block";

  } catch (error) {
    console.error("Error al subir imagen de perfil:", error);
    alert("No se pudo subir la imagen de perfil.");
  }
});

// ✅ Vista previa y subida de imagen de la fachada
document.getElementById("fotoFachada").addEventListener("change", async (event) => {
  try {
    archivoImagenFachada = event.target.files[0];
    if (!archivoImagenFachada) return;

    const preview = document.getElementById("previewFachadaImg");
    preview.src = URL.createObjectURL(archivoImagenFachada);
    preview.style.display = "block";
  } catch (error) {
    console.error("Error al cargar imagen de fachada:", error);
    alert("No se pudo mostrar la imagen de la fachada.");
  }
});


// Agregar evidencia multimedia
document.getElementById("agregarEvidencia").addEventListener("click", () => {
  if (archivosEvidencias.length >= 3) {
    alert("Solo puedes agregar hasta 3 imágenes y/o vídeos.");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*";
  input.style.display = "none";

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (archivosEvidencias.length >= 3) {
      alert("Límite de 3 evidencias alcanzado.");
      return;
    }

    archivosEvidencias.push(file);

    const wrapper = document.createElement("div");
    wrapper.className = "evidencia-wrapper me-2 mb-2";

    const elemento = document.createElement(file.type.startsWith("image/") ? "img" : "video");
    elemento.src = URL.createObjectURL(file);
    elemento.className = "evidencia-item";

    if (file.type.startsWith("video/")) elemento.controls = true;

    const eliminarBtn = document.createElement("button");
    eliminarBtn.textContent = "✕";
    eliminarBtn.title = "Eliminar evidencia";
    eliminarBtn.className = "btn btn-sm btn-danger";

    eliminarBtn.addEventListener("click", () => {
      const index = archivosEvidencias.indexOf(file);
      if (index !== -1) archivosEvidencias.splice(index, 1);
      wrapper.remove();
    });

    wrapper.appendChild(elemento);
    wrapper.appendChild(eliminarBtn);
    document.getElementById("contenedorEvidencias").appendChild(wrapper);
  });

  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
});

// Mostrar campo de usuario de red social al marcar checkbox
window.mostrarCampoRed = function (checkbox) {
  const contenedor = document.getElementById("camposRedes");
  const idCampo = `usuario-${checkbox.id}`;

  if (checkbox.checked) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control mb-2";
    input.id = idCampo;
    input.name = checkbox.value;
    input.placeholder = `Usuario en ${checkbox.value}`;
    contenedor.appendChild(input);
  } else {
    const input = document.getElementById(idCampo);
    if (input) contenedor.removeChild(input);
  }
};

// Botón cancelar
document.getElementById("btnCancelar").addEventListener("click", () => {
  if (confirm("¿Estás seguro de cancelar el registro? Se perderán los datos ingresados.")) {
    window.location.href = "principalpag.html";
  }
});
