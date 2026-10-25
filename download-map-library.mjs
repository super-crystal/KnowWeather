import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./web-src/vendor/',import.meta.url);await mkdir(new URL('images/',root),{recursive:true});
const files=['leaflet.js','leaflet.css','images/layers.png','images/layers-2x.png','images/marker-icon.png','images/marker-icon-2x.png','images/marker-shadow.png'];
for(const file of files){const r=await fetch('https://unpkg.com/leaflet@1.9.4/dist/'+file);if(!r.ok)throw new Error('Unable to download Leaflet');const data=Buffer.from(await r.arrayBuffer());if(file==='leaflet.js'&&createHash('sha256').update(data).digest('base64')!=='20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=')throw new Error('Leaflet integrity mismatch');await writeFile(new URL(file,root),data);console.log(file,data.length);}
const license=await(await fetch('https://unpkg.com/leaflet@1.9.4/LICENSE')).text();await writeFile(new URL('LICENSE-Leaflet.txt',root),license);
