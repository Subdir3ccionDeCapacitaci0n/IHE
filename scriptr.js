"use strict";
/**
 * ============================================================
 *  REGISTRO DE TRÁMITES – Frontend (v2 – refactorizado)
 * ============================================================
 *  CAMBIOS vs. v1
 *  1. Timeout (20 s) con AbortController: el botón ya no puede quedarse en "Enviando..." para siempre.
 *  2. Clave de idempotencia por envío (idempotencyKey): si hay timeout/corte y el usuario reintenta,
 *     el servidor puede detectar el duplicado (ver snippet en el informe).
 *  3. Validación en cliente: recorte de espacios, teléfono de 10 dígitos, longitudes máximas.
 *  4. Se muestra el mensaje real del servidor cuando existe (antes siempre error genérico).
 *  5. Se mantiene Content-Type text/plain (correcto: evita el preflight CORS que Apps Script no soporta).
 *  6. Sin cambios requeridos en registro.html: seleccionarTramite sigue siendo global.
 */

const URL_REGISTRO = "https://script.google.com/macros/s/AKfycby5trUHvjbYwNUYSvqm1eEl5hRhBjVF9CUedrDZ0uU_CXq3dYr0PA0UJVd-RzqCP07i/exec";
const TIMEOUT_MS = 20000;
const MAX_LEN = 100;

const formulario = document.getElementById("formulario");
const mensaje = document.getElementById("mensaje");
const mensajeGlobal = document.getElementById("mensajeGlobal");
const selectorTramite = document.getElementById("selectorTramite");

let tramiteSeleccionado = "";
let enviando = false;
let claveEnvio = null; // se conserva entre reintentos del MISMO formulario y se limpia al terminar bien

function seleccionarTramite(valor) {
  tramiteSeleccionado = valor;
  claveEnvio = null;

  formulario.classList.add("hidden");
  mensaje.innerText = "";
  mensaje.classList.remove("exito");
  mensajeGlobal.classList.add("hidden");

  if (!valor) return;

  const opcion = selectorTramite.selectedOptions[0];
  document.getElementById("tituloTramite").innerText = opcion ? opcion.textContent : valor;
  formulario.classList.remove("hidden");

  alternarCampo("nivelEscolar", valor === "Beca_Comision");
  alternarCampo("direccion", valor === "Servidor_Publico_Mes");
}

function alternarCampo(id, visible) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden", !visible);
  el.required = visible;
  if (!visible) el.value = "";
}

function leerCampos() {
  const v = id => document.getElementById(id).value.trim();
  return {
    nombre: v("nombre"),
    apellidos: v("apellidos"),
    telefono: v("telefono").replace(/[\s\-().]/g, ""),
    correo: v("correo"),
    genero: document.getElementById("genero").value
  };
}

function validar(d) {
  if (!tramiteSeleccionado) return "Seleccione un trámite.";
  if (!d.nombre || !d.apellidos) return "Nombre y apellidos son obligatorios.";
  if (!/^\d{10}$/.test(d.telefono)) return "El teléfono debe tener 10 dígitos.";
  if (Object.values(d).some(x => x.length > MAX_LEN)) return "Algún campo excede " + MAX_LEN + " caracteres.";
  return "";
}

formulario.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (enviando) return;

  const d = leerCampos();
  const errorValidacion = validar(d);
  if (errorValidacion) {
    mensaje.classList.remove("exito");
    mensaje.innerText = errorValidacion;
    return;
  }

  const data = { tramite: tramiteSeleccionado, ...d };
  if (tramiteSeleccionado === "Beca_Comision") {
    data.nivel_escolar = document.getElementById("nivelEscolar").value;
  }
  if (tramiteSeleccionado === "Servidor_Publico_Mes") {
    data.direccion = document.getElementById("direccion").value.trim();
  }
  claveEnvio = claveEnvio || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  data.idempotencyKey = claveEnvio;

  enviando = true;
  const boton = formulario.querySelector("button");
  boton.disabled = true;
  boton.innerText = "Enviando...";
  mensaje.classList.remove("exito");
  mensaje.innerText = "Enviando datos...";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(URL_REGISTRO, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
      body: JSON.stringify(data),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const texto = await res.text();
    let r;
    try { r = JSON.parse(texto); } catch (_) { throw new Error("Respuesta no válida del servidor"); }

    if (r.status === "nuevo" || r.status === "actualizado" || r.status === "ok") {
      claveEnvio = null;
      mensajeGlobal.innerText = "Los datos se enviaron correctamente.";
      mensajeGlobal.classList.remove("hidden");
      mensajeGlobal.classList.add("exito");

      formulario.reset();
      formulario.classList.add("hidden");
      selectorTramite.value = "";
      tramiteSeleccionado = "";
      mensaje.innerText = "";
      setTimeout(() => mensajeGlobal.classList.add("hidden"), 5000);
    } else {
      mensaje.innerText = r.message || "Ocurrió un error al enviar los datos.";
    }
  } catch (err) {
    console.error(err);
    mensaje.innerText = err.name === "AbortError"
      ? "El servidor tardó demasiado. Pulse «Enviar Registro» otra vez (no se duplicará)."
      : "Error de conexión. Verifique su red e intente de nuevo.";
  } finally {
    clearTimeout(timer);
    enviando = false;
    boton.disabled = false;
    boton.innerText = "Enviar Registro";
  }
});
