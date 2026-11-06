const keys=["hardwareAcceleration","gpuBoost","lowLatency","cpuBoost","disableAnimations","microphoneEnabled","cameraEnabled"];
const controls=Object.fromEntries(keys.map(key=>[key,document.getElementById(key)]));
const notice=document.getElementById("restartNotice"),status=document.getElementById("status");
let current={};
function render(value){current=value;for(const key of keys)controls[key].checked=!!value[key];}
async function refreshGpu(){const target=document.getElementById("gpuStatus");try{const gpu=await window.voxDesktop.getGpuStatus();const features=Object.entries(gpu.features||{}).map(([name,value])=>name+": "+value).join(" · ");const device=gpu.info?.gpuDevice?.[0]?.deviceString||gpu.info?.gpuDevice?.[0]?.name||"GPU details unavailable";target.textContent=device+(features?" — "+features:"");}catch(error){target.textContent="GPU status unavailable: "+error.message;}}
async function load(){try{render(await window.voxDesktop.getSettings());await refreshGpu();}catch(error){status.textContent="Could not load settings: "+error.message;}}
for(const key of keys){controls[key].addEventListener("change",async()=>{controls[key].disabled=true;status.textContent="Saving…";try{const result=await window.voxDesktop.updateSettings({[key]:controls[key].checked});render(result.settings);notice.classList.toggle("show",!!result.restartRequired);status.textContent="Saved on this PC.";}catch(error){controls[key].checked=!!current[key];status.textContent="Could not save: "+error.message;}finally{controls[key].disabled=false;}});}
document.getElementById("refreshGpu").addEventListener("click",refreshGpu);
document.getElementById("close").addEventListener("click",()=>window.close());
document.getElementById("restart").addEventListener("click",()=>window.voxDesktop.restart());
window.voxDesktop.onSettingsSync(render);load();

const updateStatus=document.getElementById("updateStatus");
function renderUpdate(value){if(updateStatus&&value)updateStatus.textContent=value.message+(value.version?" (v"+value.version+")":"");}
window.voxDesktop.getUpdateInfo().then(renderUpdate).catch(error=>renderUpdate({message:error.message}));
window.voxDesktop.onUpdateStatus(renderUpdate);
document.getElementById("checkUpdates").addEventListener("click",async()=>{updateStatus.textContent="Checking…";renderUpdate(await window.voxDesktop.checkForUpdates());});
document.getElementById("openReleases").addEventListener("click",()=>window.voxDesktop.openReleases());
