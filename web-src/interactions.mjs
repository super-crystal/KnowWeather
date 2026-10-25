const refreshArrow='<svg class="refresh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 6M16 9h4V5"/></svg>';
const refreshCircle='<svg class="refresh-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle class="spinner-track" cx="12" cy="12" r="8"/><circle class="spinner-arc" cx="12" cy="12" r="8"/></svg>';
export function refreshMarkup(label=''){return refreshArrow+refreshCircle+(label?`<span>${label}</span>`:'');}
export function setRefreshBusy(button,busy){if(!button)return;button.classList.add('refresh-button');button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.classList.toggle('is-refreshing',busy);}
export async function runRefresh(button,action){if(!button||button.disabled)return;const started=Date.now();setRefreshBusy(button,true);try{return await action();}finally{const remaining=450-(Date.now()-started);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));setRefreshBusy(button,false);}}
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const easing='cubic-bezier(.22,.8,.24,1)';
const pressed=new WeakMap(),pointers=new Map(),pageAnimations=new WeakMap(),closing=new WeakMap();
function animateScale(target,scale,duration){
 if(reduced()||!target.animate)return;
 const previous=pressed.get(target),from=getComputedStyle(target).transform;
 previous?.cancel();
 const animation=target.animate([{transform:from==='none'?'scale(1)':from},{transform:`scale(${scale})`}],{duration,easing,fill:'forwards'});
 pressed.set(target,animation);
 if(scale===1)animation.finished.then(()=>{if(pressed.get(target)===animation){animation.cancel();pressed.delete(target);}}).catch(()=>{});
}
function wave(target,event){
 if(reduced()||target.tagName!=='BUTTON')return;
 target.querySelector('.tap-ripple')?.remove();
 const bounds=target.getBoundingClientRect(),ripple=document.createElement('span'),diameter=Math.min(220,Math.max(bounds.width,bounds.height)*1.6);
 ripple.className='tap-ripple';ripple.setAttribute('aria-hidden','true');
 const pointer=event.type==='pointerdown',x=pointer?event.clientX-bounds.left:bounds.width/2,y=pointer?event.clientY-bounds.top:bounds.height/2;
 Object.assign(ripple.style,{width:diameter+'px',height:diameter+'px',left:x+'px',top:y+'px'});target.append(ripple);
 ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});setTimeout(()=>ripple.remove(),600);
}
const control=event=>event.target.closest?.('button,a,[role="button"],select,input[type="radio"]');
export function installInteractions(){
 document.addEventListener('pointerdown',event=>{
  const target=control(event);if(!target||target.disabled||event.button!==0)return;
  pointers.set(event.pointerId,{target,x:event.clientX,y:event.clientY});animateScale(target,.975,100);wave(target,event);
 },{capture:true,passive:true});
 const release=event=>{const state=pointers.get(event.pointerId);if(!state)return;pointers.delete(event.pointerId);animateScale(state.target,1,240);};
 document.addEventListener('pointerup',release,{capture:true,passive:true});
 document.addEventListener('pointercancel',release,{capture:true,passive:true});
 document.addEventListener('pointermove',event=>{const state=pointers.get(event.pointerId);if(state&&Math.hypot(event.clientX-state.x,event.clientY-state.y)>12)release(event);},{capture:true,passive:true});
 document.addEventListener('click',event=>{const target=control(event);if(target&&!target.disabled&&event.detail===0){animateScale(target,.975,75);setTimeout(()=>animateScale(target,1,220),75);wave(target,event);}},true);
 window.addEventListener('blur',()=>{for(const state of pointers.values())animateScale(state.target,1,140);pointers.clear();});
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{event.preventDefault();closePage(dialog);}));
 window.weatherlyBack=()=>{const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(!dialog)return false;closePage(dialog);return true;};
 const pauseSky=()=>document.body.classList.toggle('sky-paused',document.hidden||!!document.querySelector('dialog[open]'));
 document.addEventListener('visibilitychange',pauseSky);new MutationObserver(pauseSky).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});pauseSky();
}
export function openPage(dialog){
 if(dialog.open)return pageAnimations.get(dialog)?.finished.catch(()=>{})||Promise.resolve();
 dialog.showModal();dialog.scrollTop=0;
 if(reduced()||!dialog.animate)return Promise.resolve();
 const page=dialog.classList.contains('page-dialog');
 const animation=dialog.animate(page?[{transform:'translate3d(16%,0,0)',opacity:.7},{transform:'translate3d(0,0,0)',opacity:1}]:[{transform:'translate3d(0,14px,0) scale(.98)',opacity:0},{transform:'translate3d(0,0,0) scale(1)',opacity:1}],{duration:page?340:260,easing});
 pageAnimations.set(dialog,animation);return animation.finished.catch(()=>{});
}
export function closePage(dialog){
 if(!dialog?.open)return Promise.resolve();if(closing.has(dialog))return closing.get(dialog);
 const from=getComputedStyle(dialog).transform;pageAnimations.get(dialog)?.cancel();
 dialog.classList.add('page-leaving');dialog.inert=true;
 const task=Promise.resolve().then(async()=>{
  if(!reduced()&&dialog.animate){const page=dialog.classList.contains('page-dialog'),animation=dialog.animate([{transform:from==='none'?'translate3d(0,0,0)':from,opacity:1},{transform:page?'translate3d(16%,0,0)':'translate3d(0,10px,0) scale(.98)',opacity:0}],{duration:page?260:200,easing,fill:'forwards'});await animation.finished.catch(()=>{});dialog.close();animation.cancel();}else dialog.close();
  dialog.inert=false;dialog.classList.remove('page-leaving');closing.delete(dialog);
 });closing.set(dialog,task);return task;
}
export function revealContent(element){
 if(reduced()||!element.animate)return;
 // Do not promote an entire long weather page/table into an oversized texture.
 const targets=element.id==='home'?[...element.querySelectorAll('.home-head,.hero')]:[...element.children];
 for(const target of targets.slice(0,3)){const box=target.getBoundingClientRect();if(box.top>=innerHeight||box.bottom<=0||box.height>innerHeight)continue;target.animate([{transform:'translate3d(0,6px,0)',opacity:.5},{transform:'translate3d(0,0,0)',opacity:1}],{duration:220,easing});}
}
