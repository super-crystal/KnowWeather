import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
async function edit(file,changes){const target=path.join(root,file);let text=await readFile(target,'utf8');for(const [before,after]of changes){if(!text.includes(before))throw new Error(file+': missing '+before.slice(0,70));text=text.replace(before,after);}await writeFile(target,text);}
const refresh='<svg class="refresh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10a8 8 0 1 1-2.3-4.3M17 2v5h5"/></svg><svg class="refresh-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle class="spinner-track" cx="12" cy="12" r="8"/><circle class="spinner-arc" cx="12" cy="12" r="8"/></svg>';
await edit('web-src/index.html',[
 ['<span>天气详情</span></button></div></header>','<span>天气详情</span></button><button id="refresh" class="refresh-button" aria-label="刷新天气" aria-busy="false">'+refresh+'</button></div></header>'],
 ['<button id="refresh" aria-label="刷新天气">↻</button>',''],
 ['<button id="detailRefresh" class="text-button" aria-label="刷新详情">刷新</button>','<button id="detailRefresh" class="refresh-button" aria-label="刷新详情" aria-busy="false">'+refresh+'</button>'],
 ['<div id="searchCaption" class="muted">','<p class="muted">定位后优先显示所在区县。区域名称由 OpenStreetMap / Nominatim 或系统地址服务解析。</p><div id="searchCaption" class="muted">'],
 ['<div class="source-links">','<p>定位仅在点击“使用当前位置”时开启；坐标用于解析区县和查询天气。区县名称来自 OpenStreetMap / Nominatim，系统地址服务作为备用；解析不可用时明确提示，不根据最近城市猜测区县。</p><div class="source-links"><a href="https://www.openstreetmap.org/copyright">OpenStreetMap 地区名称数据 ↗</a>']
]);
await edit('web-src/app.js',[
 ["import {createGeographicMap}","import {refreshMarkup,setRefreshBusy,runRefresh,installInteractions} from './interactions.mjs';\nimport {locatedCity} from './location.mjs';\nimport {createGeographicMap}"],
 ['let pack=null,','let locationRun=0,cityRevision=0,radarRun=0;\nlet pack=null,'],
 ['function selectCity(c){if(!validCity(c))return;','function selectCity(c){if(!validCity(c))return;cityRevision++;'],
 ["loading=true;$('refresh').disabled=true;","loading=true;setRefreshBusy($('refresh'),true);"],
 ["loading=false;$('refresh').disabled=false;","loading=false;setRefreshBusy($('refresh'),false);"],
 ["[city.country,city.admin1].filter(Boolean)","[city.country,city.admin1,city.admin2].filter(Boolean)"],
 ["let searchResults=[];","let searchResults=[];"],
 ["$('locate').onclick=()=>{if(!navigator.geolocation){toast('设备暂不支持定位，请搜索城市');return}$('locate').disabled=true;navigator.geolocation.getCurrentPosition(p=>{$('locate').disabled=false;selectCity({name:'当前位置',latitude:p.coords.latitude,longitude:p.coords.longitude,country:'',country_code:'',admin1:'定位城市',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});},e=>{$('locate').disabled=false;toast(e.code===1?'未获得定位权限，可以搜索城市':'暂时无法定位，请搜索城市');},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});};",
 `$('locate').onclick=async()=>{const button=$('locate');if(button.disabled)return;if(!navigator.geolocation){toast('设备暂不支持定位，请搜索城市');return;}const run=++locationRun,revision=cityRevision;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='正在定位…';try{const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000}));if(run!==locationRun||revision!==cityRevision||!$('cityPage').open)return;button.textContent='正在识别所在区县…';const latitude=p.coords.latitude,longitude=p.coords.longitude;let c;try{const d=await getJSON('/native/location?'+new URLSearchParams({lat:latitude.toFixed(5),lon:longitude.toFixed(5)}));c=locatedCity(latitude,longitude,d,p.coords.accuracy);}catch{c=locatedCity(latitude,longitude,{},p.coords.accuracy);}if(run!==locationRun||revision!==cityRevision||!$('cityPage').open)return;selectCity(c);if(!c.regionResolved)toast('已取得定位，暂时无法识别区县名称；可稍后重新定位或搜索区县');else if(!c.districtResolved)toast('已识别城市，数据源暂未提供区县名称');else if(p.coords.accuracy>1000)toast('已识别所在区县；定位精度较低，可开启精确位置后重试');}catch(e){if(run===locationRun&&revision===cityRevision&&$('cityPage').open)toast(e.code===1?'未获得定位权限，可以搜索城市':'暂时无法定位，请搜索城市');}finally{if(run===locationRun){button.disabled=false;button.removeAttribute('aria-busy');button.textContent='⌖ 使用当前位置';}}};`],
 ["$('cityPage').addEventListener('close',()=>{searchId++;","$('cityPage').addEventListener('close',()=>{locationRun++;$('locate').disabled=false;$('locate').removeAttribute('aria-busy');$('locate').textContent='⌖ 使用当前位置';searchId++;"],
 ["function openDetails(tab='live'){","function openDetails(tab='live'){"],
 ['async function renderMap(){destroyMaps();','async function renderMap(){const run=++radarRun;destroyMaps();'],
 ["if(activeTab!=='map'||!map||!$('detailsPage').open)return;","if(run!==radarRun||activeTab!=='map'||!map||!$('detailsPage').open)return;"],
 ["if(activeTab==='map'&&$('radarStatus'))$('radarStatus')","if(run===radarRun&&activeTab==='map'&&$('radarStatus'))$('radarStatus')"],
 ['return;renderStormList();','return;await renderStormList();'],
 ["storms={...old,cached:true};renderStormList()","storms={...old,cached:true};await renderStormList()"],
 ['loadStorm(selectedStorm);}','return loadStorm(selectedStorm);}'],
 ["async function renderAlerts(force=false){$('detailContent').innerHTML='<p class=\"loading-text\">正在读取天气预警…</p>';","async function renderAlerts(force=false){if(force&&$('alertReload'))setRefreshBusy($('alertReload'),true);else $('detailContent').innerHTML='<p class=\"loading-text\">正在读取天气预警…</p>';"],
 ['<button class="small-button" id="alertReload">更新预警</button>','<button class="small-button refresh-button" id="alertReload" aria-label="刷新天气预警" aria-busy="false">${refreshMarkup("更新预警")}</button>'],
 ["$('alertReload').onclick=()=>renderAlerts(true);","$('alertReload').onclick=()=>runRefresh($('alertReload'),()=>renderAlerts(true));"],
 ["$('detailRefresh').onclick=()=>{if(activeTab==='typhoon'){storms=null;renderTyphoons()}else if(activeTab==='alerts')renderAlerts(true);else if(activeTab==='map')renderMap();else if(activeTab==='compare')loadComparison();else loadWeather();};","$('detailRefresh').onclick=()=>runRefresh($('detailRefresh'),()=>{if(activeTab==='typhoon'){storms=null;return renderTyphoons()}if(activeTab==='alerts')return renderAlerts(true);if(activeTab==='map')return renderMap();if(activeTab==='compare')return loadComparison();return loadWeather();});"],
 ["applyTheme(theme);pack=readCache(city);","installInteractions();\napplyTheme(theme);pack=readCache(city);"]
]);
await edit('AndroidManifest.xml',[[ 'android:versionCode="4" android:versionName="1.2.1"','android:versionCode="5" android:versionName="1.2.2"']]);
await edit('build.ps1',[["weatherly-1.2.1.apk","weatherly-1.2.2.apk"],["知天气-1.2.1.apk","知天气-1.2.2.apk"],["'assets/cities.mjs',","'assets/cities.mjs','assets/interactions.mjs','assets/location.mjs',"]]);
await edit('qa-device.ps1',[["output/qa-1.2.1","output/qa-1.2.2"]]);
console.log('Updated UI, location and version to 1.2.2');
