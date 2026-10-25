export function customizeHTML(html) {
  html=html.replace('<footer>',`<section class="mobile-tools panel" aria-label="天气设置"><div class="tool-row"><label for="chinaSource">中国地区数据源</label><select id="chinaSource"><option value="auto">自动匹配</option><option value="cma">中国气象局 CMA</option><option value="ecmwf">ECMWF IFS</option></select></div><p id="chinaSourceNote" class="section-description">CMA 通过 Open-Meteo 获取；不可用时自动切换备用源。</p><a class="cards-entry" href="https://appassets.androidplatform.net/native/cards"><span><strong>卡片中心</strong><small>实时天气 · 日出日落 · 添加到桌面</small></span><svg class="icon"><use href="#i-arrow"/></svg></a></section><footer>`);
  html=html.replace('中国气象局开放数据暂不稳定，当前使用 ECMWF。','中国地区可在页面底部选择中国气象局 CMA（通过 Open-Meteo）或 ECMWF；CMA 不可用时使用备用源，并标明实际来源。');
  html=html.replace('<div><span>中国及其他地区</span><strong>ECMWF IFS</strong></div>','<div><span>中国地区（可选）</span><strong>CMA GRAPES / ECMWF IFS</strong></div><div><span>其他地区</span><strong>ECMWF IFS</strong></div>');
  return html;
}
export const extraCSS=`
.mobile-tools{margin-top:20px;padding:18px}.tool-row{display:flex;gap:12px;align-items:center;justify-content:space-between;font-size:13px}.tool-row select{font:inherit;max-width:58%;border:1px solid var(--line);border-radius:9px;padding:10px;color:var(--text);background:var(--panel)}.mobile-tools p{margin:12px 0 18px;line-height:1.7}.cards-entry{display:flex;align-items:center;justify-content:space-between;color:var(--text);text-decoration:none;padding-top:17px;border-top:1px solid var(--line)}.cards-entry strong{font-size:16px}.cards-entry small{display:block;font-size:12px;color:var(--muted);margin-top:7px}.cards-entry .icon{width:22px;height:22px}
`;
export function customizeJS(js) {
  js=js.replace("  CN:{model:","  CMA:{model:'cma',name:'中国气象局 CMA',detail:'GRAPES 全球模型 · 通过 Open-Meteo'},\n  CN:{model:");
  js=js.replace('const sourceFor = city => sources[city.country_code] || sources.GLOBAL;',`let chinaSource = storage.get('weatherly-china-source','auto');
if(!['auto','cma','ecmwf'].includes(chinaSource))chinaSource='auto';
const inChina = city => ['CN','HK','MO','TW'].includes(city.country_code) || (!city.country_code && city.latitude>=18 && city.latitude<=54 && city.longitude>=73 && city.longitude<=135);
const sourceFor = city => inChina(city) && chinaSource==='cma' ? sources.CMA : inChina(city) && chinaSource==='ecmwf' ? sources.CN : sources[city.country_code] || sources.GLOBAL;
function syncNative(){if(typeof window.weatherlySync==='function')window.weatherlySync({city:selectedCity,requested:sourceFor(selectedCity).model,unit,theme,weather,source:activeSource,fetchedAt:fetchedAt?.toISOString(),cached:/缓存|失败/.test($('liveState').textContent)});}`);
  js=js.replace("storage.set('weatherly-theme',theme);","storage.set('weatherly-theme',theme);\n  syncNative();");
  js=js.replace('  renderWeather();\n}\ndocument.querySelectorAll(\'[data-unit]\')','  renderWeather();syncNative();\n}\ndocument.querySelectorAll(\'[data-unit]\')');
  js=js.replace('  renderClock();renderSaved();','  renderClock();renderSaved();\n  $(\'chinaSource\').value=chinaSource;$(\'chinaSource\').disabled=!inChina(selectedCity);\n  $(\'chinaSourceNote\').textContent=inChina(selectedCity)?\'CMA 通过 Open-Meteo 获取；不可用时自动切换备用源。\':\'当前为海外城市，自动匹配所在地区的数据源。中国地区的选择已保留。\';\n  document.querySelector(\'.source-heading\').innerHTML=inChina(selectedCity)&&chinaSource!==\'auto\'?\'你为中国城市选择的数据源 <span class="auto-tag">手动</span>\':\'为这座城市，自动匹配数据源 <span class="auto-tag">自动</span>\';\n  syncNative();');
  js=js.replace("const url=new URL('https://api.open-meteo.com/v1/forecast');\n  url.search=new URLSearchParams({latitude:city.latitude,longitude:city.longitude,timezone:'auto',forecast_days:7,models:source.model,", "const url=new URL('https://api.open-meteo.com/v1/'+(source.model==='cma'?'cma':'forecast'));\n  url.search=new URLSearchParams({latitude:city.latitude,longitude:city.longitude,timezone:'auto',forecast_days:7,...(source.model==='cma'?{}:{models:source.model}),");
  js=js.replace("  renderClock();renderDaily();renderHourly();renderDetails();","  renderClock();renderDaily();renderHourly();renderDetails();\n  syncNative();");
  js=js.replace("$('refresh').disabled=false;}","$('refresh').disabled=false;syncNative();}");
  js=js.replace("$('refresh').addEventListener('click',loadWeather);",`$('refresh').addEventListener('click',loadWeather);
$('chinaSource').value=chinaSource;
$('chinaSource').addEventListener('change',()=>{chinaSource=$('chinaSource').value;storage.set('weatherly-china-source',chinaSource);weather=null;activeSource=null;fetchedAt=null;renderCity();renderWeather();loadWeather();});`);
  return js;
}
