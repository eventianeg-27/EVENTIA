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


// Mostrar el plan elegido
document.addEventListener("DOMContentLoaded", () => {
  const planTexto = localStorage.getItem("planTexto");

  if (planTexto) {
    const planElemento = document.getElementById("planElegido");
    if (planElemento) {
      planElemento.textContent = `Plan elegido: ${planTexto}`;
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




// -----------------------
// Estado para especialidades
// -----------------------
const MAX_ESPECIALIDADES = 2;
let especialidadesState = []; // array de objetos {nombre, descripcion, archivos: [File,...]}
const especialidadesContainer = document.getElementById("especialidadesContainer");
const btnAgregarEspecialidad = document.getElementById("btnAgregarEspecialidad");

// inicializar con 1 tarjeta
document.addEventListener("DOMContentLoaded", () => {
  agregarTarjetaEspecialidad();
});

function agregarTarjetaEspecialidad(fromRebuild = false, data = null) {
  if (!fromRebuild && especialidadesState.length >= MAX_ESPECIALIDADES) {
    alert(`Solo puedes agregar hasta ${MAX_ESPECIALIDADES} especialidades.`);
    return;
  }

  const index = especialidadesState.length;

  // Si es reconstrucción, cargar datos previos
  if (fromRebuild && data) {
    especialidadesState.push({
      nombre: data.nombre || "",
      descripcion: data.descripcion || "",
      archivos: data.archivos || []
    });
  } else {
    // Estado inicial normal
    especialidadesState.push({
      nombre: "",
      descripcion: "",
      archivos: []
    });
  }

  const card = document.createElement("div");
  card.className = "card-especialidad";
  card.dataset.index = index;

  card.innerHTML = `
    <div class="badge-position">
      <span class="badge bg-secondary">#${index + 1}</span>
    </div>

    <h6>Especialidad ${index + 1}</h6>

    <div class="mb-2">
      <select class="form-select select-especialidad mb-2" data-index="${index}">
        <option value="">Seleccione una</option>
        <option>Fotografía y Video</option>
        <option>Decoración y Ambientación</option>
        <option>Renta de Mobiliario</option>
        <option>Música y Entretenimiento</option>
        <option>Banquete y Bebidas</option>
      </select>
      <textarea class="form-control descripcion-especialidad" data-index="${index}" placeholder="Descripción breve del servicio"></textarea>
    </div>

    <div>
      <button type="button" class="btn btn-outline-primary btn-sm btn-evidencia" data-index="${index}">
        <i class="fas fa-paperclip me-1"></i> Subir fotos / videos
      </button>
      <br><small class="small-muted d-block mt-2">Hasta 4 archivos por especialidad (imágenes o videos)</small>

      <div class="evidencias-list" id="evidencias-list-${index}"></div>
    </div>

    <br><button type="button" class="btn btn-danger btn-sm btn-eliminar-tarjeta" data-index="${index}">Eliminar</button>
  `;

  especialidadesContainer.appendChild(card);

  

  // referencias a los botones / inputs
  const btnEvid = card.querySelector(".btn-evidencia");
  const select = card.querySelector(".select-especialidad");
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
    const current = especialidadesState[index];

    // 🚫 BLOQUEAR el botón si ya hay 4 archivos
    if (current.archivos.length >= 4) {
      alert("Máximo 4 archivos por especialidad.");
      return;
    }

    inputFile.click();
  });


  inputFile.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const current = especialidadesState[index];
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
    especialidadesState[index].nombre = e.target.value;
  });

  textarea.addEventListener("input", (e) => {
    especialidadesState[index].descripcion = e.target.value;
  });

  btnEliminar.addEventListener("click", () => {
    // si solo hay 1 tarjeta, no permitir eliminarla (mínimo 1)
    if (especialidadesState.length <= 1) {
      alert("Debe existir al menos una especialidad.");
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


  const archivos = especialidadesState[index].archivos || [];
  archivos.forEach((file, i) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const elemento = document.createElement(file.type.startsWith("image/") ? "img" : "video");
    elemento.className = "evidencia-thumb";
    elemento.src = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) elemento.controls = true;

    const btnRemove = document.createElement("button");
    btnRemove.className = "btn btn-sm btn-danger btn-remove-evid";
    btnRemove.textContent = "✕";
    btnRemove.style.position = "absolute";
    btnRemove.style.top = "-6px";
    btnRemove.style.right = "-6px";

    btnRemove.addEventListener("click", () => {
      especialidadesState[index].archivos.splice(i, 1);
      renderEvidenciasTarjeta(index);
    });

    wrapper.appendChild(elemento);
    wrapper.appendChild(btnRemove);
    listEl.appendChild(wrapper);
  });
}

function eliminarTarjeta(index) {
  if (especialidadesState.length <= 1) {
    alert("Debe existir al menos una especialidad.");
    return;
  }

  // 1. Guardar copia de los datos restantes
  const temp = especialidadesState.filter((_, i) => i !== index);

  // 2. Vaciar el contenedor visual y el estado
  especialidadesContainer.innerHTML = "";
  especialidadesState = [];

  // 3. Recrear las tarjetas PASANDO LOS DATOS
  temp.forEach(data => agregarTarjetaEspecialidad(true, data));

  actualizarBotonAgregar();
}




// actualizar estado del botón agregar
function actualizarBotonAgregar() {
  if (especialidadesState.length >= MAX_ESPECIALIDADES) {
    btnAgregarEspecialidad.disabled = true;
    btnAgregarEspecialidad.classList.add("disabled");
  } else {
    btnAgregarEspecialidad.disabled = false;
    btnAgregarEspecialidad.classList.remove("disabled");
  }
}

btnAgregarEspecialidad.addEventListener("click", () => {
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
/*document.getElementById("agregarEvidencia").addEventListener("click", () => {
  if (archivosEvidencias.length >= 4) {
    alert("Solo puedes agregar hasta 4 imágenes y/o vídeos.");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*";
  input.style.display = "none";

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (archivosEvidencias.length >= 4) {
      alert("Límite de 4 evidencias alcanzado.");
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
});*/




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
  especialidadesState = especialidadesState.filter(e => !e.eliminada);

  // Volver a asignar índices correctos al state
  especialidadesState = especialidadesState.map((e, i) => ({ ...e, index: i }));
}

