const refreshArrow='<svg class="refresh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 6M16 9h4V5"/></svg>';
const refreshCircle='<svg class="refresh-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle class="spinner-track" cx="12" cy="12" r="8"/><circle class="spinner-arc" cx="12" cy="12" r="8"/></svg>';
export function refreshMarkup(label=''){return refreshArrow+refreshCircle+(label?`<span>${label}</span>`:'');}
export function setRefreshBusy(button,busy){if(!button)return;button.classList.add('refresh-button');button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.classList.toggle('is-refreshing',busy);}
export async function runRefresh(button,action){if(!button||button.disabled)return;const started=Date.now();setRefreshBusy(button,true);try{return await action();}finally{const remaining=450-(Date.now()-started);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));setRefreshBusy(button,false);}}
export function installInteractions(){
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 // Capture also covers controls created later, including city cards and map zoom controls.
 document.addEventListener('click',event=>{
  const target=event.target.closest('button,a,[role="button"],select,input[type="radio"]');
  if(!target||target.disabled||reduced())return;
  target.animate?.([{scale:'1'},{scale:'.96'},{scale:'1'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
  if(target.tagName==='BUTTON'){
   const bounds=target.getBoundingClientRect(),ripple=document.createElement('span');
   ripple.className='tap-ripple';ripple.setAttribute('aria-hidden','true');
   const diameter=Math.max(bounds.width,bounds.height)*2;
   const x=event.detail?event.clientX-bounds.left:bounds.width/2,y=event.detail?event.clientY-bounds.top:bounds.height/2;
   Object.assign(ripple.style,{width:diameter+'px',height:diameter+'px',left:x+'px',top:y+'px'});
   target.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});setTimeout(()=>ripple.remove(),650);
  }
 },true);
}
