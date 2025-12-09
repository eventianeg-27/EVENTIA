import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc,        // 🔥 NECESARIO
  collection
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⭐⭐⭐ AGREGA AQUÍ la función global SweetAlert ⭐⭐⭐
function mostrarAlerta(titulo, texto, icono = "warning", redirigir = false) {
  Swal.fire({
    title: titulo,
    text: texto,
    icon: icono,
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#3085d6",
  }).then((result) => {
    if (redirigir && result.isConfirmed) {
      window.location.href = "planes.html";
    }
  });
}



//  Configuración de Firebase (del primer código)
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


// Mostrar el plan elegido
const planTexto = localStorage.getItem("planTexto");
if (planTexto) {
  const planElemento = document.getElementById("planElegido");
  if (planElemento) {
    planElemento.textContent = `Plan elegido: ${planTexto}`;
  }
}


// 🔥 Si el usuario viene de SEGUIR EDITANDO, NO borrar el negocioEnEdicion
const negocioEnEdicion = localStorage.getItem("negocioEnEdicion");

// Si ya existe negocio en edición, lo mantenemos para que cargue los datos
if (negocioEnEdicion) {
  console.log("Manteniendo negocio en edición:", negocioEnEdicion);
} else {
  // Si NO existe, es un nuevo registro → limpiar
  localStorage.removeItem("negocioEnEdicion");
}



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


// -----------------------
// Estado para especialidades
// -----------------------
let MAX_SERVICIOS = 1;
let serviciosState = [];
const serviciosContainer = document.getElementById("especialidadesContainer");
const btnAgregarServicio = document.getElementById("btnAgregarEspecialidad");


// -------------------
//  AJUSTAR LÍMITE SEGÚN EL PLAN
// -------------------

document.addEventListener("DOMContentLoaded", async () => {

  // ======================================
  // 🔥 Cargar negocio en edición
  // ======================================
  const proveedorId = localStorage.getItem("proveedorId");
  const negocioEnEdicion = localStorage.getItem("negocioEnEdicion");

  if (proveedorId && negocioEnEdicion) {
    try {
      const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioEnEdicion);
      const snap = await getDoc(negocioRef);

      if (snap.exists()) {
        const data = snap.data();

        // Rellenar datos
        document.getElementById("negocio").value = data.negocio || "";
        document.getElementById("telefono").value = data.telefono || "";
        document.getElementById("ubicacion").value = data.ubicacion || "";

        if (data.urlImagen) {
          const preview = document.getElementById("previewImagen");
          preview.src = data.urlImagen;
          preview.style.display = "block";
          imagenPerfilUrl = data.urlImagen;
        }

        if (data.urlFachada) {
          const preview = document.getElementById("previewFachada");
          preview.src = data.urlFachada;
          preview.style.display = "block";
          imagenFachadaUrl = data.urlFachada;
        }

        // Horarios
        document.getElementById("horaApertura").value = data.horaApertura || "";
        document.getElementById("horaCierre").value = data.horaCierre || "";

        // Días
        const diasIds = {
          "Lunes": "diaLunes",
          "Martes": "diaMartes",
          "Miércoles": "diaMiercoles",
          "Jueves": "diaJueves",
          "Viernes": "diaViernes",
          "Sábado": "diaSabado",
          "Domingo": "diaDomingo"
        };
        (data.diasAbierto || []).forEach(d => {
          if (diasIds[d]) document.getElementById(diasIds[d]).checked = true;
        });

        // Redes sociales
        if (data.redesSociales) {
          data.redesSociales.forEach(red => {
            document.getElementById(red).checked = true;

            const input = document.getElementById(`usuario-${red}`);
            if (input && data.usuariosRedes?.[red]) {
              input.value = data.usuariosRedes[red];
            }
          });
        }

        // Precios
        document.getElementById("precioMin").value = data.precios?.precioMin || "";
        document.getElementById("precioMax").value = data.precios?.precioMax || "";
        document.getElementById("notaPrecio").value = data.precios?.notaVariacion || "";

        // Referencias
        document.getElementById("referencias").value = data.referenciaUbicacion || "";

        // 🔥 Reconstruir servicios
        serviciosContainer.innerHTML = "";
        serviciosState = [];

        (data.especialidades || []).forEach(esp => {
          agregarTarjetaEspecialidad(true, {
            nombre: esp.nombre,
            descripcion: esp.descripcion,
            archivos: esp.galeria || []
          });
        });
      }

    } catch (err) {
      console.error("Error al reconstruir negocio:", err);
    }
  }

  // ======================================
  // 🔥 Ajustar límite según plan
  // ======================================
  localStorage.setItem("registroCompleto", "false");

  const plan = localStorage.getItem("planTexto") || "";

  if (plan.includes("Gratis")) MAX_SERVICIOS = 1;
  else if (plan.includes("Plus")) MAX_SERVICIOS = 3;
  else if (plan.includes("Premium")) MAX_SERVICIOS = 5;

  if (serviciosState.length === 0) {
    agregarTarjetaEspecialidad();
  }

  actualizarBotonAgregar();

  const textoMax = document.getElementById("textoMaxEspecialidades");
  if (textoMax) {
    textoMax.textContent = `Máximo ${MAX_SERVICIOS} servicios.`;
  }

});



function agregarTarjetaEspecialidad(fromRebuild = false, data = null) {
  if (serviciosState.length >= MAX_SERVICIOS && !fromRebuild) {
    if (MAX_SERVICIOS === 1) {
      mostrarAlerta(
        "Límite alcanzado",
        "Tu plan Gratis solo permite 1 servicio.\nActualiza tu plan para agregar más.",
        "warning",
        true
      );
    } else {
      mostrarAlerta(
        "Límite alcanzado",
        `El plan ${localStorage.getItem("planTexto")} permite máximo ${MAX_SERVICIOS} servicios.`,
        "warning",
        MAX_SERVICIOS < 5 // redirige si es Gratis o Plus
      );
    }
    return;
  }

  const index = serviciosState.length;




  // Si es reconstrucción, cargar datos previos
  if (fromRebuild && data) {
    serviciosState.push({
      nombre: data.nombre || "",
      descripcion: data.descripcion || "",
      archivos: data.archivos || []
    });
  } else {
    // Estado inicial normal
    serviciosState.push({
      nombre: "",
      descripcion: "",
      archivos: []
    });
  }

  const card = document.createElement("div");
  card.className = "card-especialidad";
  card.dataset.index = index;

  card.innerHTML = `
  <div class="d-flex justify-content-between">
    <h5 class="fw-bold">Servicio ${index + 1}</h5>
    <span class="badge text-bg-secondary">#${index + 1}</span>
  </div>

  <div class="mb-2">
    <select id="select-servicio-${index}" class="form-select mb-2" data-index="${index}">
      <option value="">Seleccione una</option>
      <option>Fotografía y Video</option>
      <option>Decoración y Ambientación</option>
      <option>Renta de Mobiliario</option>
      <option>Música y Entretenimiento</option>
      <option>Banquete y Bebidas</option>
    </select>

    <textarea id="descripcion-servicio-${index}" 
              class="form-control descripcion-especialidad" 
              data-index="${index}"
              placeholder="Descripción breve del servicio"></textarea>
  </div>

  <button type="button" class="btn btn-outline-primary w-100 mt-3" id="btn-archivos-${index}">
    <i class="fas fa-paperclip"></i> Subir fotos / videos
  </button>

  <small class="text-muted">Hasta 4 archivos por servicio (imágenes o videos)</small>

  <div class="mt-3" id="preview-archivos-${index}"></div>

  <button type="button" class="btn btn-danger mt-3" id="btn-eliminar-${index}">Eliminar</button>
`;


  serviciosContainer.appendChild(card);


  // referencias a los botones / inputs
  const btnEvid = card.querySelector(".btn-evidencia");
  const select = card.querySelector(".select-servicio");
  const textarea = card.querySelector(".descripcion-especialidad");
  const btnEliminar = card.querySelector(".btn-eliminar-tarjeta");

  // Restaurar datos cargados al reconstruir
  if (fromRebuild && data) {
    select.value = data.nombre || "";
    textarea.value = data.descripcion || "";
  }

  // crear input file invisible por tarjeta
  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.accept = "image/*,video/*";
  inputFile.multiple = true;
  inputFile.style.display = "none";
  inputFile.dataset.index = index;
  document.body.appendChild(inputFile);

  btnEvid.addEventListener("click", () => {
    const current = serviciosState[index];

    // 🚫 BLOQUEAR el botón si ya hay 4 archivos
    if (current.archivos.length >= 4) {
      mostrarAlerta("Límite de archivos", "Máximo 4 archivos por servicio.");
      return;
    }


    inputFile.click();
  });


  inputFile.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const current = serviciosState[index];
    // limitar a 6 archivos por especialidad
    if ((current.archivos.length + files.length) > 4) {
      alert("Máximo 4 archivos por especialidad.");
      return;
    }

    files.forEach(f => current.archivos.push(f));
    renderEvidenciasTarjeta(index);
    // limpiar input para permitir seleccionar mismo archivo luego
    inputFile.value = "";
  });

  select.addEventListener("change", (e) => {
    serviciosState[index].nombre = e.target.value;
  });

  textarea.addEventListener("input", (e) => {
    serviciosState[index].descripcion = e.target.value;
  });

  btnEliminar.addEventListener("click", () => {
    // si solo hay 1 tarjeta, no permitir eliminarla (mínimo 1)
    if (serviciosState.length <= 1) {
      mostrarAlerta("Acción no permitida", "Debe existir al menos una especialidad.");
      return;
    }

    eliminarTarjeta(index);
  });

  actualizarBotonAgregar();
  renderEvidenciasTarjeta(index);
}

// renderizar miniaturas de evidencias de una tarjeta
function renderEvidenciasTarjeta(index) {
  const listEl = document.getElementById(`evidencias-list-${index}`);
  if (!listEl) return;
  listEl.innerHTML = "";
  listEl.classList.add("evidencias-grid");


  const archivos = serviciosState[index].archivos || [];
  archivos.forEach((file, i) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const elemento = document.createElement(
      typeof file === "string"
        ? (file.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? "video" : "img")
        : (file.type.startsWith("image/") ? "img" : "video")
    );

    elemento.className = "evidencia-thumb";

    // ⭐ Si el archivo es una URL (edición previa)
    if (typeof file === "string") {
      elemento.src = file;  // URL directa
    } else {
      elemento.src = URL.createObjectURL(file); // File Object nuevo
    }

    // Si es video
    if (typeof file === "string") {
      if (file.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
        elemento.controls = true;
      }
    } else if (file.type.startsWith("video/")) {
      elemento.controls = true;
    }


    const btnRemove = document.createElement("button");
    btnRemove.className = "btn btn-sm btn-danger btn-remove-evid";
    btnRemove.textContent = "✕";
    btnRemove.style.position = "absolute";
    btnRemove.style.top = "-6px";
    btnRemove.style.right = "-6px";

    btnRemove.addEventListener("click", () => {
      serviciosState[index].archivos.splice(i, 1);
      renderEvidenciasTarjeta(index);
    });

    wrapper.appendChild(elemento);
    wrapper.appendChild(btnRemove);
    listEl.appendChild(wrapper);
  });
}

function eliminarTarjeta(index) {
  if (serviciosState.length <= 1) {
    alert("Debe existir al menos una especialidad.");
    return;
  }

  // 1. Guardar copia de los datos restantes
  const temp = serviciosState.filter((_, i) => i !== index);

  // 2. Vaciar el contenedor visual y el estado
  serviciosContainer.innerHTML = "";
  serviciosState = [];

  // 3. Recrear las tarjetas PASANDO LOS DATOS
  temp.forEach(data => agregarTarjetaEspecialidad(true, data));

  actualizarBotonAgregar();
}


// actualizar estado del botón agregar
function actualizarBotonAgregar() {
  btnAgregarServicio.disabled = false;
  btnAgregarServicio.classList.remove("disabled");
}


btnAgregarEspecialidad.addEventListener("click", () => {

  if (serviciosState.length >= MAX_SERVICIOS) {

    const plan = localStorage.getItem("planTexto") || "";

    if (MAX_SERVICIOS === 1) {
      // Guardar el negocio que se estaba editando antes de salir a planes
      localStorage.setItem("negocioEnEdicion", negocioEnEdicion);

      // PLAN GRATIS
      mostrarAlerta(
        "Límite alcanzado",
        "Tu plan Gratis solo permite agregar 1 servicio.\nActualiza tu plan para obtener más.",
        "warning",
        true  // ⬅️ REDIRIGE
      );


    } else if (MAX_SERVICIOS === 3) {
      // Guardar el negocio que se estaba editando antes de salir a planes
      localStorage.setItem("negocioEnEdicion", negocioEnEdicion);

      // PLAN PLUS -> ALERTA DE SUBIR A PREMIUM
      mostrarAlerta(
        "¡Límite del plan Plus!",
        "Tu plan Plus permite máximo 3 servicios.\nSube al plan Premium para agregar más.",
        "warning",
        true  // ⬅️ REDIRIGE
      );

    } else if (MAX_SERVICIOS === 5) {
      // Guardar el negocio que se estaba editando antes de salir a planes
      localStorage.setItem("negocioEnEdicion", negocioEnEdicion);

      // PLAN PREMIUM
      mostrarAlerta(
        "Límite alcanzado",
        "El plan Premium permite máximo 5 servicios.",
        "warning",
        false // ⬅️ Premium no necesita redirigir
      );
    }

    return;
  }

  agregarTarjetaEspecialidad();
});


// Variables para URL de imagen de perfil y evidencias
let imagenPerfilUrl = "";
const evidenciasUrls = [];

// Variables para la imagen de la fachada del negocio
let imagenFachadaUrl = "";
let archivoImagenFachada = null;

// Variables necesarias para almacenar los archivos seleccionados
let archivoImagenPerfil = null;
const archivosEvidencias = [];


// Variable global para guardar el link de Google Maps
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

  // Subir imagen de fachada si se seleccionó
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


  // Subir evidencias
  evidenciasUrls.length = 0;
  for (const file of archivosEvidencias) {
    try {
      const url = await subirImagenACloudinary(file, proveedorId);
      evidenciasUrls.push(url);
    } catch (error) {
      console.error("Error al subir evidencia:", error);
      return alert("Error al subir una de las evidencias.");
    }
  }

  // ⭐⭐⭐ SUBIR ARCHIVOS DE CADA ESPECIALIDAD ⭐⭐⭐
  for (let i = 0; i < serviciosState.length; i++) {
    const esp = serviciosState[i];

    const urls = [];

    for (const file of esp.archivos) {
      try {
        const url = await subirImagenACloudinary(file, proveedorId);
        urls.push(url);
      } catch (error) {
        console.error("Error al subir archivo de especialidad:", error);
        alert("Error al subir archivos de una especialidad.");
        return;
      }
    }

    // Reemplazamos los File objects con URLs
    esp.archivos = urls;
  }


  const negocio = document.getElementById("negocio").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const ubicacionTexto = document.getElementById("ubicacion").value.trim();
  // Obtener especialidades desde las tarjetas dinámicas
  const especialidadesFinal = serviciosState.map(item => ({
    nombre: item.nombre || "",
    descripcion: item.descripcion || "",
    galeria: item.archivos || []
  }));

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
  // Precios
  const precioMin = parseFloat(document.getElementById("precioMin").value);
  const precioMax = parseFloat(document.getElementById("precioMax").value);
  const notaVariacion = document.getElementById("notaPrecio").value;


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
    especialidades: especialidadesFinal,
    //especialidades: serviciosState,
    diasAbierto: diasSeleccionados,
    horaApertura: horaApertura,
    horaCierre: horaCierre,
    precios: {
      precioMin: precioMin,
      precioMax: precioMax,
      notaVariacion: notaVariacion || ""
    },
    referenciaUbicacion,
    urlImagen: imagenPerfilUrl,
    urlFachada: imagenFachadaUrl, // Guardar URL de la fachada
    redesSociales,
    usuariosRedes,
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

    localStorage.setItem("registroCompleto", "true");


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


// Vista previa y subida de imagen de la fachada
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




function reindexarTarjetas() {
  const tarjetas = [...especialidadesContainer.querySelectorAll(".card-especialidad:not(.tarjeta-eliminada)")];

  tarjetas.forEach((card, newIndex) => {
    // Cambiar data-index del contenedor
    card.dataset.index = newIndex;

    // Cambiar número del badge
    const badge = card.querySelector(".badge");
    badge.textContent = `#${newIndex + 1}`;

    // Cambiar título
    const titulo = card.querySelector("h6");
    titulo.textContent = `Especialidad ${newIndex + 1}`;

    // Cambiar select
    card.querySelector(".select-especialidad").dataset.index = newIndex;

    // Cambiar textarea
    card.querySelector(".descripcion-especialidad").dataset.index = newIndex;

    // Cambiar contenedor de evidencias
    const evidencias = card.querySelector(".evidencias-list");
    evidencias.id = `evidencias-list-${newIndex}`;

    // Botón eliminar
    card.querySelector(".btn-eliminar-tarjeta").dataset.index = newIndex;
  });

  // Reordenar el estado interno eliminando elementos marcados como "eliminados"
  serviciosState = serviciosState.filter(e => !e.eliminada);

  // Volver a asignar índices correctos al state
  serviciosState = serviciosState.map((e, i) => ({ ...e, index: i }));
}

