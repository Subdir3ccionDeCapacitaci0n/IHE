const formulario = document.getElementById("formulario");
const mensaje = document.getElementById("mensaje");
const mensajeGlobal = document.getElementById("mensajeGlobal");

let tramiteSeleccionado = "";
let enviando = false; // BLOQUEO DE DOBLE ENVÍO

function seleccionarTramite(valor) {
  tramiteSeleccionado = valor;

  formulario.classList.add("hidden");
  mensaje.innerText = "";
  mensajeGlobal.classList.add("hidden");

  if (!valor) return;

  document.getElementById("tituloTramite").innerText =
    document.querySelector(`option[value="${valor}"]`).textContent;

  formulario.classList.remove("hidden");

  // Campo nivel escolar (Beca Comisión)
  const nivel = document.getElementById("nivelEscolar");
  if (valor === "Beca_Comision") {
    nivel.classList.remove("hidden");
    nivel.required = true;
  } else {
    nivel.classList.add("hidden");
    nivel.required = false;
    nivel.value = "";
  }

  // Campo dirección (Servidor Público del Mes)
  const direccion = document.getElementById("direccion");
  if (valor === "Servidor_Publico_Mes") {
    direccion.classList.remove("hidden");
    direccion.required = true;
  } else {
    direccion.classList.add("hidden");
    direccion.required = false;
    direccion.value = "";
  }
}

formulario.addEventListener("submit", function (e) {
  e.preventDefault();

  // EVITAR DOBLE ENVÍO
  if (enviando) return;
  enviando = true;

  const boton = formulario.querySelector("button");
  boton.disabled = true;
  boton.innerText = "Enviando...";

  mensaje.innerText = "Enviando datos...";
  mensaje.classList.remove("exito");

  const data = {
    tramite: tramiteSeleccionado,
    nombre: document.getElementById("nombre").value,
    apellidos: document.getElementById("apellidos").value,
    telefono: document.getElementById("telefono").value,
    correo: document.getElementById("correo").value
  };

  // Enviar nivel escolar solo si aplica
  if (tramiteSeleccionado === "Beca_Comision") {
    data.nivel_escolar = document.getElementById("nivelEscolar").value;
  }

  // Enviar dirección solo si aplica
  if (tramiteSeleccionado === "Servidor_Publico_Mes") {
    data.direccion = document.getElementById("direccion").value;
  }

  fetch("https://script.google.com/macros/s/AKfycbzdqlEJ8_e10STjrES60SdM6x_VK1HF3CShLPj06vCvjj-AYkccutLVsf0xL93ZcyUx/exec", {
    method: "POST",
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(res => {
      if (res.status === "ok") {

        // MENSAJE GLOBAL DE ÉXITO
        mensajeGlobal.innerText = "Los datos se enviaron correctamente.";
        mensajeGlobal.classList.remove("hidden");
        mensajeGlobal.classList.add("exito");

        // REGRESAR A PANTALLA PRINCIPAL
        formulario.reset();
        formulario.classList.add("hidden");
        document.getElementById("selectorTramite").value = "";
        mensaje.innerText = "";

        // OCULTAR MENSAJE DESPUÉS DE 5 SEGUNDOS
        setTimeout(() => {
          mensajeGlobal.classList.add("hidden");
        }, 5000);

      } else {
        mensaje.innerText = "Ocurrió un error al enviar los datos.";
      }
    })
    .catch(() => {
      mensaje.innerText = "Error de conexión.";
    })
    .finally(() => {
      // REACTIVAR BOTÓN SIEMPRE
      enviando = false;
      boton.disabled = false;
      boton.innerText = "Enviar trámite";
    });
});