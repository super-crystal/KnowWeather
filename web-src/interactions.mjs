const refreshArrow='<svg class="refresh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 6M16 9h4V5"/></svg>';
const refreshCircle='<svg class="refresh-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle class="spinner-track" cx="12" cy="12" r="8"/><circle class="spinner-arc" cx="12" cy="12" r="8"/></svg>';
export function refreshMarkup(label=''){return refreshArrow+refreshCircle+(label?`<span>${label}</span>`:'');}
export function setRefreshBusy(button,busy){if(!button)return;button.classList.add('refresh-button');button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.classList.toggle('is-refreshing',busy);}
export async function runRefresh(button,action){if(!button||button.disabled)return;const started=Date.now();setRefreshBusy(button,true);try{return await action();}finally{const remaining=450-(Date.now()-started);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));setRefreshBusy(button,false);}}
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const easing='cubic-bezier(.22,.8,.24,1)';
const pressed=new WeakMap(),pointers=new Map(),pageAnimations=new WeakMap(),closing=new WeakMap(),pageOrigins=new WeakMap(),tabTransitions=new WeakMap();
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
// FLIP geometry starts at the actual invoking control, including scrolled cards.
export function pageFromButtonFrame(page,button){
 const sx=Math.max(.01,button.width/page.width),sy=Math.max(.01,button.height/page.height);
 return {transform:`translate3d(${button.left-page.left}px,${button.top-page.top}px,0) scale(${sx},${sy})`,borderRadius:`${Math.min(18,button.height/2)/sx}px / ${Math.min(18,button.height/2)/sy}px`,opacity:.35};
}
export function openPage(dialog,trigger){
 if(dialog.open)return pageAnimations.get(dialog)?.finished.catch(()=>{})||Promise.resolve();
 const rect=trigger?.getBoundingClientRect();
 dialog.showModal();dialog.scrollTop=0;
 const bounds=dialog.getBoundingClientRect(),origin=rect?.width&&rect?.height?rect:{left:bounds.left+bounds.width/2-24,top:bounds.top+bounds.height/2-24,width:48,height:48};
 pageOrigins.set(dialog,{trigger,rect:origin});
 if(reduced()||!dialog.animate)return Promise.resolve();
 dialog.classList.add('page-expanding');
 const animation=dialog.animate([pageFromButtonFrame(bounds,origin),{transform:'translate3d(0,0,0) scale(1,1)',borderRadius:'0px',opacity:1}],{duration:420,easing,fill:'both'});
 pageAnimations.set(dialog,animation);
 return animation.finished.catch(()=>{}).then(()=>{if(pageAnimations.get(dialog)===animation&&!closing.has(dialog)){animation.cancel();pageAnimations.delete(dialog);dialog.classList.remove('page-expanding');}});
}
export function closePage(dialog){
 if(!dialog?.open)return Promise.resolve();if(closing.has(dialog))return closing.get(dialog);
 const style=getComputedStyle(dialog),from={transform:style.transform==='none'?'translate3d(0,0,0) scale(1,1)':style.transform,opacity:style.opacity||1,borderRadius:style.borderRadius||'0px'};
 const origin=pageOrigins.get(dialog),rect=origin?.trigger?.isConnected?origin.trigger.getBoundingClientRect():origin?.rect;
 // Use the untransformed viewport size even when Back interrupts expansion.
 const bounds={left:dialog.offsetLeft||0,top:dialog.offsetTop||0,width:dialog.offsetWidth,height:dialog.offsetHeight};
 pageAnimations.get(dialog)?.cancel();pageAnimations.delete(dialog);
 dialog.classList.add('page-leaving');dialog.inert=true;
 const task=Promise.resolve().then(async()=>{
  if(!reduced()&&dialog.animate){const end=rect&&bounds.width?pageFromButtonFrame(bounds,rect):{transform:'scale(.9)',opacity:0},animation=dialog.animate([from,{...end,opacity:0}],{duration:300,easing,fill:'both'});await animation.finished.catch(()=>{});dialog.close();animation.cancel();}else dialog.close();
  dialog.inert=false;dialog.classList.remove('page-leaving','page-expanding');closing.delete(dialog);pageOrigins.delete(dialog);
 });closing.set(dialog,task);return task;
}
export function moveTabIndicator(rail,button,smooth=true){
 if(!button)return;
 let line=rail.querySelector('.tab-indicator');if(!line){line=document.createElement('span');line.className='tab-indicator';line.setAttribute('aria-hidden','true');rail.append(line);smooth=false;}
 const left=button.offsetLeft,width=button.offsetWidth;
 line.style.transition=smooth&&!reduced()?'transform 340ms '+easing+', width 340ms '+easing:'none';
 line.style.width=width+'px';line.style.transform=`translate3d(${left}px,0,0)`;
 rail.scrollTo({left:Math.max(0,Math.min(rail.scrollWidth-rail.clientWidth,left+width/2-rail.clientWidth/2)),behavior:smooth&&!reduced()?'smooth':'instant'});
}
export function transitionTabContent(content,update,direction=1){
 tabTransitions.get(content)?.();
 if(reduced()||!content.animate){update();return Promise.resolve();}
 const page=content.closest('dialog'),box=content.getBoundingClientRect(),rail=page.querySelector('.detail-tabs').getBoundingClientRect(),top=Math.max(rail.bottom,box.top),height=Math.max(0,Math.min(innerHeight,box.bottom)-top);
 const frame=document.createElement('div');frame.className='tab-outgoing';frame.setAttribute('aria-hidden','true');frame.inert=true;
 Object.assign(frame.style,{left:box.left+'px',top:top+'px',width:box.width+'px',height:height+'px'});
 const snapshot=content.cloneNode(true);snapshot.removeAttribute('id');snapshot.removeAttribute('role');snapshot.removeAttribute('aria-labelledby');snapshot.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
 snapshot.style.margin='0';snapshot.style.transform=`translateY(${box.top-top}px)`;frame.append(snapshot);
 update();
 if(!height)return Promise.resolve();
 page.append(frame);page.classList.add('tabs-moving');
 // Clip both surfaces to one viewport; never animate a 48-hour table texture.
 const oldStyle={height:content.style.height,minHeight:content.style.minHeight,maxHeight:content.style.maxHeight,overflow:content.style.overflow};
 const newHeight=Math.max(1,innerHeight-content.getBoundingClientRect().top);
 Object.assign(content.style,{height:newHeight+'px',minHeight:'0',maxHeight:newHeight+'px',overflow:'hidden'});
 const incoming=content.animate([{transform:`translate3d(${direction*100}%,0,0)`,opacity:.65},{transform:'translate3d(0,0,0)',opacity:1}],{duration:340,easing,fill:'both'});
 const outgoing=frame.animate([{transform:'translate3d(0,0,0)',opacity:1},{transform:`translate3d(${-direction*100}%,0,0)`,opacity:.65}],{duration:340,easing,fill:'both'});
 let done=false;const cleanup=()=>{if(done)return;done=true;incoming.cancel();outgoing.cancel();frame.remove();Object.assign(content.style,oldStyle);page.classList.remove('tabs-moving');if(tabTransitions.get(content)===cleanup)tabTransitions.delete(content);};
 tabTransitions.set(content,cleanup);return Promise.allSettled([incoming.finished,outgoing.finished]).then(cleanup);
}
export function revealContent(element){
 if(reduced()||!element.animate)return;
 // Do not promote an entire long weather page/table into an oversized texture.
 const targets=element.id==='home'?[...element.querySelectorAll('.home-head,.hero')]:[...element.children];
 for(const target of targets.slice(0,3)){const box=target.getBoundingClientRect();if(box.top>=innerHeight||box.bottom<=0||box.height>innerHeight)continue;target.animate([{transform:'translate3d(0,6px,0)',opacity:.5},{transform:'translate3d(0,0,0)',opacity:1}],{duration:220,easing});}
}
