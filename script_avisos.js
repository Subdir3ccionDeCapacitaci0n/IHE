
"use strict";

/**
 * PANEL DE AVISOS – Frontend
 * Versión sin clave de acceso.
 */

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycby-TahiSn8f0s-Ugi4NYy03HJWCkseAnpxtrTnCRrdIkm3GObCjNCggfXWm4oxuUHIO/exec";

const INTERVALO_BASE_MS = 5000;
const INTERVALO_MAX_MS = 60000;
const TIMEOUT_MS = 15000;
const REINTENTOS_ESCRITURA = 2;

const AUDIO_DEFAULT = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const AUDIOS_TRAMITES = {
  "BECA_COMISION": "becaco.mp3",
  "SERVICIO_SOCIAL": "serviso.mp3",
  "SERVIDOR_PUBLICO_MES": "servipu.mp3",
  "CONTRATO_SUSTITUTO": "contrasus.mp3",
  "CAPACITACION": "capacitacion.mp3",
  "EVALUACIONES_NUEVO_INGRESO": "evalu.mp3"
};

/* ===================== ESTADO ===================== */

const filas = new Map();
const idsConocidos = new Set();

let personal = [];
let primeraCarga = true;
let huellaUltima = "";
let timerSondeo = null;
let sondeando = false;
let fallosSeguidos = 0;
let ultimoExito = 0;
let ultimaEscrituraFin = 0;

const colaEscritura = [];
let procesandoCola = false;

const elLista = document.getElementById("listaAvisos");
const elStatus = document.getElementById("status");
const elReloj = document.getElementById("reloj");

/* ===================== UTILIDADES ===================== */

const esperar = ms => new Promise(r => setTimeout(r, ms));

async function fetchConTimeout(url, opciones = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);

  try {
    return await fetch(url, {
      ...opciones,
      signal: ctrl.signal
    });
  } finally {
    clearTimeout(t);
  }
}

async function leerJSON(res) {
  if (!res.ok) throw new Error("HTTP " + res.status);

  const txt = await res.text();

  try {
    return JSON.parse(txt);
  } catch (_) {
    throw new Error("Respuesta no válida del servidor");
  }
}

function setStatus(texto, nivel) {
  elStatus.textContent = texto;
  elStatus.style.color =
    nivel === "error" ? "#e74c3c" :
    nivel === "warn" ? "#f1c40f" : "";
}

/* ===================== TOASTS ===================== */

const contenedorToast = document.createElement("div");

contenedorToast.style.cssText =
  "position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:9999;max-width:360px";

document.body.appendChild(contenedorToast);

function toast(msg, nivel = "info") {
  const t = document.createElement("div");

  const color =
    nivel === "error" ? "#c0392b" :
    nivel === "warn" ? "#b9770e" : "#2c3e50";

  t.style.cssText =
    `background:${color};color:#fff;padding:10px 14px;border-radius:6px;font-size:.9rem;box-shadow:0 2px 8px rgba(0,0,0,.5)`;

  t.textContent = msg;
  contenedorToast.appendChild(t);

  setTimeout(() => t.remove(), 6000);
}

/* ===================== RELOJ ===================== */

setInterval(() => {
  elReloj.textContent = new Date().toLocaleTimeString(
    "es-MX",
    { hour12: false }
  );
}, 1000);

/* ===================== AUDIO ===================== */

const reproductor = document.getElementById("audioNotificacion");

const colaAudio = [];

let reproduciendo = false;
let audioBloqueado = false;

function encolarAudio(tramite) {
  colaAudio.push(
    AUDIOS_TRAMITES[String(tramite).toUpperCase()] || AUDIO_DEFAULT
  );

  siguienteAudio();
}

function siguienteAudio() {
  if (reproduciendo || !colaAudio.length || !reproductor) return;

  reproduciendo = true;

  const url = colaAudio.shift();

  const terminar = () => {
    reproduciendo = false;
    siguienteAudio();
  };

  reproductor.onended = terminar;

  reproductor.onerror = () => {
    if (reproductor.src !== AUDIO_DEFAULT) {
      reproductor.src = AUDIO_DEFAULT;
      reproductor.play().catch(terminar);
    } else {
      terminar();
    }
  };

  reproductor.src = url;

  reproductor.play().then(() => {
    audioBloqueado = false;
  }).catch(() => {
    audioBloqueado = true;
    reproduciendo = false;
    colaAudio.length = 0;

    toast(
      "🔇 Haz clic en la página para activar el sonido",
      "warn"
    );
  });
}

document.addEventListener("pointerdown", () => {
  audioBloqueado = false;
}, { passive: true });

/* ===================== SONDEO ===================== */

function programar(ms) {
  clearTimeout(timerSondeo);
  timerSondeo = setTimeout(sondear, ms);
}

async function sondear() {
  if (sondeando) return;

  if (colaEscritura.length || procesandoCola) {
    programar(1000);
    return;
  }

  sondeando = true;

  const inicio = Date.now();

  let proximoMs = INTERVALO_BASE_MS;

  try {
    // Consulta sin clave de acceso
    const res = await fetchConTimeout(
      `${URL_SCRIPT}?t=${Date.now()}`
    );

    const data = await leerJSON(res);

    if (!data.ok) {
      throw new Error(
        data.message || data.code || "Error del servidor"
      );
    }

    if (
      inicio < ultimaEscrituraFin ||
      colaEscritura.length ||
      procesandoCola
    ) {
      proximoMs = 500;
      return;
    }

    fallosSeguidos = 0;
    ultimoExito = Date.now();

    personal = Array.isArray(data.personal)
      ? data.personal
      : personal;

    const registros = Array.isArray(data.registros)
      ? data.registros
      : [];

    const huella = JSON.stringify(registros);

    if (huella !== huellaUltima) {
      detectarNuevos(registros);
      renderizar(registros);
      huellaUltima = huella;
    }

    setStatus(
      "Sincronizado: " +
      new Date().toLocaleTimeString("es-MX", {
        hour12: false
      })
    );

  } catch (err) {
    fallosSeguidos++;

    proximoMs = Math.min(
      INTERVALO_MAX_MS,
      INTERVALO_BASE_MS * 2 ** Math.min(fallosSeguidos, 5)
    );

    proximoMs += Math.random() * 1000;

    const hace = ultimoExito
      ? new Date(ultimoExito).toLocaleTimeString(
          "es-MX",
          { hour12: false }
        )
      : "nunca";

    setStatus(
      `⚠ Sin conexión con el servidor (último dato: ${hace}). Reintentando en ${Math.round(proximoMs / 1000)} s…`,
      "error"
    );

    console.warn("Sondeo fallido:", err.message);

  } finally {
    sondeando = false;
    programar(proximoMs);
  }
}

/* ===================== DETECTAR NUEVOS ===================== */

function detectarNuevos(registros) {
  const actuales = new Set();

  registros.forEach(r => {
    actuales.add(r.id);

    if (!idsConocidos.has(r.id)) {
      idsConocidos.add(r.id);

      if (!primeraCarga && !r.atendio) {
        encolarAudio(r.tramite);
      }
    }
  });

  idsConocidos.forEach(id => {
    if (!actuales.has(id)) idsConocidos.delete(id);
  });

  primeraCarga = false;
}

/* ===================== RENDERIZADO ===================== */

const elVacio = document.createElement("li");

elVacio.style.cssText =
  "text-align:center;opacity:.5;margin-top:20px;list-style:none";

elVacio.textContent = "No hay registros el día de hoy.";

function renderizar(registros) {
  if (!registros.length) {
    filas.forEach(f => f.li.remove());
    filas.clear();

    if (!elVacio.isConnected) {
      elLista.appendChild(elVacio);
    }

    return;
  }

  elVacio.remove();

  const vistos = new Set();

  registros.forEach((reg, i) => {
    vistos.add(reg.id);

    let f = filas.get(reg.id);

    if (!f) {
      f = crearFila(reg);
      filas.set(reg.id, f);
    }

    f.reg = reg;

    if (!f.enviando) {
      aplicarEstado(f, reg.atendio || "");
    }

    const enPosicion = elLista.children[i];

    if (enPosicion !== f.li) {
      elLista.insertBefore(f.li, enPosicion || null);
    }
  });

  filas.forEach((f, id) => {
    if (!vistos.has(id)) {
      f.li.remove();
      filas.delete(id);
    }
  });
}

function crearFila(reg) {
  const li = document.createElement("li");

  li.className = "item-aviso";
  li.dataset.tramite = reg.tramite;

  const tag = document.createElement("span");

  tag.className = "tramite-tag";
  tag.textContent = reg.tramite.replace(/_/g, " ");

  const usuario = document.createElement("span");

  usuario.className = "usuario-nombre";
  usuario.textContent = reg.nombre;

  const controles = document.createElement("div");

  controles.className = "atencion-controles";

  const select = document.createElement("select");
  const btn = document.createElement("button");

  btn.type = "button";

  controles.append(select, btn);

  const hora = document.createElement("span");

  hora.className = "hora";
  hora.textContent = reg.hora;

  li.append(tag, usuario, controles, hora);

  const f = {
    li,
    select,
    btn,
    reg,
    estado: null,
    enviando: false
  };

  btn.addEventListener("click", () => marcarAtendido(f));

  return f;
}

/* ===================== ESTADO DE ATENCIÓN ===================== */

function aplicarEstado(f, atendio) {
  const clave = atendio || "";

  if (f.estado === clave) return;

  f.estado = clave;

  const { select, btn, li } = f;

  select.replaceChildren();

  if (clave) {
    select.append(new Option(clave, clave));

    select.disabled = true;
    select.style.opacity = "0.8";
    select.style.borderColor = "#27ae60";

    btn.disabled = true;
    btn.textContent = "✔";
    btn.classList.add("btn-check");
    btn.style.cursor = "default";

    li.classList.add("finalizado");

  } else {
    select.append(new Option("Atendió...", ""));

    personal.forEach(p => {
      select.append(new Option(p, p));
    });

    select.disabled = false;
    select.style.opacity = "";
    select.style.borderColor = "";

    btn.disabled = false;
    btn.textContent = "OK";
    btn.classList.remove("btn-check");
    btn.style.cursor = "";

    li.classList.remove("finalizado");
  }
}

/* ===================== ESCRITURA ===================== */

function marcarAtendido(f) {
  if (f.enviando) return;

  const empleado = f.select.value;

  if (!empleado) {
    return toast("Selecciona quién atendió.", "warn");
  }

  f.enviando = true;

  aplicarEstado(f, empleado);

  colaEscritura.push({ f, empleado });

  procesarCola();
}

async function procesarCola() {
  if (procesandoCola) return;

  procesandoCola = true;

  while (colaEscritura.length) {
    const { f, empleado } = colaEscritura[0];

    try {
      const r = await enviarAtencion(f.reg, empleado);

      if (r.ok) {
        f.reg.atendio = empleado;

      } else if (r.code === "ALREADY_ATTENDED") {
        toast(`Ya fue atendido por ${r.atendio}`, "warn");

        f.reg.atendio = r.atendio;
        f.enviando = false;
        f.estado = null;

        aplicarEstado(f, r.atendio);

      } else if (r.code === "ROW_CHANGED") {
        revertir(
          f,
          "El registro cambió en la hoja; se actualizará la lista."
        );

        huellaUltima = "";

      } else {
        revertir(
          f,
          `No se guardó (${r.message || r.code}).`
        );
      }

    } catch (err) {
      revertir(
        f,
        `Error de red, no se guardó: ${f.reg.nombre}`
      );
    }

    f.enviando = false;

    colaEscritura.shift();

    ultimaEscrituraFin = Date.now();
  }

  procesandoCola = false;

  programar(300);
}

async function enviarAtencion(reg, empleado) {
  const cuerpo = JSON.stringify({
    accion: "atender",
    tramite: reg.tramite,
    filaReal: reg.filaReal,
    timestamp: reg.timestamp,
    nombre: reg.nombre,
    empleado
  });

  let ultimoError;

  for (let i = 0; i <= REINTENTOS_ESCRITURA; i++) {
    try {
      const res = await fetchConTimeout(URL_SCRIPT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: cuerpo
      });

      const r = await leerJSON(res);

      if (
        r.code === "BUSY" &&
        i < REINTENTOS_ESCRITURA
      ) {
        await esperar(1000 * 2 ** i);
        continue;
      }

      return r;

    } catch (err) {
      ultimoError = err;
      await esperar(1000 * 2 ** i);
    }
  }

  throw ultimoError;
}

function revertir(f, mensaje) {
  toast(mensaje, "error");

  f.estado = null;

  aplicarEstado(f, "");
}

/* ===================== EVENTOS ===================== */

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    programar(0);
  }
});

window.addEventListener("online", () => {
  programar(0);
});

// Iniciar panel
sondear();
