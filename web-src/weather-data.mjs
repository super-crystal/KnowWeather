export const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const validCity=c=>c&&typeof c.name==='string'&&c.name.length>0&&c.name.length<150&&finite(c.latitude)&&finite(c.longitude)&&Math.abs(c.latitude)<=90&&Math.abs(c.longitude)<=180;
export const cityKey=c=>`${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}`;
export const sources={cma:{model:'cma',name:'中国气象局 CMA'},ecmwf:{model:'ecmwf_ifs025',name:'ECMWF IFS'},US:{model:'gfs_seamless',name:'NOAA GFS'},JP:{model:'jma_seamless',name:'日本气象厅 JMA'},DE:{model:'icon_seamless',name:'DWD ICON'},FR:{model:'meteofrance_seamless',name:'Météo-France'},CA:{model:'gem_seamless',name:'加拿大 GEM'},fallback:{model:'best_match',name:'Open-Meteo 综合模型'}};
export const inChina=c=>['CN','HK','MO','TW'].includes(c.country_code)||(!c.country_code&&c.latitude>=18&&c.latitude<=54&&c.longitude>=73&&c.longitude<=135);
export const sourceFor=(c,choice='auto')=>inChina(c)&&choice==='cma'?sources.cma:inChina(c)&&choice==='ecmwf'?sources.ecmwf:sources[c.country_code]||sources.ecmwf;
export function condition(code,day=true){
 if(!finite(code))return{name:'暂无数据',icon:'cloud',scene:'unknown'};
 if(code===0)return{name:'晴',icon:day?'sun':'moon',scene:day?'sunny':'night'};
 if(code===1||code===2)return{name:code===1?'晴间多云':'多云',icon:day?'partly':'mooncloud',scene:day?'cloudy':'nightcloud'};
 if(code===3)return{name:'阴',icon:'cloud',scene:day?'overcast':'nightcloud'};
 if(code===45||code===48)return{name:'雾',icon:'fog',scene:'fog'};
 if((code>=71&&code<=77)||code===85||code===86)return{name:'雪',icon:'snow',scene:'snow'};
 if(code>=95)return{name:'雷阵雨',icon:'thunder',scene:'storm'};
 return{name:code<=57?'毛毛雨':code>=80?'阵雨':'雨',icon:'rain',scene:'rain'};
}
export async function getJSON(url,signal){const r=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(18000)]):AbortSignal.timeout(18000)});if(!r.ok)throw new Error('数据暂不可用');const d=await r.json();if(d.error)throw new Error(d.reason||'数据暂不可用');return d;}
export function weatherURL(c,source){const u=new URL('https://api.open-meteo.com/v1/'+(source.model==='cma'?'cma':'forecast'));u.search=new URLSearchParams({latitude:c.latitude,longitude:c.longitude,timezone:'auto',forecast_days:15,...(source.model==='cma'?{}:{models:source.model}),current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,precipitation',hourly:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,is_day,visibility,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover',daily:'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'});return u.toString();}
export function mergeForecast(primary,extra,source){
 const p=JSON.parse(JSON.stringify(primary)),pd=p.daily||{},ed=extra?.daily||{},days=[...new Set([...(pd.time||[]),...(ed.time||[])])].filter(date=>!pd.time?.[0]||date>=pd.time[0]).sort().slice(0,15),keys=[...new Set([...Object.keys(pd),...Object.keys(ed)])].filter(k=>k!=='time');
 const out={time:days},daySources=[],supplemented=new Set();
 for(const k of keys)out[k]=[];
 days.forEach((date,i)=>{const pi=pd.time?.indexOf(date)??-1,ei=ed.time?.indexOf(date)??-1,core=['weather_code','temperature_2m_min','temperature_2m_max'],complete=core.every(k=>finite(pd[k]?.[pi])),extraComplete=core.every(k=>finite(ed[k]?.[ei]));daySources[i]=complete?source.name:extraComplete?sources.fallback.name:'暂无完整预报';for(const k of keys){const value=pd[k]?.[pi],backup=ed[k]?.[ei];const present=k==='sunrise'||k==='sunset'?typeof value==='string':finite(value);out[k][i]=!complete&&extraComplete&&core.includes(k)?backup:present?value:(backup??null);if((!present||!complete&&core.includes(k))&&backup!=null)supplemented.add(k);}});
 p.daily=out;p.daySources=daySources;p.supplemented=[...supplemented];
 // Align extra hourly values by their timestamps, never by array position.
 if(extra?.hourly&&p.hourly){const idx=new Map(extra.hourly.time.map((t,i)=>[t,i]));for(const k of Object.keys(extra.hourly)){if(k==='time')continue;const a=p.hourly[k]||Array(p.hourly.time.length).fill(null);p.hourly[k]=p.hourly.time.map((t,i)=>{if(finite(a[i]))return a[i];const v=extra.hourly[k]?.[idx.get(t)];if(finite(v))supplemented.add('hourly:'+k);return v??null;});}p.supplemented=[...supplemented];}
 return p;
}
export async function fetchWeather(c,choice='auto',signal){
 let source=sourceFor(c,choice),primary,fallback=false;
 try{primary=await getJSON(weatherURL(c,source),signal);if(!finite(primary.current?.temperature_2m)||!primary.daily?.time?.length)throw new Error('缺少天气数据');}
 catch(e){if(signal?.aborted)throw e;source=sources.fallback;fallback=true;primary=await getJSON(weatherURL(c,source),signal);if(!finite(primary.current?.temperature_2m))throw new Error('缺少天气数据');}
 const d=primary.daily,needs=d.time.length<15||d.temperature_2m_max?.some(v=>!finite(v))||!d.uv_index_max?.some(finite)||!primary.hourly?.visibility?.some(finite)||!primary.hourly?.precipitation_probability?.some(finite);
 let extra=null;if(needs&&source.model!=='best_match'){try{extra=await getJSON(weatherURL(c,sources.fallback),signal);}catch(e){if(signal?.aborted)throw e;}}
 return {data:mergeForecast(primary,extra,source),source,fallback,fetchedAt:new Date().toISOString()};
}
export function hours(data,count=48){if(!data?.hourly?.time)return[];const h=data.hourly;let start=h.time.findIndex(t=>t>=data.current.time);if(start<0)return[];return h.time.slice(start,start+count).map((time,i)=>Object.fromEntries(Object.entries(h).map(([k,a])=>[k,k==='time'?time:a[start+i]??null])));}
export function distance(a,b){const rad=v=>v*Math.PI/180;const p=rad(b.latitude-a.latitude),l=rad(b.longitude-a.longitude),s=Math.sin(p/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(l/2)**2;return 6371*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}
export function parseJSONP(t){const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)throw new Error('无效数据');return JSON.parse(t.slice(a,b+1));}
