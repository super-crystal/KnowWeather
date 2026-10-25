import {motion,pressScaleFor,springScaleFrames,beginMotion} from './motion.mjs';
const refreshArrow='<svg class="refresh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 6M16 9h4V5"/></svg>';
const refreshCircle='<svg class="refresh-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle class="spinner-track" cx="12" cy="12" r="8"/><circle class="spinner-arc" cx="12" cy="12" r="8"/></svg>';
export function refreshMarkup(label=''){return refreshArrow+refreshCircle+(label?'<span>'+label+'</span>':'');}
export function setRefreshBusy(button,busy){if(!button)return;button.classList.add('refresh-button');button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.classList.toggle('is-refreshing',busy);}
export async function runRefresh(button,action){if(!button||button.disabled)return;const started=Date.now();setRefreshBusy(button,true);try{return await action();}finally{const remaining=450-(Date.now()-started);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));setRefreshBusy(button,false);}}
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const pressed=new WeakMap(),pressedTargets=new Set(),pointers=new Map(),pageAnimations=new WeakMap(),closing=new WeakMap(),pageOrigins=new WeakMap(),tabTransitions=new WeakMap(),railAnimations=new WeakMap();
const activeCleanups=new Set();
function scaleOf(transform){if(!transform||transform==='none')return 1;const m=transform.match(/^matrix\(([^,]+),([^,]+),/);if(m)return Math.hypot(Number(m[1]),Number(m[2]));const s=transform.match(/scale\(([^,)]+)/);return s?Number(s[1]):1;}
function animateScale(target,scale){
 const previous=pressed.get(target),from=scaleOf(getComputedStyle(target).transform);previous?.cancel();
 if(reduced()||!target.animate){pressed.delete(target);pressedTargets.delete(target);return;}
 const frames=scale===1?springScaleFrames(from):[{transform:'scale('+from+')'},{transform:'scale('+scale+')'}];
 const animation=target.animate(frames,{duration:scale===1?motion.release:motion.press,easing:scale===1?'linear':motion.decelerate,fill:'forwards'});
 pressed.set(target,animation);pressedTargets.add(target);
 animation.finished.catch(()=>{});
 if(scale===1)animation.finished.then(()=>{if(pressed.get(target)===animation){animation.cancel();pressed.delete(target);pressedTargets.delete(target);}}).catch(()=>{});
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
function press(target){const box=target.getBoundingClientRect();animateScale(target,pressScaleFor(box.width,box.height));}
export function installInteractions(){
 document.addEventListener('pointerdown',event=>{const target=control(event);if(!target||target.disabled||event.button!==0)return;pointers.set(event.pointerId,{target,x:event.clientX,y:event.clientY});press(target);wave(target,event);},{capture:true,passive:true});
 const release=event=>{const state=pointers.get(event.pointerId);if(!state)return;pointers.delete(event.pointerId);animateScale(state.target,1);};
 document.addEventListener('pointerup',release,{capture:true,passive:true});document.addEventListener('pointercancel',release,{capture:true,passive:true});
 document.addEventListener('pointermove',event=>{const state=pointers.get(event.pointerId);if(state&&Math.hypot(event.clientX-state.x,event.clientY-state.y)>12)release(event);},{capture:true,passive:true});
 document.addEventListener('click',event=>{const target=control(event);if(target&&!target.disabled&&event.detail===0){press(target);setTimeout(()=>animateScale(target,1),motion.press);wave(target,event);}},true);
 const releaseAll=()=>{for(const target of pressedTargets){pressed.get(target)?.cancel();pressed.delete(target);}pressedTargets.clear();pointers.clear();};
 window.addEventListener('blur',releaseAll);
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('cancel',event=>{event.preventDefault();closePage(dialog);}));
 window.weatherlyBack=()=>{const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(!dialog)return false;closePage(dialog);return true;};
 const pauseSky=()=>document.body.classList.toggle('sky-paused',document.hidden||!!document.querySelector('dialog[open]'));
 document.addEventListener('visibilitychange',()=>{pauseSky();if(document.hidden){releaseAll();for(const cleanup of [...activeCleanups])cleanup();}});
 matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',e=>{if(e.matches){releaseAll();for(const cleanup of [...activeCleanups])cleanup();}});
 new MutationObserver(pauseSky).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});pauseSky();
}
export function pageClipFrame(page,button){
 const width=page.width,height=page.height,left=Math.max(0,Math.min(width-1,button.left-page.left)),top=Math.max(0,Math.min(height-1,button.top-page.top)),right=Math.max(0,width-Math.min(width,left+Math.max(1,button.width))),bottom=Math.max(0,height-Math.min(height,top+Math.max(1,button.height)));
 return {clipPath:'inset('+top+'px '+right+'px '+bottom+'px '+left+'px round '+Math.min(18,button.height/2)+'px)'};
}
function pageCover(dialog,trigger,bounds,rect){
 const cover=document.createElement('div');cover.className='page-morph-cover';cover.setAttribute('aria-hidden','true');cover.inert=true;
 Object.assign(cover.style,{width:bounds.width+'px',height:bounds.height+'px',background:getComputedStyle(dialog).backgroundColor});
 if(trigger){const source=trigger.cloneNode(true),style=getComputedStyle(trigger);source.removeAttribute('id');source.removeAttribute('autofocus');source.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));source.querySelectorAll('.tap-ripple').forEach(n=>n.remove());source.classList.add('page-morph-source');Object.assign(source.style,{left:rect.left-bounds.left+'px',top:rect.top-bounds.top+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',transform:'none',color:style.color,background:style.background,font:style.font,border:style.border,borderRadius:style.borderRadius});cover.append(source);}
 dialog.append(cover);return cover;
}
export function openPage(dialog,trigger){
 if(dialog.open)return pageAnimations.get(dialog)?.finished||Promise.resolve();
 const captured=trigger?.getBoundingClientRect();dialog.showModal();dialog.scrollTop=0;
 const bounds=dialog.getBoundingClientRect(),rect=captured?.width&&captured?.height?captured:{left:bounds.left+bounds.width/2-24,top:bounds.top+bounds.height/2-24,width:48,height:48};
 pageOrigins.set(dialog,{trigger,rect});if(reduced()||!dialog.animate)return Promise.resolve();
 const full=dialog.classList.contains('page-dialog'),finishMotion=beginMotion();dialog.classList.add('page-expanding');
 const start=full?pageClipFrame(bounds,rect):{transform:'translate3d('+(rect.left+rect.width/2-bounds.left-bounds.width/2)+'px,'+(rect.top+rect.height/2-bounds.top-bounds.height/2)+'px,0) scale(.92)',opacity:0};
 const animation=dialog.animate([start,full?{clipPath:'inset(0px 0px 0px 0px round 0px)'}:{transform:'translate3d(0,0,0) scale(1)',opacity:1}],{duration:motion.container,easing:motion.standard,fill:'both'});
 const cover=full?pageCover(dialog,trigger,bounds,rect):null,fade=cover?.animate([{opacity:1,offset:0},{opacity:1,offset:.2},{opacity:0,offset:.45},{opacity:0,offset:1}],{duration:motion.container,easing:'linear',fill:'both'});
 fade?.finished.catch(()=>{});
 let done=false;const cleanup=()=>{if(done)return;done=true;animation.cancel();fade?.cancel();cover?.remove();if(pageAnimations.get(dialog)===state)pageAnimations.delete(dialog);dialog.classList.remove('page-expanding');activeCleanups.delete(cleanup);finishMotion();};
 const state={cleanup,finished:animation.finished.catch(()=>{}).then(cleanup)};pageAnimations.set(dialog,state);activeCleanups.add(cleanup);return state.finished;
}
export function closePage(dialog){
 if(!dialog?.open)return Promise.resolve();if(closing.has(dialog))return closing.get(dialog);
 const style=getComputedStyle(dialog),from={clipPath:style.clipPath&&style.clipPath!=='none'?style.clipPath:'inset(0px 0px 0px 0px round 0px)',transform:style.transform==='none'?'none':style.transform,opacity:style.opacity||1};
 const origin=pageOrigins.get(dialog),rect=origin?.trigger?.isConnected?origin.trigger.getBoundingClientRect():origin?.rect;
 const finishMotion=beginMotion();pageAnimations.get(dialog)?.cleanup();dialog.querySelectorAll?.('.detail-content').forEach(cancelTabTransition);
 const full=dialog.classList?.contains?.('page-dialog'),bounds={left:dialog.offsetLeft||0,top:dialog.offsetTop||0,width:dialog.offsetWidth,height:dialog.offsetHeight};
 dialog.classList.add('page-leaving');dialog.inert=true;
 let animation,done=false;const cleanup=()=>{if(done)return;done=true;dialog.close();animation?.cancel();dialog.inert=false;dialog.classList.remove('page-leaving','page-expanding');closing.delete(dialog);pageOrigins.delete(dialog);activeCleanups.delete(cleanup);finishMotion();};
 const task=Promise.resolve().then(async()=>{if(!reduced()&&dialog.animate){const end=full&&rect&&bounds.width?pageClipFrame(bounds,rect):{transform:'scale(.94)',opacity:0};animation=dialog.animate([full?{clipPath:from.clipPath}:{transform:from.transform,opacity:from.opacity},end],{duration:motion.return,easing:motion.standard,fill:'both'});await animation.finished.catch(()=>{});}cleanup();});
 closing.set(dialog,task);activeCleanups.add(cleanup);return task;
}
function scrollRail(rail,left,smooth){
 railAnimations.get(rail)?.();if(!smooth||reduced()){rail.scrollTo({left,behavior:'instant'});return;}
 const from=rail.scrollLeft,start=performance.now();let frame,done=false;
 const cancel=()=>{if(done)return;done=true;cancelAnimationFrame(frame);activeCleanups.delete(cancel);if(railAnimations.get(rail)===cancel)railAnimations.delete(rail);};
 const tick=now=>{if(done)return;const t=Math.min(1,(now-start)/motion.indicator);rail.scrollLeft=from+(left-from)*(1-(1-t)**3);if(t<1)frame=requestAnimationFrame(tick);else cancel();};
 railAnimations.set(rail,cancel);activeCleanups.add(cancel);frame=requestAnimationFrame(tick);
}
export function moveTabIndicator(rail,button,smooth=true){
 if(!button)return;let line=rail.querySelector('.tab-indicator');if(!line){line=document.createElement('span');line.className='tab-indicator';line.setAttribute('aria-hidden','true');rail.append(line);smooth=false;}
 const left=button.offsetLeft,width=button.offsetWidth;line.style.transition=smooth&&!reduced()?'transform '+motion.indicator+'ms '+motion.decelerate+', width '+motion.indicator+'ms '+motion.decelerate:'none';line.style.width=width+'px';line.style.transform='translate3d('+left+'px,0,0)';
 scrollRail(rail,Math.max(0,Math.min(rail.scrollWidth-rail.clientWidth,left+width/2-rail.clientWidth/2)),smooth);
}
export function cancelTabTransition(content){tabTransitions.get(content)?.();}
export function transitionTabContent(content,update,direction=1){
 cancelTabTransition(content);if(reduced()||!content.animate){update();return Promise.resolve();}
 const page=content.closest('dialog'),box=content.getBoundingClientRect(),rail=page.querySelector('.detail-tabs').getBoundingClientRect(),top=Math.max(rail.bottom,box.top),height=Math.max(0,Math.min(innerHeight,box.bottom)-top);
 const frame=document.createElement('div');frame.className='tab-outgoing';frame.setAttribute('aria-hidden','true');frame.inert=true;Object.assign(frame.style,{left:box.left+'px',top:top+'px',width:box.width+'px',height:height+'px'});
 const snapshot=content.cloneNode(true);snapshot.removeAttribute('id');snapshot.removeAttribute('role');snapshot.removeAttribute('aria-labelledby');snapshot.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));snapshot.style.margin='0';snapshot.style.transform='translateY('+(box.top-top)+'px)';frame.append(snapshot);
 update();if(!height)return Promise.resolve();page.append(frame);page.classList.add('tabs-moving');
 const finishMotion=beginMotion(),oldStyle={height:content.style.height,minHeight:content.style.minHeight,maxHeight:content.style.maxHeight,overflow:content.style.overflow},newHeight=Math.max(1,innerHeight-content.getBoundingClientRect().top),distance=direction*Math.min(48,box.width*.12);
 Object.assign(content.style,{height:newHeight+'px',minHeight:'0',maxHeight:newHeight+'px',overflow:'hidden'});
 const incoming=content.animate([{transform:'translate3d('+distance+'px,0,0)',opacity:0,offset:0},{transform:'translate3d('+(distance*.55)+'px,0,0)',opacity:0,offset:.3},{transform:'translate3d(0,0,0)',opacity:1,offset:1}],{duration:motion.tab,easing:motion.standard,fill:'both'});
 const outgoing=frame.animate([{transform:'translate3d(0,0,0)',opacity:1,offset:0},{transform:'translate3d('+(-distance*.6)+'px,0,0)',opacity:0,offset:.3},{transform:'translate3d('+(-distance)+'px,0,0)',opacity:0,offset:1}],{duration:motion.tab,easing:motion.standard,fill:'both'});
 let done=false;const cleanup=()=>{if(done)return;done=true;incoming.cancel();outgoing.cancel();frame.remove();Object.assign(content.style,oldStyle);page.classList.remove('tabs-moving');if(tabTransitions.get(content)===cleanup)tabTransitions.delete(content);activeCleanups.delete(cleanup);finishMotion();};
 tabTransitions.set(content,cleanup);activeCleanups.add(cleanup);return Promise.allSettled([incoming.finished,outgoing.finished]).then(cleanup);
}
export function revealContent(element){
 if(reduced()||!element.animate)return;const targets=element.id==='home'?[...element.querySelectorAll('.home-head,.hero')]:[...element.children];
 for(const target of targets.slice(0,3)){const box=target.getBoundingClientRect();if(box.top>=innerHeight||box.bottom<=0||box.height>innerHeight)continue;target.animate([{transform:'translate3d(0,12px,0)',opacity:0},{transform:'translate3d(0,0,0)',opacity:1}],{duration:motion.reveal,easing:motion.decelerate});}
}
