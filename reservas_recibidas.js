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

/* -------------------------
   Helpers hora
   ------------------------- */
function convertir12a24(hora12) {
  const partes = hora12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!partes) return hora12;
  let h = parseInt(partes[1], 10);
  const m = partes[2];
  const ampm = partes[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}
function convertirHora12h(hora24) {
  if (!hora24) return "-";
  const [hS, mS] = hora24.split(":");
  if (hS === undefined) return hora24;
  const h = Number(hS);
  const m = Number(mS || 0);
  const sufijo = h >= 12 ? "PM" : "AM";
  const hora12 = (h % 12) || 12;
  return `${hora12}:${m.toString().padStart(2, "0")} ${sufijo}`;
}

/* -------------------------
   Firebase config
   ------------------------- */
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

/* -------------------------
   Utilidades varias
   ------------------------- */
function getProveedorIdFromLocalStorage() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    if (usuario.correo) return usuario.correo.toLowerCase();
    const prov = localStorage.getItem("proveedorId");
    if (prov) return prov.toLowerCase();
  } catch { }
  return null;
}
function formatearFecha(fecha) {
  if (!fecha) return "-";
  let d = fecha;
  if (fecha && typeof fecha === "object" && typeof fecha.toDate === "function") {
    d = fecha.toDate();
  } else if (fecha && typeof fecha === "object" && fecha.seconds) {
    d = new Date(fecha.seconds * 1000);
  } else if (typeof fecha === "string") {
    const isoMatch = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(fecha);
    }
  }
  if (!(d instanceof Date) || isNaN(d)) return "-";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia} - ${mes} - ${anio}`;
}

/* -------------------------
   Variables globales
   ------------------------- */
const negocioId = localStorage.getItem("negocioId");
const contenedor = document.getElementById("contenedorReservas");
const modalDetalle = document.getElementById("detalleReserva");
let reservas = [];
let reservasFiltradas = [];
let reservaSeleccionada = null; // para sugerir

/* -------------------------
   Toast helper (Bootstrap) con variante
   ------------------------- */
function showToast(message, autohide = true, variant = "primary") {
  // variant puede ser 'primary','warning','success','danger'
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toastEl = document.createElement("div");

  // seleccionar clases según variante (naranja -> warning)
  const bgClass = variant === "warning" ? "bg-warning text-dark" :
                  variant === "danger" ? "bg-danger text-white" :
                  variant === "success" ? "bg-success text-white" :
                  "bg-primary text-white";

  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.role = "alert";
  toastEl.ariaLive = "assertive";
  toastEl.ariaAtomic = "true";
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close ${variant === "warning" ? "" : "btn-close-white"} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  container.appendChild(toastEl);
  const bs = new bootstrap.Toast(toastEl, { delay: 3000 });
  bs.show();
  if (!autohide) bs._config.autohide = false;
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

/* -------------------------
   Compute remaining ms until suggest expires (72h after acceptedAt)
   Returns { ms, text, expiredBool }
   ------------------------- */
function computeSuggestRemaining(acceptedAtIso) {
  if (!acceptedAtIso) return { ms: null, text: "", expired: true };
  const acceptedMs = (new Date(acceptedAtIso)).getTime();
  if (isNaN(acceptedMs)) return { ms: null, text: "", expired: true };
  const expireMs = acceptedMs + 72 * 3600 * 1000; // 72 hours
  const now = Date.now();
  const ms = expireMs - now;
  if (ms <= 0) return { ms: 0, text: "0h 0m", expired: true };
  // format
  const hours = Math.floor(ms / (3600 * 1000));
  const mins = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
  return { ms, text: `${hours}h ${mins}m restantes`, expired: false };
}

/* -------------------------
   Re-render a single reserva in memory and redraw table
   ------------------------- */
function actualizarReservaEnMemoria(clienteId, id, nuevosDatos) {
  let changed = false;
  reservas = reservas.map(r => {
    if (r.id === id && r.clienteId === clienteId) {
      r.data = { ...r.data, ...nuevosDatos };
      changed = true;
    }
    return r;
  });
  if (changed) renderTabla();
}

/* -------------------------
   Agrupar por día y render
   ------------------------- */
function agruparPorDia(reservas) {
  const grupos = {};
  reservas.forEach(r => {
    const ts = r.data.creadoEn?.toDate ? r.data.creadoEn.toDate() : (r.data.creadoEn ? new Date(r.data.creadoEn) : new Date());
    const fechaClave = formatearFecha(ts);
    if (!grupos[fechaClave]) grupos[fechaClave] = [];
    grupos[fechaClave].push(r);
  });
  return grupos;
}

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
      <p>📅 <strong>${fecha}</strong>
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
          <th>Fecha del evento</th>
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
      const limite = data.limiteRespuesta?.toDate ? data.limiteRespuesta.toDate() : (data.limiteRespuesta ? new Date(data.limiteRespuesta) : null);
      let estadoActual = data.estado || "pendiente";

      // lógica expiración 48h basada en limiteRespuesta:
      const expiradoPorLimite = limite ? (ahora > limite) : false;
      if (estadoActual === "pendiente" && expiradoPorLimite) {
        estadoActual = "expirada";
        const proveedorId = getProveedorIdFromLocalStorage();
        if (proveedorId) {
          const reservaRef = doc(
            db,
            "usuarios",
            proveedorId,
            "reservas_recibidas",
            negocioId,
            "clientes",
            clienteId,
            "reservas",
            id
          );
          updateDoc(reservaRef, { estado: "expirada" }).catch(() => { });
        }
      }

      let colorEstado = "purple";
      if (estadoActual === "aceptado") colorEstado = "green";
      else if (estadoActual === "rechazado") colorEstado = "red";
      else if (estadoActual === "expirada") colorEstado = "gray";
      else if (estadoActual === "edicion_solicitada") colorEstado = "orange";

      const correoMostrar = data.correoCliente || clienteId || "-";

      // sugeridaHTML (fecha)
      const fechaSugeridaExists = data.fechaSugerida && (data.estado === "edicion_solicitada" || data.estado === "fecha_sugerida" || data.estado === "edicion_solicitada_esperando_cliente");
      let sugeridaHTML = "";
      if (data.fechaSugerida && fechaSugeridaExists) {
        sugeridaHTML = `<div class="small text-warning">Sugerida: ${formatearFecha(data.fechaSugerida)}</div>`;
      }

      // hora original y sugerida
      const fechaOriginal = data.fechaStr || data.fecha_evento || data.fechaTimestamp || null;
      const horaOriginal = data.hora_evento || data.hora || "-";

      // compute suggest availability and countdown (kept for accepted flow)
      const acceptedAtIso = data.acceptedAt || null;
      const suggestInfo = computeSuggestRemaining(acceptedAtIso);
      const sugerenciasCount = Number.isFinite(data.sugerenciasCount) ? data.sugerenciasCount : (data.sugerenciasCount ? data.sugerenciasCount : 0);

      // reglas para permitir sugerir:
      // - NO expirado por limiteRespuesta
      // - estado pend o aceptado
      // - sugerenciasCount < 2
      const puedeSugerir = !expiradoPorLimite && (estadoActual === "pendiente" || estadoActual === "aceptado") && (sugerenciasCount < 2);

      // decide button disabled states (también bloqueamos si expirado por limite)
      const acceptDisabled = (estadoActual !== "pendiente") || expiradoPorLimite;
      const rejectDisabled = (estadoActual !== "pendiente") || expiradoPorLimite;
      const suggestDisabled = !puedeSugerir;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.folio || "-"}</td>
        <td>${correoMostrar}</td>
        <td>${data.evento || "-"}</td>
        <td>
          ${formatearFecha(fechaOriginal)}
          ${sugeridaHTML}
        </td>
        <td>
          ${horaOriginal}
          ${data.horaSugerida24 ? `<div class="small text-warning">Sugerida: ${convertirHora12h(data.horaSugerida24)}</div>` : ""}
          ${ (estadoActual === "aceptado" && acceptedAtIso) ? `<div class="small text-muted suggest-countdown" data-reserva-id="${id}" data-cliente-id="${clienteId}">${suggestInfo.text}</div>` : "" }
          ${ (sugerenciasCount !== undefined) ? `<div class="small text-muted">Sugerencias: ${sugerenciasCount}/2</div>` : "" }
        </td>
        <td class="estado" style="color:${colorEstado}; font-weight:bold;">${estadoActual}</td>
        <td>
          <button class="btn btn-info btn-sm btn-info-res" data-info='${JSON.stringify(data)}'>Info</button>
          <button class="btn btn-success btn-sm btn-aceptar" ${acceptDisabled ? "disabled" : ""}>Aceptar</button>
          <button class="btn btn-danger btn-sm btn-rechazar" ${rejectDisabled ? "disabled" : ""}>Rechazar</button>
          <button class="btn btn-warning btn-sm btn-editar-fecha" ${suggestDisabled ? "disabled" : ""}>Sugerir nueva fecha y hora</button>
        </td>
      `;
      tbody.appendChild(tr);

      // Event listeners for newly-created buttons
      // Info
      const btnInfo = tr.querySelector(".btn-info-res");
      if (btnInfo) {
        btnInfo.addEventListener("click", e => {
          const d = JSON.parse(e.currentTarget.dataset.info);
          let fechaRegistro = "-";
          if (d.creadoEn) {
            if (d.creadoEn.toDate) fechaRegistro = formatearFecha(d.creadoEn.toDate());
            else if (d.creadoEn.seconds) fechaRegistro = formatearFecha(new Date(d.creadoEn.seconds * 1000));
            else fechaRegistro = formatearFecha(new Date(d.creadoEn));
          }
          let fechaEvento = "-";
          if (d.fechaStr) {
            fechaEvento = formatearFecha(d.fechaStr);
          } else if (d.fecha_evento) {
            fechaEvento = formatearFecha(d.fecha_evento);
          } else if (d.fechaTimestamp && d.fechaTimestamp.toDate) {
            fechaEvento = formatearFecha(d.fechaTimestamp.toDate());
          }
          modalDetalle.innerHTML = `
            <p><strong>Cliente:</strong> ${d.correoCliente || "-"}</p>
            <p><strong>Folio:</strong> ${d.folio || "-"}</p>
            <p><strong>Estado:</strong> ${d.estado || "-"}</p>
            <p><strong>Evento:</strong> ${d.evento || "-"}</p>
            <p><strong>Fecha de registro:</strong> ${fechaRegistro}</p>
            <p><strong>Fecha del evento:</strong> ${fechaEvento}</p>
            <p><strong>Hora del evento:</strong> ${d.hora || d.hora_evento || "-"}</p>
            <p><strong>Ubicación:</strong> ${d.ubicacion || "-"}</p>
            <p><strong>Teléfono:</strong> ${d.telefono || "-"}</p>
            <p><strong>Asistentes:</strong> ${d.asistentes || "-"}</p>
            ${d.fechaSugerida && d.horaSugerida ? `<p class="text-warning"><strong>Fecha sugerida por el negocio:</strong> ${formatearFecha(d.fechaSugerida)} ${d.horaSugerida}</p>` : ""}
          `;
          new bootstrap.Modal(document.getElementById("modalInfo")).show();
        });
      }

      // Sugerir nueva fecha (abre modal)
      const btnEditarFecha = tr.querySelector(".btn-editar-fecha");
      if (btnEditarFecha) {
        btnEditarFecha.addEventListener("click", () => {
          reservaSeleccionada = { id, clienteId, data };
          const f = document.getElementById("nuevaFecha");
          const h = document.getElementById("nuevaHora");
          if (f) f.value = "";
          if (h) h.value = "";
          new bootstrap.Modal(document.getElementById("modalSugerirFecha")).show();
        });
      }

      // Aceptar (con confirm modal)
      const btnAceptar = tr.querySelector(".btn-aceptar");
      if (btnAceptar) {
        btnAceptar.addEventListener("click", () => {
          // rellenar el modal de confirmación
          document.getElementById("confirmAcceptText").textContent = "¿Estás seguro que quieres aceptar esta reservación? Después de aceptar no podrás rechazarla, solo sugerir nueva fecha durante 72 horas.";
          const modalAcc = new bootstrap.Modal(document.getElementById("modalConfirmAccept"));
          // setup confirm handler
          const btnConf = document.getElementById("btnConfirmAccept");
          const onConfirm = async () => {
            try {
              const proveedorId = getProveedorIdFromLocalStorage();
              const reservaRef = doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id);
              const acceptedAtIso = new Date().toISOString();
              await updateDoc(reservaRef, { estado: "aceptado", acceptedAt: acceptedAtIso });
              // update memory and UI
              actualizarReservaEnMemoria(clienteId, id, { estado: "aceptado", acceptedAt: acceptedAtIso });
              showToast("Reserva aceptada.", true, "success");
            } catch (err) {
              console.error(err);
              showToast("Error al aceptar la reserva.", true, "danger");
            } finally {
              btnConf.removeEventListener("click", onConfirm);
              modalAcc.hide();
            }
          };
          btnConf.addEventListener("click", onConfirm);
          modalAcc.show();
        });
      }

      // Rechazar (con confirm modal)
      const btnRechazar = tr.querySelector(".btn-rechazar");
      if (btnRechazar) {
        btnRechazar.addEventListener("click", () => {
          document.getElementById("confirmRejectText").textContent = "¿Confirma que quiere rechazar esta reserva?";
          const modalRech = new bootstrap.Modal(document.getElementById("modalConfirmReject"));
          const btnConfR = document.getElementById("btnConfirmReject");
          const onConfirmR = async () => {
            try {
              const proveedorId = getProveedorIdFromLocalStorage();
              const reservaRef = doc(db, "usuarios", proveedorId, "reservas_recibidas", negocioId, "clientes", clienteId, "reservas", id);
              await updateDoc(reservaRef, { estado: "rechazado" });
              actualizarReservaEnMemoria(clienteId, id, { estado: "rechazado" });
              showToast("Reserva rechazada.", true, "warning");
            } catch (err) {
              console.error(err);
              showToast("Error al rechazar la reserva.", true, "danger");
            } finally {
              btnConfR.removeEventListener("click", onConfirmR);
              modalRech.hide();
            }
          };
          btnConfR.addEventListener("click", onConfirmR);
          modalRech.show();
        });
      }

      // FIN forEach reserva
    });

    divDia.appendChild(tabla);
    contenedor.appendChild(divDia);
  });

  // start countdown updater for suggest timers (if any rows present)
  startCountdownUpdates();
}

/* -------------------------
   Countdown updater (actualiza las cuentas regresivas cada minuto)
   ------------------------- */
let countdownInterval = null;
function startCountdownUpdates() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const els = document.querySelectorAll(".suggest-countdown");
    els.forEach(el => {
      const id = el.dataset.reservaId;
      const clienteId = el.dataset.clienteId;
      const r = reservas.find(x => x.id === id && x.clienteId === clienteId);
      if (!r) return;
      const info = computeSuggestRemaining(r.data.acceptedAt);
      el.textContent = info.text;
      // if expired, re-render table to disable suggest buttons
      const limite = r.data.limiteRespuesta?.toDate ? r.data.limiteRespuesta.toDate() : (r.data.limiteRespuesta ? new Date(r.data.limiteRespuesta) : null);
      if (limite && new Date() > limite) renderTabla();
      if (info.expired) renderTabla();
    });
  }, 60 * 1000); // update cada minuto
}

/* -------------------------
   Guardar sugerencia (con confirm)
   - cierra modalSugerirFecha, espera a que se oculte y luego abre modalConfirmSuggest
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btnGuardar = document.getElementById("btnGuardarSugerencia");
  if (!btnGuardar) return;

  btnGuardar.addEventListener("click", async () => {
    if (!reservaSeleccionada) {
      showToast("No hay reserva seleccionada.", true, "warning");
      return;
    }
    const nuevaFecha = document.getElementById("nuevaFecha").value;
    const nuevaHora = document.getElementById("nuevaHora").value;
    if (!nuevaFecha || !nuevaHora) {
      showToast("⚠ Debes ingresar la nueva fecha y hora.", true, "warning");
      return;
    }

    // primer paso: cerrar modal de selección y esperar a que termine la animación
    const modalSelEl = document.getElementById("modalSugerirFecha");
    const modalSelInst = bootstrap.Modal.getInstance(modalSelEl);
    // Si no hay instancia (abierto manualmente), crearla para cerrarla de forma consistente
    const modalSel = modalSelInst || new bootstrap.Modal(modalSelEl);

    // añadir listener para cuando ya esté oculto
    const onHidden = () => {
      modalSelEl.removeEventListener("hidden.bs.modal", onHidden);

      // ahora abrimos el modal de confirmación
      document.getElementById("confirmSuggestText").textContent = `¿Estás seguro de enviar esta sugerencia al cliente? ${nuevaFecha} ${nuevaHora}`;
      const modalSugConfEl = document.getElementById("modalConfirmSuggest");
      const modalSugConf = new bootstrap.Modal(modalSugConfEl);
      const btnConfirmSuggest = document.getElementById("btnConfirmSuggest");

      const onConfirmSuggest = async () => {
        try {
          const proveedorId = getProveedorIdFromLocalStorage();
          const ref = doc(
            db,
            "usuarios", proveedorId,
            "reservas_recibidas", negocioId,
            "clientes", reservaSeleccionada.clienteId,
            "reservas", reservaSeleccionada.id
          );

          // Revisar limites (limiteRespuesta) y sugerencias actuales
          const snap = await getDoc(ref);
          const dataActual = snap.exists() ? snap.data() : {};
          const limite = dataActual.limiteRespuesta?.toDate ? dataActual.limiteRespuesta.toDate() : (dataActual.limiteRespuesta ? new Date(dataActual.limiteRespuesta) : null);
          const ahora = new Date();
          if (limite && ahora > limite) {
            showToast("No se puede sugerir: ya pasaron las 48 hrs (reserva expirada).", true, "danger");
            btnConfirmSuggest.removeEventListener("click", onConfirmSuggest);
            modalSugConf.hide();
            return;
          }

          const sugerenciasCount = dataActual.sugerenciasCount || 0;
          if (sugerenciasCount >= 2) {
            showToast("Ya se alcanzó el límite de 2 sugerencias para esta reserva.", true, "warning");
            btnConfirmSuggest.removeEventListener("click", onConfirmSuggest);
            modalSugConf.hide();
            return;
          }

          // Guardar hora en 24h
          const horaSugerida24 = convertir12a24(nuevaHora);

          const updateObj = {
            fechaSugerida: nuevaFecha,
            horaSugerida: nuevaHora,
            horaSugerida24,
            estado_deSugerencia: "pendiente",
            sugerenciasCount: sugerenciasCount + 1
          };

          // Solo cambia estado si estaba pendiente
          if ((dataActual.estado || "pendiente") === "pendiente") {
            updateObj.estado = "edicion_solicitada";
          }

          await updateDoc(ref, updateObj);

          actualizarReservaEnMemoria(reservaSeleccionada.clienteId, reservaSeleccionada.id, updateObj);
          showToast("Sugerencia enviada al cliente", true, "warning");
        } catch (err) {
          console.error(err);
          showToast("Error al enviar la sugerencia.", true, "danger");
        } finally {
          btnConfirmSuggest.removeEventListener("click", onConfirmSuggest);
          modalSugConf.hide();
        }
      };

      // atachamos y mostramos
      btnConfirmSuggest.addEventListener("click", onConfirmSuggest);
      modalSugConf.show();
    };

    modalSelEl.addEventListener("hidden.bs.modal", onHidden);
    // pedir que se oculte (si ya está oculto, 'hidden' ocurrirá inmediatamente)
    modalSel.hide();
  });
});

/* -------------------------
   Cargar reservas
   ------------------------- */
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

  // Buscador de folios (inserta input)
  const buscador = document.createElement("input");
  buscador.type = "text";
  buscador.placeholder = "🔍 Buscar por folio...";
  buscador.classList.add("form-control", "mb-4");
  buscador.style.maxWidth = "350px";
  buscador.style.margin = "0 auto";
  buscador.addEventListener("input", e => {
    const texto = e.target.value.toLowerCase().trim();
    if (texto === "") reservasFiltradas = [...reservas];
    else reservasFiltradas = reservas.filter(r =>
      (r.data.folio || "").toLowerCase().includes(texto)
    );
    renderTabla();
  });
  contenedor.parentNode.insertBefore(buscador, contenedor);
});

/* -------------------------
   mostrarEncabezadoNegocio (lo dejo como tenía)
   ------------------------- */
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
    console.error("❌ Error al cargar datos del negocio:", err);
  }
}

/* -------------------------
   Navegación botones (igual)
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const btnVerAceptadas = document.getElementById("btnVerAceptadas");
  if (btnVerAceptadas) {
    btnVerAceptadas.addEventListener("click", () => {
      const negocioId = localStorage.getItem("negocioId");
      if (!negocioId) {
        alert("⚠️ No se encontró el negocioId en localStorage.");
        return;
      }
      window.location.href = "reservas_aceptadas.html";
    });
  }

  const btnVerRechazadas = document.getElementById("btnVerRechazadas");
  if (btnVerRechazadas) {
    btnVerRechazadas.addEventListener("click", () => {
      const negocioId = localStorage.getItem("negocioId");
      if (!negocioId) {
        alert("⚠️ No se encontró el negocioId en localStorage.");
        return;
      }
      window.location.href = "reservas_rechazadas.html";
    });
  }
});
