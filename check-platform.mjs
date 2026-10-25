import {writeFile} from 'node:fs/promises';
const base=new URL('../../tools/android-build/',import.meta.url);
const url='https://api.open-meteo.com/v1/cma?latitude=39.9042&longitude=116.4074&timezone=auto&forecast_days=7&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,is_day,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset';
try {const r=await fetch(url,{signal:AbortSignal.timeout(18000)});console.log('CMA status:',r.status,(await r.text()).slice(0,500));}catch(e){console.log('CMA:',e.message);}
const xml=await(await fetch('https://dl.google.com/android/repository/repository2-3.xml')).text();
await writeFile(new URL('repository.xml',base),xml);
const part=xml.match(/<remotePackage[^>]*path="platforms;android-36"[^>]*>([\s\S]*?)<\/remotePackage>/)?.[1];
console.log('Platform 36 metadata:',part?.slice(-2200));
