const URL_SCRIPT = "https://script.google.com/macros/s/AKfycby-TahiSn8f0s-Ugi4NYy03HJWCkseAnpxtrTnCRrdIkm3GObCjNCggfXWm4oxuUHIO/exec";
let ultimoEstadoJSON = ""; 

// 1. NOMBRES DEL PERSONAL
const listaPersonal = ["Alejandra Alamilla", "Ana Franco", "Anabel Samperio", "Eduardo Estrada", "Erendira Sosa", "Guadalupe Sanchez", "Jennyfer Partida", "Leslye Olguin", "Maria Cabrera", "Maribel Moreno", "Miguel Vidal", "Olga Alvarado", "Ramón Gutierrez", "Tania Lopez", "Uriel Estrada", "Yadira Baños"];

// 2. AUDIOS POR TRÁMITE (Rutas locales para GitHub)
const AUDIOS_TRAMITES = {
  "BECA_COMISION": "becaco.mp3",
  "SERVICIO_SOCIAL": "serviso.mp3",
  "SERVIDOR_PUBLICO_MES": "servipu.mp3",
  "CONTRATO_SUSTITUTO": "contrasus.mp3",
  "CAPACITACION": "capacitacion.mp3",
  "EVALUACIONES_NUEVO_INGRESO": "evalu.mp3",
  "DEFAULT": "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
};

// 3. VARIABLES DE CONTROL Y SONIDO
let idsProcesados = new Set(); // Memoria para no repetir sonidos
let colaPeticiones = [];
let enviandoDatos = false;

// Reloj visual
setInterval(() => {
  document.getElementById('reloj').innerText = new Date().toLocaleTimeString();
}, 1000);

// Motor de recarga (8 segundos)
setInterval(() => {
  if (!enviandoDatos && colaPeticiones.length === 0) {
    fetchData();
  }
}, 8000);

async function fetchData() {
  try {
    const res = await fetch(URL_SCRIPT + "?t=" + Date.now());
    const data = await res.json();
    const estadoActualJSON = JSON.stringify(data);

    if (data && data.length > 0) {
      if (estadoActualJSON !== ultimoEstadoJSON) {
        
        // --- LÓGICA DE SONIDO INFALIBLE ---
        data.forEach(reg => {
          // Si es un ID que nunca habíamos visto...
          if (!idsProcesados.has(reg.id)) {
            
            // Solo suena si NO es la primera vez que cargamos la página (evita gritos al abrir)
            if (ultimoEstadoJSON !== "") {
              console.log("🔔 Nuevo registro detectado:", reg.nombre);
              reproducirAudioTramite(reg.tramite);
            }
            
            // Lo guardamos en la memoria para que no vuelva a sonar
            idsProcesados.add(reg.id);
          }
        });

        renderizar(data);
        ultimoEstadoJSON = estadoActualJSON;
      }
    } else {
      document.getElementById('listaAvisos').innerHTML = "<p style='text-align:center; opacity:0.5; margin-top:20px;'>No hay registros el día de hoy.</p>";
      ultimoEstadoJSON = ""; 
      idsProcesados.clear(); // Limpiamos memoria si el Excel queda vacío
    }
    
    document.getElementById('status').innerText = "Sincronizado: " + new Date().toLocaleTimeString();
    
  } catch (e) {
    console.error("Error de conexión:", e);
    document.getElementById('status').innerText = "Buscando servidor...";
  }
}

function reproducirAudioTramite(nombreTramite) {
  // Buscamos el audio (Convertimos a Mayúsculas para que coincida con el objeto AUDIOS_TRAMITES)
  const clave = nombreTramite.toUpperCase();
  const audioUrl = AUDIOS_TRAMITES[clave] || AUDIOS_TRAMITES["DEFAULT"];
  
  const reproductor = document.getElementById('audioNotificacion');
  if (reproductor) {
    reproductor.src = audioUrl;
    reproductor.play().catch(e => {
      console.warn("🔊 El navegador bloqueó el audio. Haz un clic en la pantalla para habilitarlo.");
    });
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
          ${yaAtendido 
            ? `<option>${reg.atendio}</option>` 
            : `<option value="">Atendió...</option>${opciones}`}
        </select>
        <button 
          onclick="marcarAtendido('${reg.tramite}', '${reg.nombre}', ${index}, this)" 
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

function marcarAtendido(tramite, usuario, index, btn) {
  const empleado = document.getElementById(`sel-${index}`).value;
  if (!empleado) return alert("Por favor, selecciona quién atendió.");

  const botonVisual = btn || event.target;
  botonVisual.disabled = true;
  botonVisual.innerText = "⏳";

  colaPeticiones.push({ tramite, usuario, empleado, btn: botonVisual });
  procesarColaPeticiones();
}

async function procesarColaPeticiones() {
  if (enviandoDatos || colaPeticiones.length === 0) return;
  
  enviandoDatos = true;
  const actual = colaPeticiones[0]; 

  try {
    const url = `${URL_SCRIPT}?tramite=${encodeURIComponent(actual.tramite)}&usuario=${encodeURIComponent(actual.usuario)}&empleado=${encodeURIComponent(actual.empleado)}`;
    const response = await fetch(url, { method: 'GET' });
    const resultado = await response.text();
    
    if (resultado.includes("Success")) {
       actual.btn.innerText = "✅";
       actual.btn.classList.add("btn-check");
    } else {
       alert("Error al guardar: " + actual.usuario);
       actual.btn.disabled = false;
       actual.btn.innerText = "OK";
    }
  } catch (e) {
    actual.btn.disabled = false;
    actual.btn.innerText = "OK";
  }

  colaPeticiones.shift();
  enviandoDatos = false;

  if (colaPeticiones.length > 0) {
    procesarColaPeticiones();
  } else {
    fetchData();
  }
}

fetchData();
