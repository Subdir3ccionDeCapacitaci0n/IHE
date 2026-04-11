const URL = "https://script.google.com/macros/s/AKfycbyvCtkGkJgiM0rDa4wkrFdhd5BjZDxqrTDPKN0QSn40y4KM6yZlnigBLWQ8fuk1D3NT/exec";

const listaPendientes = document.getElementById("listaPendientes");
const listaFirmados = document.getElementById("listaFirmados");
const estadoLogin = document.getElementById("estadoLogin");

let usuarioActivo = null;

/**************** LOGIN ****************/
document.getElementById("usuario").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
document.getElementById("password").addEventListener("keydown", e => { if (e.key === "Enter") login(); });

function login() {
  const usuario = document.getElementById("usuario").value.trim().toUpperCase();
  const password = document.getElementById("password").value.trim();
  estadoLogin.innerText = "";
  if (!usuario || !password) { estadoLogin.innerText = "Ingresa usuario y contraseña"; return; }

  fetch(URL, { method: "POST", body: JSON.stringify({ accion: "login", usuario, password }) })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        usuarioActivo = usuario;
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("panelBox").style.display = "block";
        document.getElementById("password").value = "";
        cargarRegistros();
      } else estadoLogin.innerText = res.mensaje;
    })
    .catch(() => estadoLogin.innerText = "Error de conexión");
}

/**************** CARGAR REGISTROS ****************/
function cargarRegistros() {
  fetch(URL, { method: "POST", body: JSON.stringify({ accion: "pendientes", usuario: usuarioActivo }) })
    .then(r => r.json())
    .then(data => {
      listaPendientes.innerHTML = "";
      listaFirmados.innerHTML = "";
      data.pendientes.forEach(reg => listaPendientes.appendChild(crearCard(reg, true)));
      data.firmados.forEach(reg => listaFirmados.appendChild(crearCard(reg, false)));
    })
    .catch(() => alert("Error cargando registros"));
}

/**************** CREAR TARJETAS ****************/
function crearCard(reg, esPendiente) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `<b>${reg.tipo}</b><br>👤 ${reg.nombre}<br>🕒 ${reg.salida || ""}<br>📌 Motivo: ${reg.asunto || ""}<br>`;

  if (esPendiente) {
    const btn = document.createElement("button");
    btn.textContent = "Firmar";
    btn.onclick = () => {
      let hora = "";
      if (reg.tipo === "PASE" || reg.tipo === "DESAYUNO") {
        hora = prompt("Confirma hora de regreso real (HH:mm):", new Date().toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit', hour12:false}));
        if (!hora) return;
      }
      firmar(reg.tipo, reg.fila, hora);
    };
    div.appendChild(btn);
  } else {
    div.innerHTML += "<b style='color:green'>✔ Ya firmado</b>";
    
    // --- LÓGICA ACTUALIZADA AQUÍ ---
    // Solo generar formato si es estrictamente un PASE
    if (reg.tipo === "PASE") {
      const btnPDF = document.createElement("button");
      btnPDF.textContent = "Generar Formato";
      btnPDF.className = "formato-btn";
      btnPDF.onclick = () => generarFormato(reg.fila, reg.tipo);
      div.appendChild(btnPDF);
    }
  }
  return div;
}

/**************** FIRMAR ****************/
function firmar(tipo, fila, horaLlegada) {
  fetch(URL, {
    method: "POST",
    body: JSON.stringify({ accion: "firmar", usuario: usuarioActivo, tipo, fila, horaLlegadaReal: horaLlegada })
  })
    .then(r => r.json())
    .then(res => { alert(res.mensaje); cargarRegistros(); })
    .catch(() => alert("Error de conexión"));
}

/**************** GENERAR FORMATO ****************/
function generarFormato(fila, tipo) {
  fetch(URL, { method: "POST", body: JSON.stringify({ accion: "generarFormato", fila, tipo }) })
    .then(r => r.json())
    .then(res => {
      if (res.ok) window.open(res.mensaje, "_blank");
      else alert("Error: " + res.mensaje);
    })
    .catch(() => alert("Error generando formato"));
}

/**************** CERRAR SESIÓN ****************/
function cerrarSesion() {
  usuarioActivo = null;
  listaPendientes.innerHTML = "";
  listaFirmados.innerHTML = "";
  document.getElementById("panelBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("usuario").value = "";
  document.getElementById("password").value = "";
  estadoLogin.innerText = "";
}
