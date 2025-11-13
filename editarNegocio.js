import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
    getFirestore,
    doc, setDoc,
    updateDoc, getDoc
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

const negocioId = localStorage.getItem('negocioId');
const usuarioData = JSON.parse(localStorage.getItem("usuarioLogueado"));
const usuario = usuarioData?.correo?.trim().toLowerCase();

if (!negocioId || !usuario) {
    alert("No se encontró el usuario o negocio.");
}

// ✅ Variables globales
let archivoImagenPerfil = null;
let archivoImagenFachada = null;
let archivosEvidenciasNuevas = [];

// Subir imagen/video a Cloudinary
async function subirImagenACloudinary(file) {
    const esVideo = file.type.startsWith("video/");
    const tipo = esVideo ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/dcxhk1f1l/${tipo}/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "preset_eventia");

    const response = await fetch(url, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Error al subir archivo a Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
}

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

// Función principal de edición
window.addEventListener("DOMContentLoaded", async () => {
    // 🔹 Recuperamos y parseamos bien el usuario
    const usuarioData = JSON.parse(localStorage.getItem("usuarioLogueado"));
    const usuario = usuarioData?.correo?.trim().toLowerCase();  // ✅ solo el correo
    const negocioId = localStorage.getItem("negocioId");

    console.log("📌 Intentando leer negocio:");
    console.log("Usuario ID:", usuario);   // 👉 aquí debe salir solo el correo
    console.log("Negocio ID:", negocioId);

    if (!usuario || !negocioId) {
        alert("No se encontró el usuario o negocio.");
        return;
    }

    // 🔹 Ahora sí usamos el correo como ID del doc
    const docRef = doc(db, "usuarios", usuario, "negocios", negocioId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        console.error("⚠️ No existe el documento en Firestore con esa ruta.");
        alert("No se encontraron datos del negocio para editar.");
        return;
    }

    const datos = docSnap.data();
    console.log("✅ Datos obtenidos:", datos);



    const btn = document.getElementById("btnGuardarCambios");
    btn.textContent = "Guardar Datos";

    document.getElementById("negocio").value = datos.negocio || "";
    document.getElementById("telefono").value = datos.telefono || "";
    document.getElementById("ubicacion").value = datos.ubicacion || "";
    document.getElementById("especialidad").value = datos.especialidad || "";
    document.getElementById("descripcion").value = datos.descripcion || "";
    document.getElementById("horaApertura").value = datos.horario.split(" - ")[0];
    document.getElementById("horaCierre").value = datos.horario.split(" - ")[1];
    document.getElementById("montoInicial").value = datos.montoInicial || "";
    document.getElementById("referencias").value = datos.referenciaUbicacion || "";
    document.getElementById("mapLinkText").style.display = datos.ubicacionLink ? "block" : "none";

    // Mostrar foto de perfil si ya existe
    if (datos.urlImagen) {
        const contenedor = document.getElementById("previewFotoPerfil");
        contenedor.innerHTML = `<img src="${datos.urlImagen}" class="img-fluid rounded" style="max-width: 200px;" alt="Foto actual de perfil">`;
    }

    if (datos.urlFachada) {
        document.getElementById("previewFachadaImg").src = datos.urlFachada;
        document.getElementById("previewFachadaImg").style.display = "block";
    }

    // Vista previa de foto de perfil cuando se selecciona un archivo nuevo
    const inputFotoPerfil = document.getElementById("fotoPerfil");
    const preview = document.getElementById("previewFotoPerfil");

    inputFotoPerfil.addEventListener("change", () => {
        const archivo = inputFotoPerfil.files[0];

        if (archivo && archivo.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.innerHTML = `<img src="${e.target.result}" class="img-fluid rounded" style="max-width: 200px;" alt="Vista previa de perfil">`;
            };
            reader.readAsDataURL(archivo);
        } else {
            preview.innerHTML = "";
        }
    });



    if (Array.isArray(datos.redesSociales)) {
        datos.redesSociales.forEach(red => {
            const checkbox = document.getElementById(red.toLowerCase()) || document.getElementById("otro");
            if (checkbox) {
                checkbox.checked = true;
                mostrarCampoRed(checkbox);
                const input = document.getElementById(`usuario-${checkbox.id}`);
                if (input) input.value = datos.usuariosRedes?.[red] || "";
            }
        });
    }

    // Mostrar evidencias existentes
    const contenedorEvidencias = document.getElementById("contenedorEvidencias");

    if (Array.isArray(datos.evidencias)) {
        datos.evidencias.forEach(url => {
            const div = document.createElement("div");
            div.classList.add("mb-3", "evidencia-item");

            const esVideo = url.includes("video") || url.match(/\.(mp4|webm|ogg)$/);
            div.innerHTML = `
        <div class="d-flex flex-column align-items-center">
          ${esVideo
                    ? `<video src="${url}" controls style="width: 100%; max-width: 300px;" class="mb-2"></video>`
                    : `<img src="${url}" class="img-fluid mb-2" style="max-width: 300px;" />`}
          <button type="button" class="btn btn-danger btn-sm eliminar-evidencia">Eliminar</button>
          <input type="hidden" class="evidencia-url" value="${url}">
        </div>
      `;
            contenedorEvidencias.appendChild(div);
        });

        // Escuchar clicks en botones de eliminar
        contenedorEvidencias.addEventListener("click", (e) => {
            if (e.target.classList.contains("eliminar-evidencia")) {
                e.target.closest(".evidencia-item").remove();
            }
        });
    }

    // Guardar cambios
    btn.addEventListener("click", async () => {
        const usuarioData = JSON.parse(localStorage.getItem("usuarioLogueado"));
        const usuario = usuarioData?.correo?.trim().toLowerCase();
        if (!usuario) {
            alert("Sesión no iniciada.");
            return;
        }

        const negocio = document.getElementById("negocio").value.trim();
        const telefono = document.getElementById("telefono").value.trim();
        const especialidad = document.getElementById("especialidad").value.trim();
        const descripcion = document.getElementById("descripcion").value.trim();
        const horaApertura = document.getElementById("horaApertura").value.trim();
        const horaCierre = document.getElementById("horaCierre").value.trim();
        const horario = `${horaApertura} - ${horaCierre}`;
        const montoInicial = document.getElementById("montoInicial").value.trim();

        // 🕒 Validar horas de apertura y cierre
        if (!horaApertura || !horaCierre) {
            alert("Debes ingresar las horas de apertura y cierre.");
            return;
        }

        const ubicacion = document.getElementById("ubicacion").value.trim();

        const redesSeleccionadas = [];
        const usuariosRedes = {};

        document.querySelectorAll('input[name="redSocial"]:checked').forEach(checkbox => {
            const red = checkbox.value;
            const input = document.getElementById(`usuario-${checkbox.id}`);
            const usuarioRed = input?.value.trim();
            if (usuarioRed) {
                redesSeleccionadas.push(red);
                usuariosRedes[red] = usuarioRed;
            }
        });

        const archivoPerfil = document.getElementById("fotoPerfil").files[0];
        let urlImagen = datos.urlImagen || "";

        try {
            if (archivoPerfil) {
                urlImagen = await subirImagenACloudinary(archivoPerfil);
            }
        } catch (error) {
            alert("No se pudo subir la imagen.");
            return;
        }


        // ✅ Manejar la fachada
        const archivoFachada = document.getElementById("fotoFachada").files[0];
        let urlFachada = datos.urlFachada || "";

        try {
            if (archivoFachada) {
                urlFachada = await subirImagenACloudinary(archivoFachada);
            }
        } catch (error) {
            console.error("❌ Error al subir fachada:", error);
            alert("No se pudo subir la imagen de fachada.");
            return;
        }



        const urlsEvidencias = [];

        contenedorEvidencias.querySelectorAll("input[type='file']").forEach(input => {
            if (!input.files[0]) input.closest(".evidencia-item")?.remove();
        });

        const nuevosArchivos = contenedorEvidencias.querySelectorAll("input[type='file']");
        for (let input of nuevosArchivos) {
            const archivo = input.files[0];
            if (archivo) {
                try {
                    const url = await subirImagenACloudinary(archivo);
                    urlsEvidencias.push(url);
                } catch (err) {
                    console.warn("Error subiendo evidencia:", err);
                }
            }
        }

        document.querySelectorAll(".evidencia-url").forEach(input => {
            urlsEvidencias.push(input.value);
        });

        if (urlsEvidencias.length === 0) {
            alert("Debes subir al menos una evidencia.");
            return;
        }

        const datosActualizados = {
            negocio,
            telefono,
            redesSociales: redesSeleccionadas,
            usuariosRedes,
            especialidad,
            descripcion,
            horario,
            ubicacion,
            montoInicial,
            urlImagen,
            urlFachada,
            evidencias: urlsEvidencias,
            timestamp: new Date()
        };

        try {
            const negocioId = localStorage.getItem("negocioId"); // ✅ usamos siempre el mismo
            const userRef = doc(db, "usuarios", usuario);
            const negocioRef = doc(db, "usuarios", usuario, "negocios", negocioId);


            await setDoc(negocioRef, datosActualizados);
            await updateDoc(userRef, {
                esProveedor: true,
                especialidadProveedor: especialidad
            });

            localStorage.setItem("datosNegocio", JSON.stringify(datosActualizados));
            alert("Datos guardados correctamente.");
            window.location.href = "perfilNegocio.html";
        } catch (error) {
            console.error("Error al guardar cambios:", error);
            alert("Error al guardar datos.");
        }
    });

    // Botón Cancelar
    document.getElementById("btnCancelarEdicion").addEventListener("click", function () {
        const confirmacion = confirm("¿Seguro que deseas cancelar los cambios? Se perderán los datos no guardados.");
        if (!confirmacion) return;

        window.location.href = "perfilNegocio.html";
    });

    // Agregar nueva evidencia (máx 6)
    const botonAgregar = document.getElementById("agregarEvidencia");
    const contenedor = document.getElementById("contenedorEvidencias");

    botonAgregar.addEventListener("click", () => {
        const actuales = contenedorEvidencias.querySelectorAll(".evidencia-item").length;
        if (actuales >= 6) {
            alert("Solo puedes subir hasta 6 evidencias.");
            return;
        }

        const nuevoInput = document.createElement("div");
        nuevoInput.classList.add("mb-3", "evidencia-item");

        nuevoInput.innerHTML = `
      <input type="file" class="form-control mb-2" accept="image/*,video/*" />
      <button type="button" class="btn btn-danger btn-sm eliminar-evidencia">Eliminar</button>
    `;

        contenedor.appendChild(nuevoInput);

        // Mostrar vista previa al seleccionar archivo evidencias
        const inputFile = nuevoInput.querySelector("input[type='file']");
        inputFile.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                let preview = nuevoInput.querySelector(".preview");
                if (!preview) {
                    preview = document.createElement("div");
                    preview.classList.add("mt-2", "preview", "d-flex", "flex-column", "align-items-center");
                    nuevoInput.appendChild(preview);
                }

                const reader = new FileReader();
                reader.onload = function (event) {
                    if (file.type.startsWith("image/")) {
                        preview.innerHTML = `<img src="${event.target.result}" class="img-fluid mb-2" style="max-width: 300px;" />`;
                    } else if (file.type.startsWith("video/")) {
                        preview.innerHTML = `<video src="${event.target.result}" controls class="mb-2" style="max-width: 300px;"></video>`;
                    } else {
                        preview.innerHTML = `<p>Archivo no compatible para vista previa</p>`;
                    }

                    // Mostrar botón eliminar
                    let btnEliminar = nuevoInput.querySelector(".eliminar-evidencia");
                    if (!btnEliminar) {
                        btnEliminar = document.createElement("button");
                        btnEliminar.type = "button";
                        btnEliminar.className = "btn btn-danger btn-sm eliminar-evidencia";
                        btnEliminar.textContent = "Eliminar";
                        btnEliminar.addEventListener("click", () => {
                            nuevoInput.remove();
                        });
                    }

                    if (!preview.contains(btnEliminar)) {
                        preview.appendChild(btnEliminar);
                    }

                    btnEliminar.style.display = "inline-block";
                };
                reader.readAsDataURL(file);
            }
        });

        // Botón eliminar de la nueva evidencia
        nuevoInput.querySelector(".eliminar-evidencia").addEventListener("click", () => {
            nuevoInput.remove();
        });
    });


    document.getElementById("verEnMapa").addEventListener("click", (event) => {
        event.preventDefault();     // Evita recargar la página
        event.stopPropagation();    // Evita que el formulario capture el clic

        const ubicacionInput = document.getElementById("ubicacion").value.trim();

        if (!ubicacionInput) {
            alert("Por favor, ingresa la ubicación del negocio antes de abrir en Maps.");
            return;
        }

        const query = encodeURIComponent(ubicacionInput);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

        // Abre Google Maps directamente en una nueva pestaña
        window.open(mapsUrl, "_blank");

        // (Opcional) mostrar el link debajo del input
        const mapLink = document.getElementById("mapLink");
        const mapLinkText = document.getElementById("mapLinkText");
        mapLink.href = mapsUrl;
        mapLinkText.style.display = "block";
    });


});
