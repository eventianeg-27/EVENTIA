// editarNegocio.js - VERSIÓN FINAL 100% FUNCIONAL
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
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

// === VARIABLES GLOBALES (accesibles desde cualquier función) ===
let proveedorId = "";
let negocioEnEdicion = "";
let imagenPerfilUrl = "";
let imagenFachadaUrl = "";
let archivoImagenPerfil = null;
let archivoImagenFachada = null;
let ubicacionLink = "";
let MAX_SERVICIOS = 1;
let serviciosState = [];
let serviciosContainer = null;
let btnAgregarEspecialidad = null;

// === FUNCIÓN GLOBAL: mostrar campo de red social ===
window.mostrarCampoRed = function (checkbox) {
  const contenedor = document.getElementById("camposRedes");
  const idCampo = `usuario-${checkbox.id}`;
  if (checkbox.checked) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control mb-2";
    input.id = idCampo;
    input.placeholder = `Usuario o enlace de ${checkbox.value}`;
    contenedor.appendChild(input);
  } else {
    const input = document.getElementById(idCampo);
    if (input) contenedor.removeChild(input);
  }
};

// === SweetAlert global ===
function mostrarAlerta(titulo, texto, icono = "warning") {
  Swal.fire({
    title: titulo,
    text: texto,
    icon: icono,
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#3085d6",
  });
}

// === Subir a Cloudinary ===
async function subirImagenACloudinary(file, proveedorId) {
  const esVideo = file.type.startsWith("video/");
  const tipo = esVideo ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/dfokhncek/${tipo}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "Eventia");
  formData.append("folder", `eventia/${proveedorId}`);
  const response = await fetch(url, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Error al subir archivo");
  const data = await response.json();
  return data.secure_url;
}

// === DOM CARGADO ===
document.addEventListener("DOMContentLoaded", async () => {
  serviciosContainer = document.getElementById("especialidadesContainer");
  btnAgregarEspecialidad = document.getElementById("btnAgregarEspecialidad");

  const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  proveedorId = usuarioLogueado.correo?.trim().toLowerCase();
  negocioEnEdicion = localStorage.getItem("negocioEnEdicion");

  if (!proveedorId || !negocioEnEdicion) {
    mostrarAlerta("Error", "No se encontró el negocio a editar. Vuelve a seleccionarlo.", "error");
    setTimeout(() => window.location.href = "misNegocios.html", 3000);
    return;
  }

  // Limpieza de ID corrupto
  if (/[A-ZÁÉÍÓÚÑ\s!@#$%^&*()]/g.test(negocioEnEdicion)) {
    console.warn("ID corrupto, limpiando...");
    localStorage.removeItem("negocioEnEdicion");
    mostrarAlerta("Error", "ID inválido. Selecciona el negocio nuevamente.", "error");
    setTimeout(() => window.location.href = "misNegocios.html", 3000);
    return;
  }

  console.log("Editando:", negocioEnEdicion, "Usuario:", proveedorId);

  const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioEnEdicion);

  try {
    const snap = await getDoc(negocioRef);
    if (!snap.exists()) throw new Error("No existe el documento");

    const d = snap.data();

    // Cargar todos los campos
    document.getElementById("negocio").value = d.negocio || "";
    document.getElementById("telefono").value = d.telefono || "";
    document.getElementById("ubicacion").value = d.ubicacion || "";
    document.getElementById("referencias").value = d.referenciaUbicacion || "";
    document.getElementById("horaApertura").value = d.horaApertura || "";
    document.getElementById("horaCierre").value = d.horaCierre || "";
    document.getElementById("precioMin").value = d.precios?.precioMin || "";
    document.getElementById("precioMax").value = d.precios?.precioMax || "";
    document.getElementById("notaPrecio").value = d.precios?.notaVariacion || "";

    // Días
    const diasMap = { "Lunes": "diaLunes", "Martes": "diaMartes", "Miércoles": "diaMiercoles", "Jueves": "diaJueves", "Viernes": "diaViernes", "Sábado": "diaSabado", "Domingo": "diaDomingo" };
    (d.diasAbierto || []).forEach(dia => {
      const id = diasMap[dia];
      if (id && document.getElementById(id)) document.getElementById(id).checked = true;
    });

    // Imágenes
    if (d.urlImagen) {
      const img = document.getElementById("previewImagen");
      img.src = d.urlImagen; img.style.display = "block";
      imagenPerfilUrl = d.urlImagen;
    }
    if (d.urlFachada) {
      const img = document.getElementById("previewFachadaImg");
      img.src = d.urlFachada; img.style.display = "block";
      imagenFachadaUrl = d.urlFachada;
    }

    // Maps
    if (d.ubicacionLink) {
      ubicacionLink = d.ubicacionLink;
      document.getElementById("mapLink").href = ubicacionLink;
      document.getElementById("mapLinkText").style.display = "block";
    }

    // Redes sociales
    if (d.redesSociales) {
      d.redesSociales.forEach(red => {
        const id = red.toLowerCase();
        const chk = document.getElementById(id);
        if (chk) {
          chk.checked = true;
          window.mostrarCampoRed(chk); // ahora sí existe
          setTimeout(() => {
            const input = document.getElementById(`usuario-${id}`);
            if (input) input.value = d.usuariosRedes?.[red] || "";
          }, 100);
        }
      });
    }

    // Plan
    const plan = localStorage.getItem("planTexto") || "Gratis";
    MAX_SERVICIOS = plan.includes("Gratis") ? 1 : plan.includes("Plus") ? 3 : 5;
    document.getElementById("textoMaxEspecialidades").textContent = `Máximo ${MAX_SERVICIOS} servicios`;

    // Especialidades
    serviciosState = [];
    serviciosContainer.innerHTML = "";
    (d.especialidades || []).forEach(esp => {
      agregarTarjetaEspecialidad(true, {
        nombre: esp.nombre,
        descripcion: esp.descripcion,
        archivos: esp.galeria || []
      });
    });
    if (serviciosState.length === 0) agregarTarjetaEspecialidad();

  } catch (err) {
    console.error("Error:", err);
    mostrarAlerta("Error", "No se pudieron cargar los datos del negocio", "error");
  }
});

// === RESTO DE FUNCIONES (especialidades, guardar, etc.) ===
function agregarTarjetaEspecialidad(fromRebuild = false, data = null) {

  // Validación del límite SOLO si el usuario agrega manualmente
  if (!fromRebuild && serviciosState.length >= MAX_SERVICIOS) {
    mostrarAlerta("Límite", `Tu plan permite máximo ${MAX_SERVICIOS} servicios`, "warning");
    return;
  }

  const index = serviciosState.length;

  serviciosState.push({
    nombre: data?.nombre || "",
    descripcion: data?.descripcion || "",
    archivos: data?.archivos || []
  });

  const card = document.createElement("div");
  card.className = "card p-3 shadow-sm mb-3";
  card.id = `servicio-${index}`;

  card.innerHTML = `
    <div class="d-flex justify-content-between">
      <h5 class="fw-bold">Servicio ${index + 1}</h5>
      <span class="badge text-bg-secondary">#${index + 1}</span>
    </div>

    <div class="mb-2">
      <select class="form-select select-servicio mb-2" id="select-servicio-${index}" data-index="${index}">
        <option value="">Seleccione una</option>
        <option>Fotografía y Video</option>
        <option>Decoración y Ambientación</option>
        <option>Renta de Mobiliario</option>
        <option>Música y Entretenimiento</option>
        <option>Banquete y Bebidas</option>
      </select>
      
    </div>

    <textarea class="form-control mt-3" id="descripcion-servicio-${index}" rows="2"
      placeholder="Descripción breve del servicio"></textarea>

    <button type="button" class="btn btn-outline-primary w-100 mt-3" id="btn-archivos-${index}">
      <i class="fas fa-paperclip"></i> Subir fotos / videos
    </button>

    <small class="text-muted">Hasta 4 archivos por servicio (imágenes o videos)</small>

    <div class="mt-3" id="preview-archivos-${index}"></div>

    <button type="button" class="btn btn-danger mt-3" id="btn-eliminar-${index}">Eliminar</button>
  `;

  serviciosContainer.appendChild(card);

  // Cargar valores si viene desde Firestore
  if (data) {
  document.getElementById(`select-servicio-${index}`).value = data.nombre || "";
  document.getElementById(`descripcion-servicio-${index}`).value = data.descripcion || "";
  renderEvidenciasTarjeta(index);
}


  // Eventos
  document.getElementById(`btn-archivos-${index}`)
    .addEventListener("click", () => seleccionarArchivos(index));

  document.getElementById(`btn-eliminar-${index}`)
    .addEventListener("click", () => eliminarTarjeta(index));

  document.getElementById(`select-servicio-${index}`)
    .addEventListener("change", e => serviciosState[index].nombre = e.target.value);

  document.getElementById(`descripcion-servicio-${index}`)
    .addEventListener("input", e => serviciosState[index].descripcion = e.target.value);
}

// ================= PREVIEW DE ARCHIVOS =================
function seleccionarArchivos(index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*";
  input.multiple = true;

  input.onchange = () => {
    const files = Array.from(input.files);

    if (serviciosState[index].archivos.length + files.length > 4) {
      mostrarAlerta("Límite", "Máximo 4 archivos por servicio.", "warning");
      return;
    }

    serviciosState[index].archivos.push(...files);
    renderEvidenciasTarjeta(index);
  };

  input.click();
}

// ================= MOSTRAR PREVIEW =================
function renderEvidenciasTarjeta(index) {
  const cont = document.getElementById(`preview-archivos-${index}`);
  cont.innerHTML = "";

  serviciosState[index].archivos.forEach((file, i) => {
    const esUrl = typeof file === "string";
    const url = esUrl ? file : URL.createObjectURL(file);

    const div = document.createElement("div");
    div.className = "position-relative d-inline-block me-2";

    div.innerHTML = `
      <img src="${url}" class="img-thumbnail" style="width:90px;height:90px;object-fit:cover;">
      <button class="btn btn-sm btn-danger position-absolute top-0 end-0" id="del-${index}-${i}">
        <i class="fas fa-times"></i>
      </button>
    `;

    cont.appendChild(div);

    document.getElementById(`del-${index}-${i}`)
      .addEventListener("click", () => {
        serviciosState[index].archivos.splice(i, 1);
        renderEvidenciasTarjeta(index);
      });
  });
}

// ================= ELIMINAR TARJETA =================
function eliminarTarjeta(index) {
  serviciosState.splice(index, 1);

  serviciosContainer.innerHTML = "";
  serviciosState.forEach(srv => agregarTarjetaEspecialidad(true, srv));
}


// === GUARDAR CAMBIOS ===
document.getElementById("btnGuardar")?.addEventListener("click", async () => {
  try {
    if (archivoImagenPerfil) imagenPerfilUrl = await subirImagenACloudinary(archivoImagenPerfil, proveedorId);
    if (archivoImagenFachada) imagenFachadaUrl = await subirImagenACloudinary(archivoImagenFachada, proveedorId);

    for (const esp of serviciosState) {
      const urls = [];
      for (const file of esp.archivos) {
        urls.push(typeof file === "string" ? file : await subirImagenACloudinary(file, proveedorId));
      }
      esp.archivos = urls;
    }

    const datos = {
      negocio: document.getElementById("negocio").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      ubicacion: document.getElementById("ubicacion").value.trim(),
      referenciaUbicacion: document.getElementById("referencias").value.trim(),
      horaApertura: document.getElementById("horaApertura").value,
      horaCierre: document.getElementById("horaCierre").value,
      diasAbierto: Array.from(document.querySelectorAll('input[id^="dia"]:checked')).map(c => c.value),
      precios: {
        precioMin: document.getElementById("precioMin").value || 0,
        precioMax: document.getElementById("precioMax").value || 0,
        notaVariacion: document.getElementById("notaPrecio").value
      },
      urlImagen: imagenPerfilUrl,
      urlFachada: imagenFachadaUrl,
      ubicacionLink: ubicacionLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(document.getElementById("ubicacion").value)}`,
      especialidades: serviciosState.map(s => ({ nombre: s.nombre, descripcion: s.descripcion, galeria: s.archivos })),
      redesSociales: [],
      usuariosRedes: {},
      timestamp: new Date()
    };

    ["facebook", "instagram", "otro"].forEach(red => {
      const chk = document.getElementById(red);
      if (chk?.checked) {
        const nombre = red.charAt(0).toUpperCase() + red.slice(1);
        datos.redesSociales.push(nombre);
        const input = document.getElementById(`usuario-${red}`);
        datos.usuariosRedes[nombre] = input?.value.trim() || "";
      }
    });

    await updateDoc(doc(db, "usuarios", proveedorId, "negocios", negocioEnEdicion), datos);
    mostrarAlerta("Éxito", "Negocio actualizado correctamente", "success");
    setTimeout(() => window.location.href = "perfilNegocio.html", 1500);

  } catch (err) {
    console.error(err);
    mostrarAlerta("Error", "No se pudieron guardar los cambios", "error");
  }
});

// Previews
document.getElementById("fotoPerfil")?.addEventListener("change", e => {
  archivoImagenPerfil = e.target.files[0];
  if (archivoImagenPerfil) {
    document.getElementById("previewImagen").src = URL.createObjectURL(archivoImagenPerfil);
    document.getElementById("previewImagen").style.display = "block";
  }
});

document.getElementById("fotoFachada")?.addEventListener("change", e => {
  archivoImagenFachada = e.target.files[0];
  if (archivoImagenFachada) {
    document.getElementById("previewFachadaImg").src = URL.createObjectURL(archivoImagenFachada);
    document.getElementById("previewFachadaImg").style.display = "block";
  }
});

// Maps y Cancelar
document.getElementById("verEnMapa")?.addEventListener("click", () => {
  const u = document.getElementById("ubicacion").value.trim();
  if (!u) return mostrarAlerta("Falta ubicación", "Ingresa la dirección", "warning");
  ubicacionLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(u)}`;
  document.getElementById("mapLink").href = ubicacionLink;
  document.getElementById("mapLinkText").style.display = "block";
  window.open(ubicacionLink, "_blank");
});

document.getElementById("btnCancelar")?.addEventListener("click", () => {
  if (confirm("¿Cancelar edición?")) window.location.href = "perfilNegocio.html";
});

btnAgregarEspecialidad?.addEventListener("click", () => agregarTarjetaEspecialidad());

// 🔢 Limitar nota de precios a 120 caracteres
const notaPrecioInput = document.getElementById("notaPrecio");

notaPrecioInput.addEventListener("input", function () {
  const maxLength = 120;

  if (this.value.length > maxLength) {
    this.value = this.value.substring(0, maxLength);
  }
});
