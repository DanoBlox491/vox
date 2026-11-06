const keys=["hardwareAcceleration","lowLatency","cpuBoost","disableAnimations","microphoneEnabled","cameraEnabled"];
const controls=Object.fromEntries(keys.map(key=>[key,document.getElementById(key)]));
const notice=document.getElementById("restartNotice"),status=document.getElementById("status");
let current={};
function render(value){current=value;for(const key of keys)controls[key].checked=!!value[key];}
async function load(){try{render(await window.voxDesktop.getSettings());}catch(error){status.textContent="Could not load settings: "+error.message;}}
for(const key of keys){controls[key].addEventListener("change",async()=>{controls[key].disabled=true;status.textContent="Saving…";try{const result=await window.voxDesktop.updateSettings({[key]:controls[key].checked});render(result.settings);notice.classList.toggle("show",!!result.restartRequired);status.textContent="Saved on this PC.";}catch(error){controls[key].checked=!!current[key];status.textContent="Could not save: "+error.message;}finally{controls[key].disabled=false;}});}
document.getElementById("close").addEventListener("click",()=>window.close());
document.getElementById("restart").addEventListener("click",()=>window.voxDesktop.restart());
window.voxDesktop.onSettingsSync(render);load();
