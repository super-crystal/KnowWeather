import {land,lakes,places} from './map-data.mjs';
import {TileHealth} from './map-health.mjs';
const credit='<a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth</a>';
export function createGeographicMap(id,center,zoom){
 if(!window.L)throw new Error('地图组件未能加载');
 const L=window.L,box=document.getElementById(id),m=L.map(id,{zoomControl:true,attributionControl:true,maxZoom:18,worldCopyJump:true}).setView(center,zoom);
 box.classList.add('geographic-map');
 m.createPane('geography').style.zIndex='190';m.getPane('geography').style.pointerEvents='none';
 m.createPane('placeLabels').style.zIndex='350';m.getPane('placeLabels').style.pointerEvents='none';
 const renderer=L.canvas({pane:'geography',padding:.5});
 L.geoJSON(land,{pane:'geography',renderer,interactive:false,style:{color:'#9eb2a3',weight:1,fillColor:'#edf0dd',fillOpacity:1}}).addTo(m);
 L.geoJSON(lakes,{pane:'geography',renderer,interactive:false,style:{color:'#9cc5d8',weight:.6,fillColor:'#bddded',fillOpacity:1}}).addTo(m);
 m.attributionControl.addAttribution(credit);
 const labels=L.layerGroup().addTo(m);
 const drawLabels=()=>{
  labels.clearLayers();const z=m.getZoom(),bounds=m.getBounds(),placed=[],limit=z<4?9:23;
  for(const p of places){
   if(p.zoom>z+1||!bounds.contains([p.lat,p.lon]))continue;
   const point=m.latLngToContainerPoint([p.lat,p.lon]);
   if(placed.some(q=>Math.abs(q.x-point.x)<74&&Math.abs(q.y-point.y)<30))continue;
   const label=document.createElement('span');label.textContent=p.name;
   L.marker([p.lat,p.lon],{pane:'placeLabels',interactive:false,keyboard:false,icon:L.divIcon({className:'geography-place',html:label,iconSize:[84,20],iconAnchor:[3,8]})}).addTo(labels);
   placed.push(point);if(placed.length>=limit)break;
  }
 };
 m.on('moveend zoomend',drawLabels);drawLabels();
 const controls=document.createElement('div');controls.className='base-map-controls';
 const label=document.createElement('label');label.textContent='地图底图';
 const select=document.createElement('select');select.setAttribute('aria-label',id==='stormMap'?'台风地图底图':'天气地图底图');
 for(const [value,text] of [['auto','自动：在线 + 内置地理'],['local','内置地理底图（无需联网）'],['online','在线街道 OpenStreetMap']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 label.append(select);controls.append(label);
 const status=document.createElement('p');status.className='base-map-status';status.setAttribute('role','status');controls.append(status);box.before(controls);
 let layer=null,monitor=null,dead=false,mode='auto';
 try{const v=localStorage.getItem('weatherly-map-base');if(['auto','local','online'].includes(v))mode=v;}catch{}
 const statusText={loading:'内置地理底图已显示；正在加载在线街道…',online:'在线街道已加载 · 底图 OpenStreetMap',partial:'部分在线街道未加载；缺失区域显示内置地理底图。',fallback:'在线底图不可用，已显示内置地理底图。海岸线、湖泊和主要城市可离线查看。'};
 function setMode(value){
  mode=value;select.value=value;monitor?.dispose();monitor=null;
  if(layer){m.removeLayer(layer);layer=null;}
  labels.addTo(m);drawLabels();
  if(value==='local'){status.textContent='内置地理底图 · Natural Earth · 海岸线、湖泊和主要城市。不是街道地图。';return;}
  const attempt=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,zIndex:1,referrerPolicy:'strict-origin-when-cross-origin',attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
  layer=attempt;
  const health=new TileHealth(state=>{
   if(dead||layer!==attempt)return;
   status.textContent=statusText[state];
   if(state==='online'){if(m.hasLayer(labels))m.removeLayer(labels);}
   else {if(!m.hasLayer(labels))labels.addTo(m);drawLabels();}
   // Never wait for an unreachable server to finish: local geography is already underneath.
   if(state==='fallback'){health.dispose();m.removeLayer(attempt);layer=null;}
  });monitor=health;
  attempt.on('tileload',()=>health.tileLoaded());attempt.on('tileerror',()=>health.tileFailed());
  attempt.on('load',()=>health.settled());
  health.start();attempt.addTo(m);
 }
 select.onchange=()=>{try{localStorage.setItem('weatherly-map-base',select.value);}catch{}setMode(select.value);};
 m.on('remove',()=>{dead=true;monitor?.dispose();controls.remove();m.off('moveend zoomend',drawLabels);});
 setMode(mode);return m;
}
