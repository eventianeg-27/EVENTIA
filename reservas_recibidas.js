import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ==========================
// Configuración Firebase
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyBhX59jBh2tUkEnEGcb9sFVyW2zJe9NB_w",
  authDomain: "eventia-9ead3.firebaseapp.com",
  projectId: "eventia-9ead3",
  storageBucket: "eventia-9ead3.appspot.com",
  messagingSenderId: "313661648136",
  appId: "1:313661648136:web:1c9eb73bbb3f78994c90bd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==========================
// Obtener proveedorId desde localStorage
// ==========================
function getProveedorIdFromLocalStorage() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    if (usuario.correo) return usuario.correo.toLowerCase();
    const prov = localStorage.getItem("proveedorId");
    if (prov) return prov.toLowerCase();
  } catch { }
  return null;
}

// ==========================
// Formatear fecha
// ==========================
function formatearFecha(fecha) {
  if (!fecha) return "-";
  let d = fecha;
  if (fecha.toDate) d = fecha.toDate();
  else if (fecha.seconds) d = new Date(fecha.seconds * 1000);
  else if (typeof fecha === "string") d = new Date(fecha);
  if (isNaN(d)) return "-";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia} - ${mes} - ${anio}`;
}

// ==========================
// Variables
// ==========================
const negocioId = localStorage.getItem("negocioId");
const contenedor = document.getElementById("contenedorReservas");
const modalDetalle = document.getElementById("modalDetalle");
let reservas = [];
let reservasFiltradas = [];

// ==========================
// MODAL CONFIRMACIÓN BONITO
// ==========================
// ==========================
// MODAL DE CONFIRMACIÓN BONITO Y CON COLORES SEGÚN ACCIÓN
// ==========================
function mostrarConfirmacion(tipo, titulo, mensaje, callbackSi) {
  // Colores e iconos según el tipo
  let colorHeader = "bg-primary";
  let colorBoton = "btn-primary";
  let icono = "bi-question-circle";

  if (tipo === "aceptar") {
    colorHeader = "bg-success";
    colorBoton = "btn-success";
    icono = "bi-check-circle";
  } else if (tipo === "cancelar") {
    colorHeader = "bg-danger";
    colorBoton = "btn-danger";
    icono = "bi-x-circle";
  } else if (tipo === "guardar") {
    colorHeader = "bg-purple";
    colorBoton = "btn-purple";
    icono = "bi-save";
  }

  const modalHtml = `
    <div class="modal fade" id="modalConfirmCustom" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header ${colorHeader} text-white py-3">
            <h5 class="modal-title fw-bold">
              <i class="bi ${icono} fs-4 me-2"></i>${titulo}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center py-5">
            <p class="fs-5 mb-0">${mensaje}</p>
          </div>
          <div class="modal-footer justify-content-center gap-4 pb-1 pb-4">
            <button type="button" class="btn btn-secondary px-5" data-bs-dismiss="modal">
              <i class="bi bi-x-lg"></i> Cancelar
            </button>
            <button type="button" class="btn ${colorBoton} px-5 btn-confirmar-si shadow-sm">
              <i class="bi bi-check-lg"></i> Sí, confirmar
            </button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Estilo morado (por si no lo tenías)
  if (!document.getElementById("estiloMoradoConfirm")) {
    const estilo = document.createElement("style");
    estilo.id = "estiloMoradoConfirm";
    estilo.textContent = `
      .bg-purple { background-color: #6f42c1 !important; }
      .btn-purple { background-color: #6f42c1 !important; border-color: #6f42c1 !important; color: white !important; }
      .btn-purple:hover { background-color: #5a32a3 !important; border-color: #5a32a3 !important; }
    `;
    document.head.appendChild(estilo);
  }

  const modalEl = document.getElementById("modalConfirmCustom");
  const modal = new bootstrap.Modal(modalEl);

  modalEl.querySelector(".btn-confirmar-si").onclick = () => {
    modal.hide();
    callbackSi();
  };

  modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
  modal.show();
}

// ==========================
// TOAST DE ÉXITO (MEJORADO Y MÁS BONITO)
// ==========================
function mostrarExito(mensaje) {
  const toast = document.createElement("div");
  toast.className = "toast align-items-center text-bg-success border-0 position-fixed shadow-lg";
  toast.style.top = "20px";
  toast.style.right = "20px";
  toast.style.zIndex = "9999";
  toast.style.minWidth = "300px";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body fs-6 fw-bold">
        <i class="bi bi-check-circle-fill me-2"></i>${mensaje}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.body.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
  bsToast.show();
  setTimeout(() => toast.remove(), 5000);
}



// ==========================
// Mostrar encabezado del negocio
// ==========================
async function mostrarEncabezadoNegocio(proveedorId, negocioId) {
  try {
    const negocioRef = doc(db, "usuarios", proveedorId, "negocios", negocioId);
    const negocioSnap = await getDoc(negocioRef);
    if (negocioSnap.exists()) {
      const data = negocioSnap.data();
      document.getElementById("nombreNegocio").textContent = data.nombreNegocio || negocioId;
      document.getElementById("fotoNegocio").src = data.urlImagen || "https://via.placeholder.com/80";
    } else {
      document.getElementById("nombreNegocio").textContent = "Negocio no encontrado";
    }
  } catch (err) {
    console.error("Error al cargar datos del negocio:", err);
  }
}

// ==========================
// Agrupar reservas por día
// ==========================
function agruparPorDia(reservas) {
  const grupos = {};
  reservas.forEach(r => {
    const ts = r.data.creadoEn?.toDate ? r.data.creadoEn.toDate() : new Date(r.data.creadoEn);
    const fechaClave = formatearFecha(ts);
    if (!grupos[fechaClave]) grupos[fechaClave] = [];
    grupos[fechaClave].push(r);
  });
  return grupos;
}

// ==========================
// para el color de la letra del estado
// ==========================
function colorEstado(estado) {
  if (!estado) return "black";

  const e = estado.toLowerCase();

  if (e.includes("pendiente")) return "purple";   // pendiente / pendiente anticipo
  if (e.includes("acept")) return "green";        // aceptado
  if (e.includes("rechaz")) return "red";         // rechazado
  if (e.includes("expir")) return "gray";         // expirada

  return "black";
}

// ==========================
// RENDER TABLA – CON MODALES BONITOS Y SIN BUG DE BLOQUEO
// ==========================
function renderTabla(lista = reservasFiltradas) {
  contenedor.innerHTML = "";
  const reservasPorDia = agruparPorDia(lista);
  const fechasOrdenadas = Object.keys(reservasPorDia).sort((a, b) => {
    const [diaA, mesA, anioA] = a.split(" - ").map(Number);
    const [diaB, mesB, anioB] = b.split(" - ").map(Number);
    return new Date(anioB, mesB - 1, diaB) - new Date(anioA, mesA - 1, diaA);
  });

  fechasOrdenadas.forEach(fecha => {
    const grupo = reservasPorDia[fecha];
    const divDia = document.createElement("div");
    divDia.classList.add("mb-4", "p-3", "border", "rounded", "bg-light");



    divDia.innerHTML = `
      <h4 class="fw-bold mb-1">Reservas recibidas el día:</h4>
      <p> <strong>${fecha}</strong>
      <span class="text-muted" style="font-size:0.9em;">&nbsp;&nbsp;Tienes 48 hrs para dar una respuesta al cliente.</span></p>
    `;

    const tabla = document.createElement("table");
    tabla.classList.add("table", "table-striped", "mt-3");
    tabla.innerHTML = `
      <thead class="table-dark">
        <tr>
          <th>Folio</th>
          <th>Correo Cliente</th>
          <th>Evento</th>
         <th>Hora del evento</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tabla.querySelector("tbody");

    grupo.forEach(({ id, clienteId, data }) => {
      const ahora = new Date();
      const limite = data.limiteRespuesta?.toDate ? data.limiteRespuesta.toDate() : new Date(data.limiteRespuesta);
      let estadoActual = (data.estado === "aceptado" || data.estado === "rechazado" || data.estado === "expirada")
        ? data.estado
        : "pendiente";
      if (estadoActual === "pendiente" && limite && ahora > limite) {
        estadoActual = "expirada";
        const proveedorId = getProveedorIdFromLocalStorage();
        if (proveedorId) {
          updateDoc(doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id), { estado: "expirada" }).catch(() => { });
        }
      }

      const textoEstado = {
        pendiente: "Pendiente Anticipo",
        aceptado: "Aceptada",
        rechazado: "Cancelada",
        expirada: "Expirada"
      }[estadoActual] || "Pendiente Anticipo";

      const colorEstadoTabla = estadoActual === "aceptado" ? "green"
  : (["rechazado", "expirada"].includes(estadoActual) ? "red" : "purple");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.folio || "-"}</td>
        <td>${data.correoCliente || clienteId || "-"}</td>
        <td>${data.evento || "-"}</td>
        <td>${data.hora || "-"}</td>
        <td style="color:${colorEstadoTabla};font-weight:bold;">${textoEstado}</td>
        <td class="text-nowrap">
<button class="btn btn-info btn-sm me-1" 
        data-info='${JSON.stringify({ ...data, folioReal: id })}'>
        Info
</button>
          <button class="btn btn-success btn-sm me-1 btn-aceptar" ${estadoActual !== "pendiente" ? "disabled" : ""}>Aceptar</button>
          <button class="btn btn-danger btn-sm me-1 btn-cancelar" ${["aceptado", "rechazado", "expirada"].includes(estadoActual) ? "disabled" : ""}>Cancelar</button>
          <button class="btn btn-purple btn-sm btn-editar" ${["rechazado", "expirada"].includes(estadoActual) ? "disabled" : ""}>Editar Reservación</button>
        </td>
      `;
      tbody.appendChild(tr);

      const btnInfo = tr.querySelector(".btn-info");
      if (btnInfo) {
        btnInfo.disabled = false;
        btnInfo.classList.remove("disabled");
        btnInfo.classList.remove("btn-secondary"); // ← ESTA ES LA QUE FALTABA
        btnInfo.style.pointerEvents = "auto";
        btnInfo.style.opacity = "1";
      }


      // BOTÓN INFO
      // BOTÓN INFO
      tr.querySelector(".btn-info").addEventListener("click", e => {
        const d = JSON.parse(e.currentTarget.dataset.info);

        let fechaRegistro = formatearFecha(d.creadoEn);
        let fechaEvento = d.fechaStr ? d.fechaStr.split("-").reverse().join(" - ") : "-";

        modalDetalle.innerHTML = `
<div class="info-container">

  <!-- Cliente + Folio -->
  <div class="fila-doble">
    <div class="caja-info">
      <label><i class="bi bi-person-circle me-1"></i> Cliente</label>
      <p>${d.correoCliente || "—"}</p>
    </div>
    <div class="caja-info">
      <label><i class="bi bi-hash me-1"></i> Folio</label>
      <p>${d.folio}</p>
    </div>
  </div>

  <!-- Registro + Estado -->
  <div class="caja-info grande centrado">
    <p><strong><i class="bi bi-calendar-plus me-1"></i> Registrada:</strong> ${fechaRegistro}</p>
    <p><strong><i class="bi bi-flag me-1"></i> Estado:</strong> 
<span style="color:${colorEstado(d.estado)}; font-weight:bold;">
  ${d.estado || "—"}
</span>
    </p>
  </div>

  <!-- Evento + Fecha evento -->
  <div class="fila-doble">
    <div class="caja-info">
      <label><i class="bi bi-star me-1"></i> Evento</label>
      <p>${d.evento || "—"}</p>
    </div>
    <div class="caja-info">
      <label><i class="bi bi-calendar-event me-1"></i> Fecha del evento</label>
      <p>${fechaEvento}</p>
    </div>
  </div>

  <!-- Hora + Ubicación -->
  <div class="fila-doble">
    <div class="caja-info">
      <label><i class="bi bi-clock me-1"></i> Hora</label>
      <p>${d.hora || "—"}</p>
    </div>
    <div class="caja-info">
      <label><i class="bi bi-geo-alt me-1"></i> Ubicación</label>
      <p>${d.ubicacion || "—"}</p>
    </div>
  </div>

  <!-- Teléfono + Asistentes -->
  <div class="fila-doble">
    <div class="caja-info">
      <label><i class="bi bi-telephone me-1"></i> Teléfono</label>
      <p>${d.telefono || "—"}</p>
    </div>
    <div class="caja-info">
      <label><i class="bi bi-people me-1"></i> Asistentes</label>
      <p>${d.asistentes || "No especificado"}</p>
    </div>
  </div>

</div>
`;

        // IMPORTANTE: aseguramos que el footer de edición no aparezca
        document.getElementById("modalInfoFooter").style.display = "none";

        const bsModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalInfo"));
        bsModal.show();
      });

      // BOTÓN ACEPTAR
      tr.querySelector(".btn-aceptar").addEventListener("click", () => {
        mostrarConfirmacion("aceptar", "Aceptar Reservación", "¿Estás seguro de ACEPTAR esta reservación?", async () => {
          const proveedorId = getProveedorIdFromLocalStorage();
          await updateDoc(doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id), { estado: "aceptado" });

          // Actualizamos la fila actual
          tr.querySelector("td:nth-child(5)").textContent = "Aceptada";
          tr.querySelector("td:nth-child(5)").style.color = "green";
          tr.querySelector(".btn-aceptar").disabled = true;
          tr.querySelector(".btn-cancelar").disabled = true;
          tr.querySelector(".btn-editar").disabled = true;

          mostrarExito("¡Reservación ACEPTADA!");
        });
      });

      // BOTÓN CANCELAR
      tr.querySelector(".btn-cancelar").addEventListener("click", () => {
        mostrarConfirmacion("cancelar", "Cancelar Reservación", "¿Seguro que deseas CANCELAR esta reservación?", async () => {
          const proveedorId = getProveedorIdFromLocalStorage();
          await updateDoc(doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id), { estado: "rechazado" });

          tr.querySelector("td:nth-child(5)").textContent = "Cancelada";
          tr.querySelector("td:nth-child(5)").style.color = "red";
          tr.querySelector(".btn-aceptar").disabled = true;
          tr.querySelector(".btn-cancelar").disabled = true;
          tr.querySelector(".btn-editar").disabled = true;

          mostrarExito("Reservación cancelada");
        });
      });

      // BOTÓN EDITAR – SIN BLOQUEAR NADA
      tr.querySelector(".btn-editar").addEventListener("click", () => {
        mostrarEditarReserva(data, id, clienteId, tr);
      });
    });

    divDia.appendChild(tabla);
    contenedor.appendChild(divDia);
  });
}


// ==========================
// FUNCIÓN EDITAR RESERVACIÓN – 100% SIN BUGS
// ==========================
// ===============
// TOAST PREMIUM
// ===============
function mostrarToast(mensaje) {
  const toast = document.getElementById("customToast");
  toast.querySelector(".toast-text").textContent = mensaje;

  toast.classList.add("mostrar");

  setTimeout(() => {
    toast.classList.remove("mostrar");
  }, 3000);
}

// ==========================
// EDITAR RESERVACIÓN – TU ESTILO ORIGINAL MEJORADO
// ==========================

function mostrarEditarReserva(data, reservaId, clienteId, filaTr) {
  const modal = new bootstrap.Modal(document.getElementById("modalInfo"));
  document.getElementById("modalInfoTitulo").textContent = "Editar Reservación";
  document.getElementById("modalInfoFooter").style.display = "flex";

  const freg = formatearFecha(data.creadoEn);
  const fechaMostrar = data.fechaStr ? data.fechaStr.split("-").reverse().join(" - ") : "-";

  document.getElementById("modalDetalle").innerHTML = `

   <!-- Cliente y Folio -->
<div class="info-grid-2">
  <div class="info-block">
    <span class="info-label"><i class="bi bi-person-circle me-1"></i> Cliente:</span>
    <div class="info-value">${data.correoCliente || "-"}</div>
  </div>
  <div class="info-block">
    <span class="info-label"><i class="bi bi-hash me-1"></i> Folio:</span>
    <div class="info-value">${data.folio || "-"}</div>
  </div>
</div>

<!-- Registrada y Estado -->
<div class="info-central">
  <div><strong><i class="bi bi-calendar-plus me-1"></i> Registrada:</strong> ${freg}</div>
 <div>
  <strong><i class="bi bi-flag me-1"></i> Estado:</strong> 
  <span style="font-weight:bold; color:${colorEstado(data.estado)};">
    ${data.estado || "-"}
  </span>
</div>

</div>

<!-- Evento y Fecha -->
<div class="info-grid-2">
  <div class="info-block">
    <span class="info-label"><i class="bi bi-star me-1"></i> Evento:</span>
    <div class="info-value editable" data-campo="evento">${data.evento || "-"}</div>
    <i class="bi bi-pencil-square edit-icon"></i>
  </div>

  <div class="info-block position-relative">
    <span class="info-label"><i class="bi bi-calendar-event me-1"></i> Fecha evento:</span>
    <div class="info-value" id="textoFecha">${fechaMostrar}</div>
    <i class="bi bi-pencil-square edit-icon" id="lapizFecha"></i>
    <div id="editorFecha" class="editor-inline" style="display:none;"></div>
  </div>
</div>

<!-- Hora y Ubicación -->
<div class="info-grid-2">
  <div class="info-block position-relative">
    <span class="info-label"><i class="bi bi-clock me-1"></i> Hora:</span>
    <div class="info-value" id="textoHora">${data.hora || "-"}</div>
    <i class="bi bi-pencil-square edit-icon" id="lapizHora"></i>
    <div id="editorHora" class="editor-inline" style="display:none;"></div>
  </div>

  <div class="info-block">
    <span class="info-label"><i class="bi bi-geo-alt me-1"></i> Ubicación:</span>
    <div class="info-value editable" data-campo="ubicacion">${data.ubicacion || "-"}</div>
    <i class="bi bi-pencil-square edit-icon"></i>
  </div>
</div>

<!-- Teléfono y Asistentes -->
<div class="info-grid-2">
  <div class="info-block">
    <span class="info-label"><i class="bi bi-telephone me-1"></i> Teléfono:</span>
    <div class="info-value editable" data-campo="telefono">${data.telefono || "-"}</div>
    <i class="bi bi-pencil-square edit-icon"></i>
  </div>
  <div class="info-block">
    <span class="info-label"><i class="bi bi-people me-1"></i> Asistentes:</span>
    <div class="info-value editable" data-campo="asistentes">${data.asistentes || "No especificado"}</div>
    <i class="bi bi-pencil-square edit-icon"></i>
  </div>
</div>

  `;

  // === TU EDICIÓN NORMAL (contentEditable) – SIN CAMBIOS ===
  document.querySelectorAll(".editable").forEach(span => {
    const icon = span.nextElementSibling;
    if (!icon?.classList.contains("edit-icon")) return;

    icon.onclick = () => {
      span.contentEditable = true;
      span.focus();
      span.style.backgroundColor = "#fffacd";
      span.style.outline = "2px solid #0d6efd";
      span.style.padding = "4px 8px";
      span.style.borderRadius = "6px";

      const quitarEdicion = () => {
        span.contentEditable = false;
        span.style.backgroundColor = "";
        span.style.outline = "";
        span.style.padding = "";
      };

      span.onblur = quitarEdicion;
      span.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          span.blur();
        }
      };
    };
  });

  // === EDITAR FECHA – NUEVO DISEÑO (Guardar arriba, Cancelar debajo) ===
  function abrirEditorFecha() {
    const editor = document.getElementById("editorFecha");
    editor.style.display = "block";
    document.getElementById("textoFecha").style.display = "none";
    document.getElementById("lapizFecha").style.display = "none";

    editor.innerHTML = `
      <div class="editor-content">
        <input type="date" value="${data.fechaStr || ''}" id="nuevaFecha">
        <div class="editor-buttons">
          <button class="btn btn-success">Guardar</button>
          <button class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    `;

    editor.querySelector(".btn-success").onclick = () => {
      const val = editor.querySelector("#nuevaFecha").value;
      if (val) {
        data.fechaStr = val;
        document.getElementById("textoFecha").textContent = val.split("-").reverse().join(" - ");
      }
      cerrarEditorFecha();
    };

    editor.querySelector(".btn-secondary").onclick = cerrarEditorFecha;
  }

  function cerrarEditorFecha() {
    document.getElementById("editorFecha").style.display = "none";
    document.getElementById("textoFecha").style.display = "block";
    document.getElementById("lapizFecha").style.display = "block";
  }

  // === EDITAR HORA – IGUAL ===
  function abrirEditorHora() {
    const editor = document.getElementById("editorHora");
    editor.style.display = "block";
    document.getElementById("textoHora").style.display = "none";
    document.getElementById("lapizHora").style.display = "none";

    editor.innerHTML = `
      <div class="editor-content">
        <input type="time" value="${data.hora || ''}" id="nuevaHora">
        <div class="editor-buttons">
          <button class="btn btn-success">Guardar</button>
          <button class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    `;

    editor.querySelector(".btn-success").onclick = () => {
      const val = editor.querySelector("#nuevaHora").value;
      if (val) {
        data.hora = val;
        document.getElementById("textoHora").textContent = val;
      }
      cerrarEditorHora();
    };

    editor.querySelector(".btn-secondary").onclick = cerrarEditorHora;
  }

  function cerrarEditorHora() {
    document.getElementById("editorHora").style.display = "none";
    document.getElementById("textoHora").style.display = "block";
    document.getElementById("lapizHora").style.display = "block";
  }

  // Asignar lápices
  document.getElementById("lapizFecha").onclick = abrirEditorFecha;
  document.getElementById("lapizHora").onclick = abrirEditorHora;

  // === TU BOTÓN GUARDAR CAMBIOS – 100% SIN CAMBIOS ===
 document.getElementById("guardarCambiosInfo").onclick = async () => {
  mostrarConfirmacion("guardar", "Guardar Cambios", "¿Confirmas los cambios?", async () => {
    const updates = {};

    document.querySelectorAll(".editable").forEach(span => {
      const valor = span.textContent.trim();
      const campo = span.dataset.campo;
      if (valor && valor !== "-" && valor !== "No especificado") {
        updates[campo] = valor;
      } else {
        updates[campo] = null;
      }
    });

    if (data.fechaStr !== undefined) updates.fechaStr = data.fechaStr || null;
    if (data.hora !== undefined) updates.hora = data.hora || null;

    if (Object.keys(updates).length > 0) {
      const proveedorId = getProveedorIdFromLocalStorage();

      await updateDoc(
        doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", reservaId),
        updates
      );

      // ⬇⬇⬇ **AQUÍ LA SOLUCIÓN** ⬇⬇⬇
      const reserva = reservas.find(r => r.id === reservaId);
      if (reserva) Object.assign(reserva.data, updates);
      reservasFiltradas = [...reservas];
      renderTabla();
      // ⬆⬆⬆ **ESTO evita recargar la página** ⬆⬆⬆

      mostrarExito("¡Cambios guardados correctamente!");
      mostrarToast("Sugerencia enviada al cliente");
    } else {
      mostrarExito("No se hicieron cambios");
    }

    modal.hide();
  });
};

modal.show();
}


// ==========================
// ESTILO BOTÓN MORADO
// ==========================
const estiloMorado = document.createElement("style");
estiloMorado.textContent = `
  .btn-purple{background:#6f42c1 !important;border-color:#6f42c1 !important;color:white !important;}
  .btn-purple:hover{background:#5a32a3 !important;border-color:#5a32a3 !important;}
`;
document.head.appendChild(estiloMorado);

// ==========================
// CARGAR RESERVAS
// ==========================
onAuthStateChanged(auth, async user => {
  const proveedorId = getProveedorIdFromLocalStorage() || (user?.email?.toLowerCase());
  if (!proveedorId) {
    alert("Debes iniciar sesión o definir el proveedorId.");
    return;
  }

  await mostrarEncabezadoNegocio(proveedorId, negocioId);

  const clientesRef = collection(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes");
  const snapshotClientes = await getDocs(clientesRef);
  reservas = [];

  for (const clienteDoc of snapshotClientes.docs) {
    const clienteId = clienteDoc.id;
    const reservasRef = collection(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas");
    const snapshotReservas = await getDocs(reservasRef);
    snapshotReservas.forEach(reservaDoc => {
      reservas.push({ id: reservaDoc.id, clienteId, data: reservaDoc.data() });
    });
  }

  reservasFiltradas = [...reservas];
  renderTabla();

  const buscador = document.createElement("input");
  buscador.type = "text";
  buscador.placeholder = "Buscar por folio...";
  buscador.classList.add("form-control", "mb-4");
  buscador.style.maxWidth = "350px";
  buscador.style.margin = "0 auto";
  buscador.addEventListener("input", e => {
    const texto = e.target.value.toLowerCase().trim();
    reservasFiltradas = texto === "" ? [...reservas] : reservas.filter(r => (r.data.folio || "").toLowerCase().includes(texto));
    renderTabla();
  });
  contenedor.parentNode.insertBefore(buscador, contenedor);
});

// ==========================
// Navegación
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btnVerAceptadas = document.getElementById("btnVerAceptadas");
  if (btnVerAceptadas) btnVerAceptadas.addEventListener("click", () => window.location.href = "reservas_aceptadas.html");

  const btnVerRechazadas = document.getElementById("btnVerRechazadas");
  if (btnVerRechazadas) btnVerRechazadas.addEventListener("click", () => window.location.href = "reservas_rechazadas.html");
});



