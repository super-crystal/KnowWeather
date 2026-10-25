const $ = id => document.getElementById(id);
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage = {get(key, fallback) {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}},set(key, value) {try {localStorage.setItem(key, JSON.stringify(value));} catch {}}};
const cities = [
  {name:'北京',aliases:'beijing peking',latitude:39.9042,longitude:116.4074,country:'中国',country_code:'CN',admin1:'北京市',timezone:'Asia/Shanghai'},
  {name:'上海',aliases:'shanghai',latitude:31.2304,longitude:121.4737,country:'中国',country_code:'CN',admin1:'上海市',timezone:'Asia/Shanghai'},
  {name:'杭州',aliases:'hangzhou',latitude:30.2741,longitude:120.1551,country:'中国',country_code:'CN',admin1:'浙江省',timezone:'Asia/Shanghai'},
  {name:'广州',aliases:'guangzhou canton',latitude:23.1291,longitude:113.2644,country:'中国',country_code:'CN',admin1:'广东省',timezone:'Asia/Shanghai'},
  {name:'深圳',aliases:'shenzhen',latitude:22.5431,longitude:114.0579,country:'中国',country_code:'CN',admin1:'广东省',timezone:'Asia/Shanghai'},
  {name:'成都',aliases:'chengdu',latitude:30.5728,longitude:104.0668,country:'中国',country_code:'CN',admin1:'四川省',timezone:'Asia/Shanghai'},
  {name:'武汉',aliases:'wuhan',latitude:30.5928,longitude:114.3055,country:'中国',country_code:'CN',admin1:'湖北省',timezone:'Asia/Shanghai'},
  {name:'西安',aliases:'xian xi an',latitude:34.3416,longitude:108.9398,country:'中国',country_code:'CN',admin1:'陕西省',timezone:'Asia/Shanghai'},
  {name:'重庆',aliases:'chongqing',latitude:29.563,longitude:106.5516,country:'中国',country_code:'CN',admin1:'重庆市',timezone:'Asia/Shanghai'},
  {name:'南京',aliases:'nanjing',latitude:32.0603,longitude:118.7969,country:'中国',country_code:'CN',admin1:'江苏省',timezone:'Asia/Shanghai'},
  {name:'香港',aliases:'hong kong hongkong',latitude:22.3193,longitude:114.1694,country:'中国香港',country_code:'HK',admin1:'香港',timezone:'Asia/Hong_Kong'},
  {name:'台北',aliases:'taipei taibei',latitude:25.033,longitude:121.5654,country:'中国台湾',country_code:'TW',admin1:'台北',timezone:'Asia/Taipei'},
  {name:'东京',aliases:'tokyo dongjing',latitude:35.6762,longitude:139.6503,country:'日本',country_code:'JP',admin1:'东京都',timezone:'Asia/Tokyo'},
  {name:'纽约',aliases:'new york newyork niuyue',latitude:40.7128,longitude:-74.006,country:'美国',country_code:'US',admin1:'纽约州',timezone:'America/New_York'},
  {name:'伦敦',aliases:'london lundun',latitude:51.5074,longitude:-.1278,country:'英国',country_code:'GB',admin1:'英格兰',timezone:'Europe/London'},
  {name:'巴黎',aliases:'paris bali',latitude:48.8566,longitude:2.3522,country:'法国',country_code:'FR',admin1:'法兰西岛',timezone:'Europe/Paris'},
  {name:'柏林',aliases:'berlin bolin',latitude:52.52,longitude:13.405,country:'德国',country_code:'DE',admin1:'柏林',timezone:'Europe/Berlin'},
  {name:'多伦多',aliases:'toronto duolunduo',latitude:43.6532,longitude:-79.3832,country:'加拿大',country_code:'CA',admin1:'安大略省',timezone:'America/Toronto'},
  {name:'悉尼',aliases:'sydney xini',latitude:-33.8688,longitude:151.2093,country:'澳大利亚',country_code:'AU',admin1:'新南威尔士州',timezone:'Australia/Sydney'},
  {name:'新加坡',aliases:'singapore xinjiapo',latitude:1.3521,longitude:103.8198,country:'新加坡',country_code:'SG',admin1:'新加坡',timezone:'Asia/Singapore'}
];
const sources = {
  CN:{model:'ecmwf_ifs025',name:'ECMWF IFS',detail:'欧洲中期天气预报中心 · 全球模型'},
  US:{model:'gfs_seamless',name:'NOAA GFS',detail:'美国国家海洋和大气管理局'},
  JP:{model:'jma_seamless',name:'JMA',detail:'日本气象厅 · 日本地区模型'},
  DE:{model:'icon_seamless',name:'DWD ICON',detail:'德国气象局 · 地区模型'},
  FR:{model:'meteofrance_seamless',name:'Météo-France',detail:'法国气象局 · 地区模型'},
  CA:{model:'gem_seamless',name:'GEM',detail:'加拿大环境与气候变化部'},
  GLOBAL:{model:'ecmwf_ifs025',name:'ECMWF IFS',detail:'欧洲中期天气预报中心 · 全球模型'},
  FALLBACK:{model:'best_match',name:'Open-Meteo Best Match',detail:'自动组合可用模型 · 备用来源'}
};
const validCity = c => c && typeof c.name === 'string' && c.name.length < 150 && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && Math.abs(c.latitude)<=90 && Math.abs(c.longitude)<=180;
let selectedCity = storage.get('weatherly-city', cities[0]);
if (!validCity(selectedCity)) selectedCity = cities[0];
let savedCities = storage.get('weatherly-saved', [cities[0],cities[1],cities[2]]);
if (!Array.isArray(savedCities)) savedCities = [cities[0],cities[1],cities[2]];
savedCities = savedCities.filter(validCity).slice(0,6);
let theme = storage.get('weatherly-theme','light');
let unit = storage.get('weatherly-unit','c');
if (!['c','f'].includes(unit)) unit='c';
let chartMode='temperature', weather=null, activeSource=null, fetchedAt=null, loading=false, requestSequence=0, weatherController, searchController, searchSequence=0, searchTimer, toastTimer;
const mediaTheme = matchMedia('(prefers-color-scheme: dark)');
const sourceFor = city => sources[city.country_code] || sources.GLOBAL;
const finite = n => typeof n==='number' && Number.isFinite(n);
const fmt = (n, decimal=0) => finite(n) ? n.toFixed(decimal) : '—';
const temp = n => finite(n) ? Math.round(unit==='f' ? n*9/5+32 : n) : '—';
const tempValue = n => unit==='f' ? n*9/5+32 : n;
const cityKey = city => `${city.latitude.toFixed(3)},${city.longitude.toFixed(3)}`;
function condition(code,isDay=true) {
  if (!finite(code)) return {name:'暂无数据',icon:'cloud',cls:'cloudy'};
  if (code===0) return {name:isDay?'晴朗':'晴朗的夜晚',icon:isDay?'sun':'moon',cls:''};
  if (code<=2) return {name:code===1?'晴间多云':'多云',icon:isDay?'sun':'moon',cls:''};
  if (code===3) return {name:'阴天',icon:'cloud',cls:'cloudy'};
  if (code===45 || code===48) return {name:'雾',icon:'cloud',cls:'cloudy'};
  if ((code>=71&&code<=77)||code===85||code===86) return {name:'降雪',icon:'snow',cls:'wet'};
  if (code>=95) return {name:'雷阵雨',icon:'rain',cls:'wet'};
  if (code>=51) return {name:code<=57?'毛毛雨':code>=80?'阵雨':'雨',icon:'rain',cls:'wet'};
  return {name:'多云',icon:'cloud',cls:'cloudy'};
}
function applyTheme(value) {
  theme=['light','dark','auto'].includes(value)?value:'light';
  const actual=theme==='auto'?(mediaTheme.matches?'dark':'light'):theme;
  document.documentElement.dataset.theme=actual;
  document.querySelector('meta[name="theme-color"]').content=actual==='dark'?'#151d26':'#f5f7f9';
  document.querySelectorAll('.theme-control button').forEach(b=>{b.classList.toggle('selected',b.dataset.theme===theme);b.setAttribute('aria-pressed',b.dataset.theme===theme);});
  $('quickTheme').innerHTML=icon(actual==='light'?'moon':'sun');
  $('quickTheme').setAttribute('aria-label',actual==='light'?'切换深色主题':'切换浅色主题');
  storage.set('weatherly-theme',theme);
}
mediaTheme.addEventListener('change',()=>{if(theme==='auto')applyTheme('auto');});
document.querySelectorAll('.theme-control button').forEach(b=>b.addEventListener('click',()=>applyTheme(b.dataset.theme)));
$('quickTheme').addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));
function applyUnit(value) {
  unit=value;storage.set('weatherly-unit',unit);
  document.querySelectorAll('[data-unit]').forEach(b=>{b.classList.toggle('selected',b.dataset.unit===unit);b.setAttribute('aria-pressed',b.dataset.unit===unit);});
  renderWeather();
}
document.querySelectorAll('[data-unit]').forEach(b=>b.addEventListener('click',()=>applyUnit(b.dataset.unit)));
document.querySelectorAll('[data-chart]').forEach(b=>b.addEventListener('click',()=>{chartMode=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',el===b);});renderHourly();}));
function toast(message) {clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function notice(message='') {$('notice').textContent=message;$('notice').hidden=!message;}
function renderCity() {
  $('cityName').textContent=selectedCity.name;
  $('crumbCity').textContent=selectedCity.name;
  $('cityRegion').textContent=[selectedCity.country,selectedCity.admin1].filter(Boolean).join(' · ') || '当前位置';
  document.title=`${selectedCity.name}天气 · 知天气`;
  renderClock();renderSaved();
}
function renderClock() {
  const timeZone=weather?.timezone || selectedCity.timezone || 'Asia/Shanghai';
  try {
    $('dateText').textContent=new Intl.DateTimeFormat('zh-CN',{timeZone,month:'long',day:'numeric',weekday:'long'}).format(new Date())+' · 愿今天，有好天气';
    $('localTime').textContent='当地时间 '+new Intl.DateTimeFormat('zh-CN',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  } catch { $('dateText').textContent='城市天气';$('localTime').textContent='当地时间 —'; }
}
function renderSaved() {
  $('savedCities').replaceChildren();
  savedCities.forEach(city=>{
    const b=document.createElement('button');b.className='saved-city'+(cityKey(city)===cityKey(selectedCity)?' selected':'');
    b.setAttribute('aria-pressed',cityKey(city)===cityKey(selectedCity));
    b.innerHTML=`<span class="city-small">${icon('pin')} ${escapeHTML(city.name)}</span><span class="city-country">${escapeHTML(city.country_code||'')}</span>`;
    b.addEventListener('click',()=>selectCity(city));$('savedCities').append(b);
  });
}
function selectCity(city) {
  selectedCity=city;storage.set('weatherly-city',city);
  if(!savedCities.some(c=>cityKey(c)===cityKey(city))) {savedCities=[...savedCities,city].slice(-6);storage.set('weatherly-saved',savedCities);}
  weather=null;activeSource=null;fetchedAt=null;
  $('cityDialog').close();renderCity();renderWeather();loadWeather();
}
async function getJSON(url, signal) {
  const response=await fetch(url,{signal});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(data.error)throw new Error(data.reason||'接口不可用');
  return data;
}
function weatherURL(city,source) {
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:city.latitude,longitude:city.longitude,timezone:'auto',forecast_days:7,models:source.model,
    current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m',
    hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,is_day,visibility',
    daily:'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset'});
  return url.toString();
}
function usableWeather(data) {
  return finite(data?.current?.temperature_2m)&&Array.isArray(data?.daily?.time)&&data.daily.time.length>=7&&data?.hourly?.temperature_2m?.some(finite);
}
async function supplementDetails(data,city,signal) {
  const needsUV=!finite(data.daily.uv_index_max?.[0]), needsVisibility=!data.hourly.visibility?.some(finite);
  if(!needsUV&&!needsVisibility)return;
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:city.latitude,longitude:city.longitude,timezone:'auto',forecast_days:7,models:'best_match',daily:'uv_index_max',hourly:'visibility'});
  try {
    const extra=await getJSON(url,AbortSignal.any([signal,AbortSignal.timeout(6500)]));
    data.supplemented=[];
    if(needsUV&&extra.daily?.uv_index_max?.some(finite)) {
      data.daily.uv_index_max=data.daily.time.map(time=>extra.daily.uv_index_max[extra.daily.time.indexOf(time)]??null);data.supplemented.push('uv');
    }
    if(needsVisibility&&extra.hourly?.visibility?.some(finite)) {
      data.hourly.visibility=data.hourly.time.map(time=>extra.hourly.visibility[extra.hourly.time.indexOf(time)]??null);data.supplemented.push('visibility');
    }
  } catch { /* Optional indicators may remain unavailable without losing the forecast. */ }
}
async function loadWeather() {
  const sequence=++requestSequence, city=selectedCity, preferred=sourceFor(city);
  weatherController?.abort();const controller=new AbortController();weatherController=controller;
  loading=true;document.body.classList.add('loading-data');$('refresh').classList.add('loading');$('refresh').disabled=true;notice();
  $('liveState').innerHTML='<i></i> 正在更新';
  if(!weather) {$('sourceText').textContent=`${preferred.name} · 正在获取 ${city.name} 的预报`;renderEmpty();}
  const timer=setTimeout(()=>controller.abort('timeout'),26000);
  let data, source=preferred, fallback=false;
  try {
    try { data=await getJSON(weatherURL(city,preferred),AbortSignal.any([controller.signal,AbortSignal.timeout(12000)]));if(!usableWeather(data))throw new Error('地区源预报不完整'); }
    catch(error) {if(controller.signal.aborted)throw error;source=sources.FALLBACK;fallback=true;data=await getJSON(weatherURL(city,source),controller.signal);if(!usableWeather(data))throw new Error('预报数据不完整');}
    if(sequence!==requestSequence)return;
    weather=data;activeSource=source;fetchedAt=new Date();
    storage.set('weatherly-cache-'+cityKey(city),{weather:data,source,fetchedAt:fetchedAt.toISOString()});
    $('liveState').innerHTML='<i></i> 最新预报';
    if(fallback)notice(`${preferred.name} 暂不可用，已自动切换到 Open-Meteo 备用源。`);
    renderWeather();
    await supplementDetails(data,city,controller.signal);
    if(sequence!==requestSequence)return;
    storage.set('weatherly-cache-'+cityKey(city),{weather:data,source,fetchedAt:fetchedAt.toISOString()});
    renderWeather();
  } catch(error) {
    if(sequence!==requestSequence)return;
    const cache=storage.get('weatherly-cache-'+cityKey(city),null);
    if(cache&&usableWeather(cache.weather)&&Date.now()-new Date(cache.fetchedAt).getTime()<6*3600000) {
      weather=cache.weather;activeSource=cache.source;fetchedAt=new Date(cache.fetchedAt);renderWeather();
      $('liveState').innerHTML='<i></i> 缓存预报';notice('暂时无法连接天气服务，正在显示上次保存的数据。请稍后刷新。');
    } else if(weather) {$('liveState').innerHTML='<i></i> 更新失败';notice('天气更新失败，保留上次预报。请检查网络后重试。');}
    else {$('liveState').innerHTML='<i></i> 连接失败';$('condition').textContent='暂时无法获取天气';$('sourceText').textContent='数据源连接失败 · 请检查网络后刷新';notice('暂时无法连接天气服务，请检查网络，或稍后点击「刷新天气」。');}
  } finally {
    clearTimeout(timer);if(sequence===requestSequence){loading=false;document.body.classList.remove('loading-data');$('refresh').classList.remove('loading');$('refresh').disabled=false;}
  }
}
function renderEmpty() {
  $('temperature').innerHTML='—<span>°</span>';$('condition').textContent='正在获取天气';$('feels').innerHTML='体感 —° <span>·</span> 最高 —° / 最低 —°';
  $('weatherNote').textContent='天气与美好，都会如期而至。';$('updatedAt').textContent='尚未更新';
  document.querySelector('.current-card').classList.remove('night','rainy');
  $('dailyForecast').innerHTML=Array.from({length:7},(_,i)=>`<div class="day-row"><span class="day">${i===0?'今天':i===1?'明天':'—'}</span>${icon('cloud','cloudy')}<span class="day-low">—°</span><span class="temp-track"></span><span class="day-high">—°</span></div>`).join('');
  $('chart').innerHTML='<div class="chart-empty">等待天气数据…</div>';$('hourlyForecast').replaceChildren();
  $('windValue').innerHTML='— <small>km/h</small>';$('humidityValue').innerHTML='—<small>%</small>';$('uvValue').textContent='—';$('visibilityValue').innerHTML='— <small>km</small>';
  ['windNote','humidityNote','uvNote','visibilityNote'].forEach(id=>$(id).textContent='—');$('humidityMeter').style.width='0';$('uvMarker').style.left='0';
}
function renderWeather() {
  if(!weather){renderEmpty();return;}
  const c=weather.current,d=weather.daily,cond=condition(c.weather_code,c.is_day!==0);
  $('temperature').innerHTML=`${temp(c.temperature_2m)}<span>°</span>`;$('condition').textContent=cond.name;
  $('feels').innerHTML=`体感 ${temp(c.apparent_temperature)}° <span>·</span> 最高 ${temp(d.temperature_2m_max?.[0])}° / 最低 ${temp(d.temperature_2m_min?.[0])}°`;
  document.querySelector('.current-card').classList.toggle('night',c.is_day===0);
  document.querySelector('.current-card').classList.toggle('rainy',cond.cls==='wet');
  $('weatherNote').textContent=cond.icon==='rain'?'雨天出发，记得带一把伞。':cond.icon==='snow'?'雪天路滑，给出行多留一点时间。':c.temperature_2m>30?'阳光热烈，记得补水与防晒。':c.temperature_2m<10?'天凉了，出门添一件外套。':c.is_day===0?'夜色渐深，愿你有一个好梦。':'把好天气，装进今天的计划。';
  renderClock();renderDaily();renderHourly();renderDetails();
  $('sourceText').textContent=`${activeSource?.name||'Open-Meteo'} · ${activeSource?.detail||''}${weather.supplemented?.length?' · 详情由 Best Match 补充':''} · Open-Meteo`;
  if(fetchedAt) $('updatedAt').textContent='获取于 '+new Intl.DateTimeFormat('zh-CN',{timeZone:weather.timezone||'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(fetchedAt)+'（当地）';
}
function renderDaily() {
  const d=weather.daily;
  const all=[...d.temperature_2m_min,...d.temperature_2m_max].filter(finite),min=Math.min(...all),max=Math.max(...all),range=max-min||1;
  $('dailyForecast').innerHTML=d.time.slice(0,7).map((date,i)=>{
    const cond=condition(d.weather_code?.[i]),low=d.temperature_2m_min?.[i],high=d.temperature_2m_max?.[i];
    const day=i===0?'今天':i===1?'明天':new Intl.DateTimeFormat('zh-CN',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
    const bar=finite(low)&&finite(high)?`<span class="temp-bar" style="left:${(low-min)/range*100}%;width:${Math.max(2,(high-low)/range*100)}%"></span>`:'';
    return `<div class="day-row" title="${escapeHTML(date+' '+cond.name)}"><span class="day">${day}</span>${icon(cond.icon,cond.cls)}<span class="day-low">${temp(low)}°</span><span class="temp-track">${bar}</span><span class="day-high">${temp(high)}°</span></div>`;
  }).join('');
}
function nextHours() {
  if(!weather)return [];
  const h=weather.hourly,now=weather.current.time;
  let start=h.time.findIndex(t=>t>=now);if(start<0)start=0;
  return h.time.slice(start,start+24).map((time,i)=>({time,temp:h.temperature_2m?.[start+i],rain:h.precipitation?.[start+i],probability:h.precipitation_probability?.[start+i],code:h.weather_code?.[start+i],day:h.is_day?.[start+i]}));
}
function renderHourly() {
  if(!weather){$('chart').innerHTML='<div class="chart-empty">等待天气数据…</div>';return;}
  const hours=nextHours(),values=hours.map(h=>chartMode==='temperature'?(finite(h.temp)?tempValue(h.temp):null):h.rain),available=values.filter(finite);
  const label=chartMode==='temperature'?`温度 (${unit==='c'?'°C':'°F'})`:'降水量 (mm)';
  $('chart').setAttribute('aria-label','接下来24小时'+label+'趋势');
  if(!available.length){$('chart').innerHTML='<div class="chart-empty">此数据源暂无该项小时数据</div>';return;}
  const min=chartMode==='rain'?0:Math.floor(Math.min(...available)-2),max=chartMode==='rain'?Math.max(1,Math.ceil(Math.max(...available))):Math.ceil(Math.max(...available)+2),range=max-min||1;
  const W=650,H=140,L=32,R=12,T=18,B=21,cw=W-L-R,ch=H-T-B;
  const x=i=>L+i/Math.max(1,hours.length-1)*cw, y=v=>T+(max-v)/range*ch;
  const points=values.map((v,i)=>finite(v)?{x:x(i),y:y(v),value:v,i}:null);
  // Break the path at missing hours instead of drawing fabricated values.
  let line='',area='',segment=[];
  function closeSegment(){if(!segment.length)return;const path=segment.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');line+=path+' ';area+=`${path} L${segment.at(-1).x},${H-B} L${segment[0].x},${H-B} Z `;segment=[];}
  points.forEach(p=>{if(p)segment.push(p);else closeSegment();});closeSegment();
  const grid=Array.from({length:3},(_,i)=>{const value=min+range*(2-i)/2,pos=y(value);return `<line x1="${L}" x2="${W-R}" y1="${pos}" y2="${pos}" stroke="var(--line)" stroke-dasharray="3 5"/><text x="0" y="${pos+3}" fill="var(--muted)" font-size="9">${chartMode==='rain'?value.toFixed(1):Math.round(value)}${chartMode==='rain'?'':'°'}</text>`;}).join('');
  const highlights=points.filter((p,i)=>p&&i%3===0).map(p=>`<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="var(--panel)" stroke="var(--chart-line)" stroke-width="1.7"><title>${hours[p.i].time.replace('T',' ')} · ${p.value.toFixed(chartMode==='rain'?1:0)}${chartMode==='rain'?' mm':'°'}</title></circle>`).join('');
  const labels=hours.filter((h,i)=>i%6===0||i===hours.length-1).map(h=>{const i=hours.indexOf(h);return `<text x="${x(i)}" y="${H-2}" text-anchor="middle" fill="var(--muted)" font-size="9">${h.time.slice(11,16)}</text>`;}).join('');
  $('chart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"><title>${label}，未来24小时</title>${grid}<path d="${area}" fill="var(--chart-fill)" opacity=".6"/><path d="${line}" fill="none" stroke="var(--chart-line)" stroke-width="2.2" stroke-linejoin="round"/>${highlights}${labels}</svg>`;
  $('hourlyForecast').innerHTML=hours.filter((h,i)=>i%3===0).slice(0,8).map(h=>{const cond=condition(h.code,h.day!==0);return `<div class="hour-item"><span>${h.time.slice(11,16)}</span>${icon(cond.icon,cond.cls)}<strong>${chartMode==='temperature'?`${temp(h.temp)}°`:`${fmt(h.rain,1)} mm`}</strong></div>`;}).join('');
}
function renderDetails() {
  const c=weather.current,h=nextHours()[0],uv=weather.daily.uv_index_max?.[0];
  const direction=finite(c.wind_direction_10m)?['北风','东北风','东风','东南风','南风','西南风','西风','西北风'][Math.round(c.wind_direction_10m/45)%8]:'风向暂无数据';
  $('windValue').innerHTML=`${fmt(c.wind_speed_10m,1)} <small>km/h</small>`;$('windNote').textContent=direction;
  $('humidityValue').innerHTML=`${fmt(c.relative_humidity_2m)}<small>%</small>`;$('humidityNote').textContent=!finite(c.relative_humidity_2m)?'此数据源暂无数据':c.relative_humidity_2m>70?'空气较湿润':c.relative_humidity_2m<30?'空气较干燥':'空气湿度适中';
  $('humidityMeter').style.width=`${Math.min(100,Math.max(0,c.relative_humidity_2m||0))}%`;
  $('uvValue').textContent=fmt(uv,1);$('uvNote').textContent=!finite(uv)?'此数据源暂无数据':uv<3?'今日最高 · 低':uv<6?'今日最高 · 中等':uv<8?'今日最高 · 高':uv<11?'今日最高 · 很高':'今日最高 · 极高';$('uvMarker').style.left=`${Math.min(98,(uv||0)/12*100)}%`;
  const hourIndex=weather.hourly.time.indexOf(h?.time),visibility=weather.hourly.visibility?.[hourIndex];
  $('visibilityValue').innerHTML=`${finite(visibility)?fmt(visibility/1000,1):'—'} <small>km</small>`;$('visibilityNote').textContent=!finite(visibility)?'此数据源暂无数据':visibility>=10000?'视野开阔':visibility>=5000?'能见度良好':'出行请留意路况';
  if(weather.supplemented?.includes('uv'))$('uvNote').textContent+=' · 综合模型';
  if(weather.supplemented?.includes('visibility'))$('visibilityNote').textContent+=' · 综合模型';
}
function openCityDialog() {$('cityInput').value='';renderCityResults(cities.slice(0,6),'热门城市');$('cityDialog').showModal();setTimeout(()=>$('cityInput').focus(),50);}
['searchCity','changeCity','addCity'].forEach(id=>$(id).addEventListener('click',openCityDialog));
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('cityDialog').open)openCityDialog();}});
function renderCityResults(results,caption) {
  $('searchCaption').textContent=caption;$('cityResults').replaceChildren();
  if(!results.length){const p=document.createElement('p');p.className='dialog-tip';p.textContent='没有找到这座城市，试试英文名或拼音。';$('cityResults').append(p);return;}
  results.forEach(city=>{
    const b=document.createElement('button');b.className='city-result';
    b.innerHTML=`${icon('pin')}<span><strong>${escapeHTML(city.name)}</strong><small>${escapeHTML([city.country,city.admin1].filter(Boolean).join(' · '))}</small></span><span class="result-source">${sourceFor(city).name}</span>`;
    b.addEventListener('click',()=>selectCity(city));$('cityResults').append(b);
  });
}
$('cityInput').addEventListener('input',()=>{
  const query=$('cityInput').value.trim(),sequence=++searchSequence;clearTimeout(searchTimer);searchController?.abort();
  if(!query){renderCityResults(cities.slice(0,6),'热门城市');return;}
  const local=cities.filter(c=>(c.name+' '+c.aliases).toLowerCase().includes(query.toLowerCase()));
  renderCityResults(local,local.length?'匹配城市 · 正在搜索更多…':'正在搜索全球城市…');
  searchTimer=setTimeout(async()=>{
    searchController=new AbortController();
    try {
      const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:query,count:10,language:'zh',format:'json'});
      const data=await getJSON(url,AbortSignal.any([searchController.signal,AbortSignal.timeout(9000)]));if(sequence!==searchSequence)return;
      const merged=[...local];(data.results||[]).filter(validCity).forEach(c=>{if(!merged.some(m=>cityKey(m)===cityKey(c)))merged.push(c);});renderCityResults(merged,'搜索结果');
    } catch(error) {if(sequence!==searchSequence)return;renderCityResults(local,local.length?'本地匹配 · 全球搜索暂不可用':'全球搜索暂不可用，请稍后重试');}
  },350);
});
$('cityDialog').addEventListener('close',()=>{searchSequence++;clearTimeout(searchTimer);searchController?.abort();});
$('sourceInfo').addEventListener('click',()=>{$('sourceCurrent').textContent=`${selectedCity.name} · 当前来源：${activeSource?.name || sourceFor(selectedCity).name}${!weather?'（尚未取得数据）':''}${weather?.supplemented?.length?'；部分详情来自 Best Match 综合模型':''}`;$('sourceDialog').showModal();});
$('refresh').addEventListener('click',loadWeather);
$('locate').addEventListener('click',()=>{
  if(!navigator.geolocation){toast('浏览器暂不支持定位，请搜索城市。');return;}
  $('locate').disabled=true;
  navigator.geolocation.getCurrentPosition(position=>{
    $('locate').disabled=false;selectCity({name:'当前位置',latitude:position.coords.latitude,longitude:position.coords.longitude,country:'',country_code:'',admin1:`${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°`,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});toast('已根据你的位置获取天气');
  },error=>{$('locate').disabled=false;toast(error.code===1?'未获得定位权限，你可以直接搜索城市。':'暂时无法定位，请搜索城市。');},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
});
document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el===a));}));
applyTheme(theme);applyUnit(unit);renderCity();loadWeather();
setInterval(renderClock,60000);
setInterval(()=>{if(document.visibilityState==='visible'&&!loading)loadWeather();},15*60*1000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!loading&&fetchedAt&&Date.now()-fetchedAt.getTime()>15*60*1000)loadWeather();});
