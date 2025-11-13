window.addEventListener("DOMContentLoaded", () => {
  const correo = localStorage.getItem("correoNoRegistrado");
  const correoEl = document.getElementById("correo");

  if (correoEl) {
    correoEl.textContent = correo?.trim() || "Correo desconocido";
  } else {
    console.warn("⚠️ No se encontró el elemento con id='correo'");
  }
});
