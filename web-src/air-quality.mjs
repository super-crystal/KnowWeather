import {finite,getJSON,validCity,distance} from './weather-data.mjs';
export const airSources={
 cams:{name:'CAMS / Open-Meteo',scale:'美国 AQI',note:'全球模型估算；中国约45公里网格，无需密钥。',link:'https://open-meteo.com/en/docs/air-quality-api'},
 waqi:{name:'WAQI / AQICN',scale:'美国 AQI',note:'附近监测站资料，需个人 Token；污染物为分指数。',link:'https://aqicn.org/data-platform/token/'},
 openweather:{name:'OpenWeather',scale:'OpenWeather 1–5级',note:'全球空气污染资料，需个人 API Key。',link:'https://home.openweathermap.org/api_keys'},
 hk:{name:'香港环保署',scale:'香港 AQHI',note:'香港官方各站健康指数，无需密钥；仅香港。',link:'https://www.aqhi.gov.hk/sc.html'}
};
export const airSource=id=>airSources[id]||airSources.cams;
const ttl=21600000,number=v=>finite(v)&&v>=0?v:null;
export function airLevel(v,source='cams'){
 if(!finite(v))return '暂无数据';
 if(source==='openweather')return ['','优','尚可','中等','差','很差'][v]||'暂无数据';
 if(source==='hk')return v<=3?'低':v<=6?'中':v===7?'高':v<=10?'甚高':'严重';
 return v<=50?'优':v<=100?'良':v<=150?'敏感人群不健康':v<=200?'不健康':v<=300?'非常不健康':'危险';
}
export function validAir(d,now=Date.now()){
 if(!d||!airSources[d.source]||!finite(d.value)||d.value<0)return false;
 if(d.source==='openweather'&&(!Number.isInteger(d.value)||d.value<1||d.value>5))return false;
 if(d.source==='hk'&&(!Number.isInteger(d.value)||d.value<1||d.value>11))return false;
 const t=Date.parse(d.observedAt);return finite(t)&&now-t<ttl&&t-now<3600000;
}
export function cachedAir(d,source='cams',now=Date.now()){
 const t=Date.parse(d?.fetchedAt);
 // WAQI responses are never persisted or served from a saved cache.
 return source!=='waqi'&&d?.source===source&&validAir(d,now)&&finite(t)&&now>=t&&now-t<ttl?{...d,cached:true}:null;
}
export function airRequest(c,source='cams',key=''){
 if(!validCity(c)||!airSources[source])throw new Error('空气质量位置或来源无效');
 if(source==='hk'){if(c.country_code!=='HK')throw new Error('香港环保署仅提供香港资料，请切换其他来源');return '/native/data?kind=hkair';}
 if(['waqi','openweather'].includes(source)&&(!/^[a-zA-Z0-9_-]{8,200}$/.test(key)||key==='demo'))throw new Error('请在底部配置自己的数据源密钥');
 if(source==='waqi')return `https://api.waqi.info/feed/geo:${c.latitude};${c.longitude}/?token=${encodeURIComponent(key)}`;
 const u=new URL(source==='openweather'?'https://api.openweathermap.org/data/2.5/air_pollution':'https://air-quality-api.open-meteo.com/v1/air-quality');
 u.search=new URLSearchParams(source==='openweather'?{lat:c.latitude,lon:c.longitude,appid:key}:{latitude:c.latitude,longitude:c.longitude,timezone:'GMT',current:'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',forecast_days:1});return u.toString();
}
export function normalizeAir(raw,source,c,now=Date.now()){
 let r={source,fetchedAt:new Date(now).toISOString(),pollutants:{},attributions:[]};
 if(source==='cams'){
  const d=raw?.current||{};r={...r,value:number(d.us_aqi),observedAt:typeof d.time==='string'?d.time+'Z':null,unit:'μg/m³',pollutants:Object.fromEntries(['pm2_5','pm10','carbon_monoxide','nitrogen_dioxide','sulphur_dioxide','ozone'].map(k=>[k,number(d[k])])),description:'CAMS / Copernicus 模型估算，经 Open-Meteo 获取；非附近监测站实测。',attributions:[{name:'CAMS / Copernicus',url:'https://atmosphere.copernicus.eu/'},{name:'Open-Meteo',url:'https://open-meteo.com/'}]};
 }else if(source==='openweather'){
  const d=raw?.list?.[0],p=d?.components||{};r={...r,value:number(d?.main?.aqi),observedAt:finite(d?.dt)?new Date(d.dt*1000).toISOString():null,unit:'μg/m³',pollutants:{pm2_5:number(p.pm2_5),pm10:number(p.pm10),ozone:number(p.o3),nitrogen_dioxide:number(p.no2),sulphur_dioxide:number(p.so2),carbon_monoxide:number(p.co)},description:'OpenWeather 空气污染资料；1–5级独立标准，与美国 AQI 或中国国标不能直接比较。',attributions:[{name:'OpenWeather',url:'https://openweathermap.org/'}]};
 }else if(source==='waqi'){
  const d=raw?.data;if(raw?.status!=='ok'||!d||!finite(d.aqi))throw new Error('WAQI 未返回有效资料，请检查 Token 和站点覆盖');
  const p=d.iaqi||{},g=d.city?.geo,station=Array.isArray(g)&&g.length===2?{latitude:Number(g[0]),longitude:Number(g[1])}:null;
  r={...r,value:number(d.aqi),observedAt:d.time?.iso||null,stationName:d.city?.name||'附近监测站',stationDistance:station&&finite(station.latitude)&&finite(station.longitude)?distance(c,station):null,unit:'分指数',pollutants:Object.fromEntries([['pm2_5','pm25'],['pm10','pm10'],['ozone','o3'],['nitrogen_dioxide','no2'],['sulphur_dioxide','so2'],['carbon_monoxide','co']].map(([k,v])=>[k,number(p[v]?.v)])),description:'WAQI 汇集的监测站资料；污染物显示 AQI 分指数，不是浓度。',attributions:[{name:'World Air Quality Index Project',url:'https://waqi.info/'},...(Array.isArray(d.attributions)?d.attributions.map(a=>({name:String(a.name||''),url:a.url})):[])]};
 }else if(source==='hk'){
  const rows=(Array.isArray(raw)?raw:raw?.stations||[]).map(d=>({name:String(d.station||''),value:d.aqhi==='10+'?11:number(d.aqhi),observedAt:typeof d.publish_date==='string'?d.publish_date+'+08:00':null})).filter(d=>d.name&&validAir({source:'hk',...d},now));
  if(!rows.length)throw new Error('香港环保署当前资料缺失或已过期');
  const general=rows.filter(d=>!['Central','Causeway Bay','Mong Kok'].includes(d.name)),shown=general,max=shown.length?shown.reduce((a,b)=>a.value>=b.value?a:b):null;
  if(!max)throw new Error('香港一般监测站资料暂不可用');
  r={...r,value:max.value,observedAt:max.observedAt,stations:rows,description:'香港环保署各站 AQHI；主值为有效一般监测站最高值，非所选坐标实测。1–10及10+为健康风险指数。',attributions:[{name:'香港环境保护署 / DATA.GOV.HK',url:'https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk2-city-dashboard-aqhi'}]};
 }
 if(!validAir(r,now))throw new Error('空气质量资料缺失或已过期，请刷新或切换来源');return r;
}
export async function fetchAir(c,source='cams',key=''){
 const url=airRequest(c,source,key);let raw;try{raw=await getJSON(url);}catch{throw new Error('数据源请求失败，请检查网络、密钥权限或服务额度');}return normalizeAir(raw,source,c);
}
