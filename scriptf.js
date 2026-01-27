const URL = "https://script.google.com/macros/s/AKfycbyvCtkGkJgiM0rDa4wkrFdhd5BjZDxqrTDPKN0QSn40y4KM6yZlnigBLWQ8fuk1D3NT/exec";

const listaPendientes = document.getElementById("listaPendientes");
const listaFirmados = document.getElementById("listaFirmados");
const estadoLogin = document.getElementById("estadoLogin");

let usuarioActivo = null;

/**************** ENTER PARA LOGIN ****************/
document.getElementById("usuario").addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

document.getElementById("password").addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

/**************** LOGIN ****************/
function login() {
  const usuario = document.getElementById("usuario").value.trim().toUpperCase();
  const password = document.getElementById("password").value.trim();

  estadoLogin.innerText = "";

  if (!usuario || !password) {
    estadoLogin.innerText = "Ingresa usuario y contraseña";
    return;
  }

  fetch(URL, {
    method: "POST",
    body: JSON.stringify({ accion: "login", usuario, password })
  })
  .then(r => r.json())
  .then(res => {
    if (res.ok) {
      usuarioActivo = usuario;
      document.getElementById("loginBox").style.display = "none";
      document.getElementById("panelBox").style.display = "block";
      document.getElementById("password").value = "";
      cargarRegistros();
    } else {
      estadoLogin.innerText = res.mensaje;
    }
  })
  .catch(() => estadoLogin.innerText = "Error de conexión");
}

/**************** CARGAR REGISTROS ****************/
function cargarRegistros() {
  fetch(URL, {
    method: "POST",
    body: JSON.stringify({ accion: "pendientes", usuario: usuarioActivo })
  })
  .then(r => r.json())
  .then(data => {
    listaPendientes.innerHTML = "";
    listaFirmados.innerHTML = "";

    data.pendientes.forEach(reg => {
      listaPendientes.appendChild(crearCard(reg, true));
    });

    data.firmados.forEach(reg => {
      listaFirmados.appendChild(crearCard(reg, false));
    });
  })
  .catch(() => alert("Error cargando registros"));
}

/**************** CREAR TARJETAS ****************/
function crearCard(reg, mostrarBoton) {
  const div = document.createElement("div");
  div.className = "card";

  if (reg.tipo === "PASE") {
    div.innerHTML = `
      <b>PASE DE SALIDA</b><br>
      📅 ${reg.fecha}<br>
      👤 ${reg.nombre}<br>
      🕒 ${reg.salida} → ${reg.llegada}<br>
      📌 ${reg.asunto}
    `;
  }

  if (reg.tipo === "JUSTIFICANTE") {
    div.innerHTML = `
      <b>JUSTIFICANTE</b><br>
      📥 Registrado: ${reg.fechaRegistro}<br>
      ❌ Día de la falta: ${reg.fechaFalta}<br>
      👤 ${reg.nombre}<br>
      📝 ${reg.motivo}<br>
      📄 Oficio: ${reg.numeroOficio || "N/A"}
    `;
  }

  if (mostrarBoton) {
    const btn = document.createElement("button");
    btn.textContent = "Firmar";
    btn.onclick = () => firmar(reg.tipo, reg.fila);
    div.appendChild(btn);
  } else {
    const ok = document.createElement("div");
    ok.style.marginTop = "8px";
    ok.style.color = "green";
    ok.innerHTML = "✔ Ya firmaste";
    div.appendChild(ok);
  }

  return div;
}

/**************** FIRMAR ****************/
function firmar(tipo, fila) {
  fetch(URL, {
    method: "POST",
    body: JSON.stringify({
      accion: "firmar",
      usuario: usuarioActivo,
      tipo,
      fila
    })
  })
  .then(r => r.json())
  .then(res => {
    alert(res.mensaje);
    cargarRegistros();
  })
  .catch(() => alert("Error al firmar"));
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