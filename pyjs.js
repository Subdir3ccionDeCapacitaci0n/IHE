const URL = "https://script.google.com/macros/s/AKfycbyvCtkGkJgiM0rDa4wkrFdhd5BjZDxqrTDPKN0QSn40y4KM6yZlnigBLWQ8fuk1D3NT/exec";

const tipo = document.getElementById("tipo");
const paseDiv = document.getElementById("pase");
const ecoDiv = document.getElementById("economico");
const justDiv = document.getElementById("justificante");
const contenedorAsunto = document.getElementById("contenedorAsunto");
const estado = document.getElementById("estado");

tipo.addEventListener("change", () => {
  paseDiv.classList.toggle("hidden", !(tipo.value==="PASE" || tipo.value==="DESAYUNO"));
  ecoDiv.classList.toggle("hidden", tipo.value!=="ECONOMICO");
  justDiv.classList.toggle("hidden", tipo.value!=="JUSTIFICANTE");
  if (tipo.value==="DESAYUNO") contenedorAsunto.classList.add("hidden"); else contenedorAsunto.classList.remove("hidden");
});

function enviar(){
  estado.innerText="Verificando...";
  estado.style.color="black";

  const nombre=document.getElementById("nombre").value.trim();
  const apellidos=document.getElementById("apellidos").value.trim();
  if(!tipo.value || !nombre || !apellidos){estado.innerText="Completa los campos"; estado.style.color="red"; return;}

  const payload={ tipo:tipo.value, nombre, apellidos };

  if(tipo.value==="PASE"||tipo.value==="DESAYUNO"){
    const salida=document.getElementById("horaSalida").value;
    const llegada=document.getElementById("horaLlegada").value;
    const asunto=(tipo.value==="DESAYUNO")?"":document.getElementById("asunto").value;
    if(!salida||!llegada||(tipo.value==="PASE"&&!asunto)){estado.innerText="Completa horas y asunto"; estado.style.color="red"; return;}
    if(llegada<=salida){estado.innerText="Hora de regreso debe ser mayor a salida"; estado.style.color="red"; return;}
    payload.horaSalida=salida; payload.horaLlegada=llegada; payload.asunto=asunto;
  } else if(tipo.value==="ECONOMICO"){
    const fecha=document.getElementById("fechaEconomico").value;
    const motivo=document.getElementById("motivoEconomico").value.trim();
    if(!fecha||!motivo){estado.innerText="Completa fecha y motivo"; estado.style.color="red"; return;}
    payload.fechaFalta=fecha; payload.asunto=motivo;
  } else if(tipo.value==="JUSTIFICANTE"){
    const fecha=document.getElementById("fechaFalta").value;
    const motivo=document.getElementById("motivo").value.trim();
    const num=document.getElementById("numeroOficio").value.trim();
    if(!fecha||!motivo||!num){estado.innerText="Completa todos los campos"; estado.style.color="red"; return;}
    payload.fechaFalta=fecha; payload.asunto=motivo; payload.numeroOficio=num;
  }

  fetch(URL,{ method:"POST", body:JSON.stringify(payload) })
    .then(res=>res.json())
    .then(res=>{
      if(res.ok){ estado.innerText="✅ "+res.mensaje; estado.style.color="green"; alert("Solicitud registrada correctamente"); limpiarFormulario(); }
      else{ estado.innerText="⚠️ "+res.mensaje; estado.style.color="red"; alert("⛔ NO SE PUDO REGISTRAR:\n"+res.mensaje); }
    })
    .catch(err=>{ estado.innerText="Error de conexión"; estado.style.color="red"; console.error(err); });
}

function limpiarFormulario(){
  document.querySelectorAll("input").forEach(i=>i.value="");
  document.querySelectorAll("select").forEach(s=>s.value="");
  paseDiv.classList.add("hidden"); ecoDiv.classList.add("hidden"); justDiv.classList.add("hidden");
  tipo.value="";
}