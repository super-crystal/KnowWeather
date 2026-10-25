// Independent WebView implementation; design references are recorded in docs/FlClash动画分析.md.
export const motion=Object.freeze({press:90,release:320,container:300,return:260,tab:220,indicator:250,theme:220,reveal:240,standard:'cubic-bezier(.4,0,.2,1)',decelerate:'cubic-bezier(.215,.61,.355,1)'});
export function pressScaleFor(width,height){return 1-Math.min(.045,2/Math.max(1,Math.min(width,height)));}
export function springProgress(t){if(t<=0)return 0;if(t>=1)return 1;const a=18,w=Math.sqrt(420-a*a),response=s=>1-Math.exp(-a*s)*(Math.cos(w*s)+a/w*Math.sin(w*s));return response(t*.32)+(1-response(.32))*t;}
export function springScaleFrames(from,to=1){return Array.from({length:33},(_,i)=>({offset:i/32,transform:`scale(${from+(to-from)*springProgress(i/32)})`}));}
const moving=new Set(),pending=new Map();
export function beginMotion(){const token={};moving.add(token);let ended=false;return ()=>{if(ended)return;ended=true;moving.delete(token);if(!moving.size)queueMicrotask(()=>{if(moving.size)return;const jobs=[...pending.values()];pending.clear();for(const job of jobs)job();});};}
export function whenMotionSettles(key,update){if(moving.size)pending.set(key,update);else{pending.delete(key);update();}}
let themeTransition;
export function transitionTheme(update){themeTransition?.skipTransition();themeTransition=null;if(typeof document==='undefined'||document.hidden||moving.size||matchMedia('(prefers-reduced-motion:reduce)').matches||typeof document.startViewTransition!=='function'){update();return Promise.resolve();}try{const current=document.startViewTransition(update);themeTransition=current;current.ready.catch(()=>{});return current.finished.catch(()=>{}).finally(()=>{if(themeTransition===current)themeTransition=null;});}catch{update();return Promise.resolve();}}
