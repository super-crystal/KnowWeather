// Compatibility for older Android System WebView versions.
if (!AbortSignal.timeout) AbortSignal.timeout = milliseconds => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), milliseconds);
  return controller.signal;
};
if (!AbortSignal.any) AbortSignal.any = signals => {
  const controller = new AbortController();
  const clean = () => signals.forEach(signal => signal.removeEventListener('abort', abort));
  const abort = () => { controller.abort(); clean(); };
  if (signals.some(signal => signal.aborted)) abort();
  else signals.forEach(signal => signal.addEventListener('abort', abort, { once: true }));
  return controller.signal;
};
if (!Array.prototype.at) Array.prototype.at = function (index) { return this[index < 0 ? this.length + index : index]; };
try {if(!localStorage.getItem('weatherly-theme'))localStorage.setItem('weatherly-theme',JSON.stringify('auto'));}catch{}
const reportTheme = () => console.log('WEATHERLY_THEME:' + document.documentElement.dataset.theme);
new MutationObserver(reportTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.weatherlySystemTheme = dark => {
  try {
    if(JSON.parse(localStorage.getItem('weatherly-theme'))==='auto') {
      document.documentElement.dataset.theme=dark?'dark':'light';
      reportTheme();
    }
  } catch {}
};
document.addEventListener('DOMContentLoaded',()=>{
  reportTheme();
  document.getElementById('mobileLocate').addEventListener('click',()=>document.getElementById('locate').click());
});
