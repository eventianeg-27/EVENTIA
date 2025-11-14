import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ---------------------------------------------
// 🔥 CONFIG FIREBASE
// ---------------------------------------------
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

// ---------------------------------------------
// 🔥 SUBIR A CLOUDINARY
// ---------------------------------------------
async function subirImagenACloudinary(file) {
    const tipo = file.type.startsWith("video/") ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/dcxhk1f1l/${tipo}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "preset_eventia");

    const response = await fetch(url, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Error al subir archivo");

    const data = await response.json();
    return data.secure_url;
}

// ---------------------------------------------
// 🔥 CAMPOS DINÁMICOS DE REDES SOCIALES
// ---------------------------------------------
window.mostrarCampoRed = function (checkbox) {
    const contenedor = document.getElementById("camposRedes");
    const idCampo = `usuario-${checkbox.id}`;
    if (checkbox.checked && !document.getElementById(idCampo)) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control mt-2";
        input.placeholder = `Ingresa tu usuario o enlace de ${checkbox.value}`;
        input.id = idCampo;
        contenedor.appendChild(input);
    } else if (!checkbox.checked) {
        const campo = document.getElementById(idCampo);
        if (campo) contenedor.removeChild(campo);
    }
};

// -----------------------------------------------------------------------
// 🚀 CARGAR DATOS DEL NEGOCIO Y LOGICA DE EDICIÓN
// -----------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
    const usuarioData = JSON.parse(localStorage.getItem("usuarioLogueado"));
    const correoUsuario = usuarioData?.correo?.trim().toLowerCase();
    const negocioId = localStorage.getItem("negocioId");

    if (!correoUsuario || !negocioId) {
        alert("No se encontró usuario o negocio.");
        return;
    }

    const docRef = doc(db, "usuarios", correoUsuario, "negocios", negocioId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        alert("No se encontró información del negocio.");
        return;
    }

    const datos = docSnap.data();

    // ---------------------------------------------
    // 🔹 CARGAR DATOS EN EL FORMULARIO
    // ---------------------------------------------
    document.getElementById("negocio").value = datos.negocio || "";
    document.getElementById("telefono").value = datos.telefono || "";
    document.getElementById("ubicacion").value = datos.ubicacion || "";
    document.getElementById("especialidad").value = datos.especialidad || "";
    document.getElementById("descripcion").value = datos.descripcion || "";
    document.getElementById("montoInicial").value = datos.montoInicial || "";
    document.getElementById("referenciaUbicacion").value = datos.referenciaUbicacion || "";

    // ---------------------------------------------
    // 🔹 DISPONIBILIDAD DE DÍAS Y HORARIO
    // ---------------------------------------------
    const diasCheckboxes = {
        "Lunes": document.getElementById("diaLunes"),
        "Martes": document.getElementById("diaMartes"),
        "Miércoles": document.getElementById("diaMiercoles"),
        "Jueves": document.getElementById("diaJueves"),
        "Viernes": document.getElementById("diaViernes"),
        "Sábado": document.getElementById("diaSabado"),
        "Domingo": document.getElementById("diaDomingo")
    };

    if (Array.isArray(datos.diasAbierto)) {
        datos.diasAbierto.forEach(dia => {
            if (diasCheckboxes[dia]) diasCheckboxes[dia].checked = true;
        });
    }

    if (datos.horaApertura) document.getElementById("horaApertura").value = datos.horaApertura;
    if (datos.horaCierre) document.getElementById("horaCierre").value = datos.horaCierre;

    // ---------------------------------------------
    // 🔹 VISTA PREVIA DE FOTO DE PERFIL Y FACHADA
    // ---------------------------------------------
    const inputFotoPerfil = document.getElementById("fotoPerfil");
    const previewPerfil = document.getElementById("previewFotoPerfil");
    if (datos.urlImagen) {
        previewPerfil.innerHTML = `<img src="${datos.urlImagen}" class="img-fluid rounded" style="max-width:200px;">`;
    }
    inputFotoPerfil.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            previewPerfil.innerHTML = `<img src="${event.target.result}" class="img-fluid rounded" style="max-width:200px;">`;
        };
        reader.readAsDataURL(file);
    });

    const inputFachada = document.getElementById("fotoFachada");
    const previewFachada = document.getElementById("previewFachadaImg");
    if (datos.urlFachada) {
        previewFachada.src = datos.urlFachada;
        previewFachada.style.display = "block";
    }
    inputFachada.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            previewFachada.src = event.target.result;
            previewFachada.style.display = "block";
        };
        reader.readAsDataURL(file);
    });

    // ---------------------------------------------
    // 🔹 REDES SOCIALES
    // ---------------------------------------------
    if (datos.redesSociales) {
        datos.redesSociales.forEach(red => {
            const c = document.getElementById(red.toLowerCase()) || document.getElementById("otro");
            if (c) {
                c.checked = true;
                mostrarCampoRed(c);
                const input = document.getElementById(`usuario-${c.id}`);
                if (input) input.value = datos.usuariosRedes?.[red] || "";
            }
        });
    }

    // ---------------------------------------------
    // 🔹 EVIDENCIAS EXISTENTES Y NUEVAS
    // ---------------------------------------------
    const contenedorEvidencias = document.getElementById("contenedorEvidencias");
    function agregarEvidencia(url = null, isExisting = true) {
        const div = document.createElement("div");
        div.classList.add("mb-3", "evidencia-item");

        if (url) {
            const esVideo = url.match(/\.(mp4|webm|ogg)$/);
            div.innerHTML = `
                <div class="d-flex flex-column align-items-center">
                    ${esVideo ? `<video src="${url}" controls style="max-width:300px;"></video>` 
                               : `<img src="${url}" class="img-fluid" style="max-width:300px">`}
                    <button type="button" class="btn btn-danger btn-sm eliminar-evidencia mt-2">Eliminar</button>
                    ${isExisting ? `<input type="hidden" class="evidencia-url" value="${url}">` 
                                  : `<input type="file" class="form-control nueva-evidencia mt-2" accept="image/*,video/*">`}
                </div>`;
        } else {
            div.innerHTML = `
                <input type="file" class="form-control nueva-evidencia" accept="image/*,video/*">
                <button type="button" class="btn btn-danger btn-sm eliminar-evidencia mt-2">Eliminar</button>`;
        }

        contenedorEvidencias.appendChild(div);
        div.querySelector(".eliminar-evidencia").addEventListener("click", () => div.remove());

        const inputFile = div.querySelector("input[type='file']");
        if (inputFile) {
            inputFile.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                let preview = div.querySelector(".preview");
                if (!preview) {
                    preview = document.createElement("div");
                    preview.classList.add("mt-2", "preview", "d-flex", "flex-column", "align-items-center");
                    div.appendChild(preview);
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (file.type.startsWith("image/")) {
                        preview.innerHTML = `<img src="${event.target.result}" class="img-fluid mb-2" style="max-width: 300px;">`;
                    } else if (file.type.startsWith("video/")) {
                        preview.innerHTML = `<video src="${event.target.result}" controls class="mb-2" style="max-width: 300px;"></video>`;
                    }
                    preview.appendChild(div.querySelector(".eliminar-evidencia"));
                };
                reader.readAsDataURL(file);
            });
        }
    }

    if (Array.isArray(datos.evidencias)) {
        datos.evidencias.forEach(url => agregarEvidencia(url, true));
    }

    document.getElementById("agregarEvidencia").addEventListener("click", () => {
        if (contenedorEvidencias.querySelectorAll(".evidencia-item").length >= 6) {
            alert("Solo puedes subir hasta 6 evidencias.");
            return;
        }
        agregarEvidencia(null, false);
    });

    // ---------------------------------------------
    // 🔹 ABRIR UBICACIÓN EN GOOGLE MAPS
    // ---------------------------------------------
    const botonMapa = document.getElementById("verEnMapa");
    botonMapa.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const ubicacionInput = document.getElementById("ubicacion").value.trim();
        if (!ubicacionInput) {
            alert("Por favor, ingresa la ubicación del negocio antes de abrir en Maps.");
            return;
        }

        const query = encodeURIComponent(ubicacionInput);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
        window.open(mapsUrl, "_blank");

        const mapLink = document.getElementById("mapLink");
        const mapLinkText = document.getElementById("mapLinkText");
        mapLink.href = mapsUrl;
        mapLinkText.style.display = "block";
    });

    if (datos.ubicacionLink) {
        const mapLink = document.getElementById("mapLink");
        const mapLinkText = document.getElementById("mapLinkText");
        mapLink.href = datos.ubicacionLink;
        mapLinkText.style.display = "block";
    }

    // ---------------------------------------------
    // 🔹 GUARDAR CAMBIOS
    // ---------------------------------------------
    document.getElementById("btnGuardarCambios").addEventListener("click", async () => {

        const negocio = document.getElementById("negocio").value.trim();
        const telefono = document.getElementById("telefono").value.trim();
        const ubicacion = document.getElementById("ubicacion").value.trim();
        const referenciaUbicacion = document.getElementById("referenciaUbicacion").value.trim();
        const especialidad = document.getElementById("especialidad").value.trim();
        const descripcion = document.getElementById("descripcion").value.trim();
        const horaApertura = document.getElementById("horaApertura").value;
        const horaCierre = document.getElementById("horaCierre").value;
        const montoInicial = document.getElementById("montoInicial").value.trim();

        // Días seleccionados
        const diasSeleccionados = [];
        Object.values(diasCheckboxes).forEach(chk => {
            if (chk.checked) diasSeleccionados.push(chk.value);
        });

        if (diasSeleccionados.length === 0) {
            alert("Selecciona al menos un día de disponibilidad.");
            return;
        }

        // Redes sociales
        const redesSeleccionadas = [];
        const usuariosRedes = {};
        document.querySelectorAll('input[name="redSocial"]:checked').forEach(c => {
            const red = c.value;
            const input = document.getElementById(`usuario-${c.id}`);
            if (input?.value.trim()) {
                redesSeleccionadas.push(red);
                usuariosRedes[red] = input.value.trim();
            }
        });

        // Imagen perfil y fachada
        let urlImagen = datos.urlImagen;
        const archivoPerfil = document.getElementById("fotoPerfil").files[0];
        if (archivoPerfil) urlImagen = await subirImagenACloudinary(archivoPerfil);

        let urlFachada = datos.urlFachada;
        const archivoFachada = document.getElementById("fotoFachada").files[0];
        if (archivoFachada) urlFachada = await subirImagenACloudinary(archivoFachada);

        // Evidencias
        const urlsEvidencias = [];
        document.querySelectorAll(".evidencia-url").forEach(input => urlsEvidencias.push(input.value));
        const nuevas = document.querySelectorAll("input.nueva-evidencia");
        for (let input of nuevas) {
            if (input.files[0]) urlsEvidencias.push(await subirImagenACloudinary(input.files[0]));
        }

        if (urlsEvidencias.length === 0) {
            alert("Debes tener al menos 1 evidencia.");
            return;
        }

        const datosActualizados = {
            negocio,
            telefono,
            ubicacion,
            referenciaUbicacion,
            especialidad,
            descripcion,
            diasAbierto: diasSeleccionados,
            horaApertura,
            horaCierre,
            horario: `${horaApertura} - ${horaCierre}`,
            montoInicial,
            urlImagen,
            urlFachada,
            redesSociales: redesSeleccionadas,
            usuariosRedes,
            evidencias: urlsEvidencias,
            timestamp: new Date(),
            ubicacionLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`
        };

        try {
            await setDoc(docRef, datosActualizados);
            await updateDoc(doc(db, "usuarios", correoUsuario), {
                esProveedor: true,
                especialidadProveedor: especialidad
            });
            alert("Datos guardados correctamente.");
            window.location.href = "perfilNegocio.html";
        } catch (e) {
            console.error(e);
            alert("Error al guardar cambios.");
        }
    });

    // ---------------------------------------------
    // 🔹 CANCELAR CAMBIOS
    // ---------------------------------------------
    document.getElementById("btnCancelarEdicion").addEventListener("click", () => {
        if (confirm("Cancelar cambios?")) window.location.href = "perfilNegocio.html";
    });

});
