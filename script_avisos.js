const URL_SCRIPT = "https://script.google.com/macros/s/AKfycby-TahiSn8f0s-Ugi4NYy03HJWCkseAnpxtrTnCRrdIkm3GObCjNCggfXWm4oxuUHIO/exec";
let ultimoEstadoJSON = ""; 

const listaPersonal = ["Alejandra Alamilla", "Ana Franco", "Anabel Samperio", "Eduardo Estrada", "Erendira Sosa", "Guadalupe Sanchez", "Jennyfer Partida", "Leslye Olguin", "Maria Cabrera", "Maribel Moreno", "Miguel Vidal", "Olga Alvarado", "Ramón Gutierrez", "Tania Lopez", "Uriel Estrada", "Yadira Baños"];

const AUDIOS_TRAMITES = {
  "BECA_COMISION": "becaco.mp3",
  "SERVICIO_SOCIAL": "serviso.mp3",
  "SERVIDOR_PUBLICO_MES": "servipu.mp3",
  "CONTRATO_SUSTITUTO": "contrasus.mp3",
  "CAPACITACION": "capacitacion.mp3",
  "EVALUACIONES_NUEVO_INGRESO": "evalu.mp3",
  "DEFAULT": "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
};

let idsProcesados = new Set(); 
let colaPeticiones = [];
let enviandoDatos = false;
let isFetching = false; 
let timerRecarga; // Cronómetro inteligente

// Reloj visual
setInterval(() => {
  document.getElementById('reloj').innerText = new Date().toLocaleTimeString();
}, 1000);

async function fetchData() {
  // Si estamos guardando algo o hay cola, abortamos para no estorbar
  if (enviandoDatos || colaPeticiones.length > 0) return;
  
  isFetching = true;
  clearTimeout(timerRecarga); // Detenemos cualquier cronómetro anterior
  
  try {
    const res = await fetch(URL_SCRIPT + "?t=" + Date.now());
    const data = await res.json();
    const estadoActualJSON = JSON.stringify(data);

    // ¿Hicieron clic mientras descargábamos? Abortar y reiniciar reloj
    if (enviandoDatos || colaPeticiones.length > 0) {
      isFetching = false;
      timerRecarga = setTimeout(fetchData, 7000);
      return; 
    }

    if (data && data.length > 0) {
      if (estadoActualJSON !== ultimoEstadoJSON) {
        data.forEach(reg => {
          if (!idsProcesados.has(reg.id)) {
            if (ultimoEstadoJSON !== "") reproducirAudioTramite(reg.tramite);
            idsProcesados.add(reg.id);
          }
        });
        renderizar(data);
        ultimoEstadoJSON = estadoActualJSON;
      }
    } else {
      document.getElementById('listaAvisos').innerHTML = "<p style='text-align:center; opacity:0.5; margin-top:20px;'>No hay registros el día de hoy.</p>";
      ultimoEstadoJSON = ""; 
      idsProcesados.clear();
    }
    document.getElementById('status').innerText = "Sincronizado: " + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById('status').innerText = "Buscando servidor...";
  }
  
  isFetching = false;
  
  // LA MAGIA: Espera 7 segundos exactos después de terminar de cargar, para que no se acumule el lag.
  timerRecarga = setTimeout(fetchData, 7000); 
}

function reproducirAudioTramite(nombreTramite) {
  const clave = nombreTramite.toUpperCase();
  const audioUrl = AUDIOS_TRAMITES[clave] || AUDIOS_TRAMITES["DEFAULT"];
  const reproductor = document.getElementById('audioNotificacion');
  if (reproductor) {
    reproductor.src = audioUrl;
    reproductor.play().catch(e => console.warn("Haz clic en la página para habilitar el sonido."));
  }
}

function renderizar(data) {
  const lista = document.getElementById('listaAvisos');
  lista.innerHTML = ""; 

  data.forEach((reg, index) => {
    const li = document.createElement('li');
    li.setAttribute('data-tramite', reg.tramite);
    
    const yaAtendido = reg.atendio && reg.atendio.trim() !== "";
    li.className = `item-aviso ${yaAtendido ? 'finalizado' : ''}`;
    const nombreLimpio = reg.tramite.replace(/_/g, ' ');
    const opciones = listaPersonal.map(p => `<option value="${p}">${p}</option>`).join('');

    li.innerHTML = `
      <span class="tramite-tag">${nombreLimpio}</span>
      <span class="usuario-nombre">${reg.nombre}</span>
      <div class="atencion-controles">
        <select id="sel-${index}" ${yaAtendido ? 'disabled' : ''} style="${yaAtendido ? 'opacity:0.8; border-color:#27ae60' : ''}">
          ${yaAtendido ? `<option>${reg.atendio}</option>` : `<option value="">Atendió...</option>${opciones}`}
        </select>
        <button 
          onclick="marcarAtendido('${reg.tramite}', '${reg.nombre}', ${reg.filaReal}, ${index}, this, this.parentElement.parentElement)" 
          ${yaAtendido ? 'disabled class="btn-check"' : ''} 
          style="${yaAtendido ? 'background-color:#27ae60 !important; cursor:default' : ''}">
          ${yaAtendido ? '✔' : 'OK'}
        </button>
      </div>
      <span class="hora">${reg.hora}</span>
    `;
    lista.appendChild(li);
  });
}

function marcarAtendido(tramite, usuario, filaReal, index, btn, liElement) {
  const selectElement = document.getElementById(`sel-${index}`);
  const empleado = selectElement.value;
  
  if (!empleado) return alert("Por favor, selecciona quién atendió.");

  // INTERFAZ OPTIMISTA
  btn.disabled = true;
  btn.innerText = "✅";
  btn.classList.add("btn-check");
  selectElement.disabled = true; 
  selectElement.style.opacity = "0.8";
  selectElement.style.borderColor = "#27ae60";
  liElement.classList.add("finalizado");

  colaPeticiones.push({ tramite, usuario, empleado, filaReal, btn, select: selectElement, li: liElement });
  procesarColaPeticiones();
}

async function procesarColaPeticiones() {
  if (enviandoDatos || colaPeticiones.length === 0) return;
  enviandoDatos = true;
  const actual = colaPeticiones[0]; 

  try {
    const url = `${URL_SCRIPT}?tramite=${encodeURIComponent(actual.tramite)}&empleado=${encodeURIComponent(actual.empleado)}&filaReal=${actual.filaReal}&ts=${Date.now()}`;
    const response = await fetch(url, { method: 'GET' });
    const resultado = await response.text();
    
    if (!resultado.includes("Success")) {
       console.error("Error servidor:", resultado);
       revertirInterfaz(actual); 
    }
  } catch (e) {
    revertirInterfaz(actual);
  }

  colaPeticiones.shift();
  setTimeout(() => {
    enviandoDatos = false;
    if (colaPeticiones.length > 0) {
      procesarColaPeticiones();
    } else {
      // Cuando termina de guardar, forzamos la actualización
      clearTimeout(timerRecarga);
      fetchData();
    }
  }, 500); 
}

function revertirInterfaz(actual) {
  alert("Error de red, no se guardó: " + actual.usuario);
  actual.btn.disabled = false;
  actual.btn.innerText = "OK";
  actual.btn.classList.remove("btn-check");
  actual.select.disabled = false;
  actual.select.style.opacity = "1";
  actual.select.style.borderColor = "var(--dorado)";
  actual.li.classList.remove("finalizado");
}

// ==========================================
// EL "INSTINTO DE DESPERTAR" (Anti-Lag)
// ==========================================

// 1. Si cambian de pestaña y regresan
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !enviandoDatos) {
    console.log("⚡ Pestaña activa: Forzando actualización...");
    clearTimeout(timerRecarga);
    fetchData();
  }
});

// 2. Si mueven el mouse después de 10 segundos inactivos
let tiempoInactivo = 0;
document.addEventListener("mousemove", () => {
  if (tiempoInactivo > 10 && !enviandoDatos) {
    console.log("⚡ Movimiento detectado: Forzando actualización...");
    clearTimeout(timerRecarga);
    fetchData();
  }
  tiempoInactivo = 0; 
});

// Contador invisible
setInterval(() => {
  tiempoInactivo++;
}, 1000);

// PRIMERA CARGA AL ABRIR LA PÁGINA
fetchData();chData();
