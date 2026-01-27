const URL = "https://script.google.com/macros/s/AKfycbyvCtkGkJgiM0rDa4wkrFdhd5BjZDxqrTDPKN0QSn40y4KM6yZlnigBLWQ8fuk1D3NT/exec";

const tipo = document.getElementById("tipo");
const paseDiv = document.getElementById("pase");
const justDiv = document.getElementById("justificante");
const estado = document.getElementById("estado");

tipo.addEventListener("change", () => {
  paseDiv.classList.toggle("hidden", tipo.value !== "PASE");
  justDiv.classList.toggle("hidden", tipo.value !== "JUSTIFICANTE");
});

function enviar() {
  estado.innerText = "";

  const nombre = document.getElementById("nombre").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();

  if (!tipo.value || !nombre || !apellidos) {
    estado.innerText = "Completa los campos obligatorios";
    return;
  }

  const payload = {
    tipo: tipo.value,
    nombre: nombre,
    apellidos: apellidos
  };

  /*************** PASE ***************/
  if (tipo.value === "PASE") {
    const salida = horaSalida.value;
    const llegada = horaLlegada.value;
    const asunto = document.getElementById("asunto").value;

    if (!salida || !llegada || !asunto) {
      estado.innerText = "Completa todos los datos del pase";
      return;
    }

    if (llegada <= salida) {
      estado.innerText = "La llegada debe ser después de la salida";
      return;
    }

    payload.horaSalida = salida;
    payload.horaLlegada = llegada;
    payload.asunto = asunto;
  }

  /*************** JUSTIFICANTE ***************/
  if (tipo.value === "JUSTIFICANTE") {
    const fechaFalta = document.getElementById("fechaFalta").value;
    const motivo = document.getElementById("motivo").value.trim();
    const numeroOficio = document.getElementById("numeroOficio").value.trim();

    if (!fechaFalta || !motivo || !numeroOficio) {
      estado.innerText = "Completa fecha de la falta, motivo y número de oficio";
      return;
    }

    payload.fechaFalta = fechaFalta; // 👈 NUEVO DATO
    payload.motivo = motivo;
    payload.numeroOficio = numeroOficio;
  }

  fetch(URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    estado.innerText = res.mensaje;
    if (res.ok) limpiarFormulario();
  })
  .catch(() => estado.innerText = "Error de conexión");
}

function limpiarFormulario() {
  document.querySelectorAll("input").forEach(i => i.value = "");
  document.querySelectorAll("select").forEach(s => s.value = "");
  paseDiv.classList.add("hidden");
  justDiv.classList.add("hidden");
}