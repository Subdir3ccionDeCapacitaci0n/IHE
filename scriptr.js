const formulario = document.getElementById("formulario");
const mensaje = document.getElementById("mensaje");
const mensajeGlobal = document.getElementById("mensajeGlobal");

let tramiteSeleccionado = "";
let enviando = false; 

function seleccionarTramite(valor) {
  tramiteSeleccionado = valor;

  formulario.classList.add("hidden");
  mensaje.innerText = "";
  mensajeGlobal.classList.add("hidden");

  if (!valor) return;

  document.getElementById("tituloTramite").innerText =
    document.querySelector(`option[value="${valor}"]`).textContent;

  formulario.classList.remove("hidden");

  const nivel = document.getElementById("nivelEscolar");
  if (valor === "Beca_Comision") {
    nivel.classList.remove("hidden");
    nivel.required = true;
  } else {
    nivel.classList.add("hidden");
    nivel.required = false;
    nivel.value = "";
  }

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
    correo: document.getElementById("correo").value,
    genero: document.getElementById("genero").value // <-- GÉNERO AÑADIDO
  };

  if (tramiteSeleccionado === "Beca_Comision") {
    data.nivel_escolar = document.getElementById("nivelEscolar").value;
  }

  if (tramiteSeleccionado === "Servidor_Publico_Mes") {
    data.direccion = document.getElementById("direccion").value;
  }

  fetch("https://script.google.com/macros/s/AKfycby-TahiSn8f0s-Ugi4NYy03HJWCkseAnpxtrTnCRrdIkm3GObCjNCggfXWm4oxuUHIO/exec", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8" // <-- ESTO MATA EL ERROR DE CONEXIÓN
    },
    body: JSON.stringify(data)
  })
    .then(async (res) => {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error("Respuesta no válida del servidor");
      }
    })
    .then(res => {
      // <-- CORREGIDO: Apps Script manda "nuevo" o "actualizado", no "ok"
      if (res.status === "nuevo" || res.status === "actualizado" || res.status === "ok") {
        mensajeGlobal.innerText = "Los datos se enviaron correctamente.";
        mensajeGlobal.classList.remove("hidden");
        mensajeGlobal.classList.add("exito");

        formulario.reset();
        formulario.classList.add("hidden");
        document.getElementById("selectorTramite").value = "";
        mensaje.innerText = "";

        setTimeout(() => {
          mensajeGlobal.classList.add("hidden");
        }, 5000);
      } else {
        mensaje.innerText = "Ocurrió un error al enviar los datos.";
      }
    })
    .catch((err) => {
      mensaje.innerText = "Error de conexión.";
      console.error(err);
    })
    .finally(() => {
      // <-- ESTO EVITA QUE EL BOTÓN SE QUEDE CONGELADO EN "ENVIANDO..."
      enviando = false;
      boton.disabled = false;
      boton.innerText = "Enviar Registro";
    });
});
