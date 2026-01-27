const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbw0KHbOq9pAWrMWiBc1WACvhO49Z-ErQ9b4mqdewtVcYVLEdERM1QRJsAIdoZ6ABs3u/exec";
let ultimoEstadoJSON = ""; // Guardamos todo el texto del JSON para comparar cambios

// 1. AGREGA AQUÍ LOS NOMBRES DEL PERSONAL
const listaPersonal = ["Alejandra Alamilla", "Ana Franco", "Anabel Samperio", "Eduardo Estrada", "Erendira Sosa", "Guadalupe Sanchez", "Jennyfer Partida", "Leslye Olguin", "Maria Cabrera", "Maribel Moreno", "Miguel Vidal", "Olga Alvarado", "Ramón Gutierrez", "Tania Lopez", "Uriel Estrada", "Yadira Baños"];

// Iniciar reloj
setInterval(() => {
  document.getElementById('reloj').innerText = new Date().toLocaleTimeString();
}, 1000);

async function fetchData() {
  try {
    const res = await fetch(URL_SCRIPT + "?t=" + Date.now());
    const data = await res.json();
    
    // Convertimos a texto para comparar si ALGO cambió (nuevo registro o alguien ya atendido)
    const estadoActualJSON = JSON.stringify(data);

    if (data && data.length > 0) {
      // Si el JSON es diferente al anterior, algo cambió en el Excel
      if (estadoActualJSON !== ultimoEstadoJSON) {
        
        // SONIDO: Solo si el primer ID es diferente al que teníamos (llegó alguien nuevo)
        const primerIdNuevo = data[0].id;
        const primerIdViejo = ultimoEstadoJSON !== "" ? JSON.parse(ultimoEstadoJSON)[0]?.id : "";
        
        if (primerIdNuevo !== primerIdViejo && ultimoEstadoJSON !== "") {
          const audio = document.getElementById('audioNotificacion');
          if (audio) audio.play().catch(() => {});
        }

        renderizar(data);
        ultimoEstadoJSON = estadoActualJSON;
      }
    } else {
      document.getElementById('listaAvisos').innerHTML = "<p style='text-align:center; opacity:0.5; margin-top:20px;'>No hay registros el día de hoy.</p>";
      ultimoEstadoJSON = ""; 
    }
    
    document.getElementById('status').innerText = "Sincronizado: " + new Date().toLocaleTimeString();
    
  } catch (e) {
    console.error("Error de conexión:", e);
    document.getElementById('status').innerText = "Buscando servidor...";
  }
}

function renderizar(data) {
  const lista = document.getElementById('listaAvisos');
  lista.innerHTML = ""; 

  data.forEach((reg, index) => {
    const li = document.createElement('li');
    li.setAttribute('data-tramite', reg.tramite);
    
    // Verificamos si ya fue atendido en el Excel (si el campo tiene texto)
    const yaAtendido = reg.atendio && reg.atendio.trim() !== "";
    
    // Si ya está atendido, le ponemos una clase extra para el CSS
    li.className = `item-aviso ${index === 0 ? 'nuevo' : ''} ${yaAtendido ? 'finalizado' : ''}`;
    
    const nombreLimpio = reg.tramite.replace(/_/g, ' ');
    const opciones = listaPersonal.map(p => `<option value="${p}">${p}</option>`).join('');

    li.innerHTML = `
      <span class="tramite-tag">${nombreLimpio}</span>
      <span class="usuario-nombre">${reg.nombre}</span>
      <div class="atencion-controles">
        <select id="sel-${index}" ${yaAtendido ? 'disabled' : ''}>
          ${yaAtendido 
            ? `<option>${reg.atendio}</option>` 
            : `<option value="">Atendió...</option>${opciones}`}
        </select>
        <button 
          onclick="marcarAtendido('${reg.tramite}', '${reg.nombre}', ${index})" 
          ${yaAtendido ? 'disabled class="btn-check"' : ''}>
          ${yaAtendido ? '✔' : 'OK'}
        </button>
      </div>
      <span class="hora">${reg.hora}</span>
    `;
    lista.appendChild(li);
  });
}

async function marcarAtendido(tramite, usuario, index) {
  const empleado = document.getElementById(`sel-${index}`).value;
  if (!empleado) return alert("Por favor, selecciona quién atendió.");

  const btn = event.target;
  const textoOriginal = btn.innerText;
  
  btn.disabled = true;
  btn.innerText = "⏳";

  try {
    const url = `${URL_SCRIPT}?tramite=${encodeURIComponent(tramite)}&usuario=${encodeURIComponent(usuario)}&empleado=${encodeURIComponent(empleado)}`;
    
    const response = await fetch(url, { method: 'POST' });
    const resultado = await response.text();
    
    if (resultado.includes("Success")) {
       btn.innerText = "✅";
       btn.classList.add("btn-check");
       // Forzamos actualización inmediata para que todos vean el cambio
       fetchData();
    } else {
       alert("Error: " + resultado);
       btn.disabled = false;
       btn.innerText = textoOriginal;
    }
  } catch (e) {
    alert("Error de conexión");
    btn.disabled = false;
    btn.innerText = textoOriginal;
  }
}

fetchData();
setInterval(fetchData, 4000);