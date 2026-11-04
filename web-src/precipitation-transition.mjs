const keys=['rainLength','rainWidth','rainSpeed','snowSize','particles'];
const limit=(v,min,max)=>Math.max(min,Math.min(max,v));
function values(profile){return Object.fromEntries(keys.map(k=>[k,Number.isFinite(profile[k])?profile[k]:k==='particles'?0:1]));}
const weights=count=>Array.from({length:110},(_,i)=>i<limit(Math.round(count),0,110)?1:0);
export class PrecipitationTransition{
 constructor(profile,duration=1.6){this.duration=duration;this.target=values(profile);this.from={...this.target,opacity:weights(this.target.particles)};this.toOpacity=this.from.opacity;this.started=-duration;}
 sample(time,instant=false){
  const progress=instant?1:limit((time-this.started)/this.duration,0,1),ease=progress*progress*(3-2*progress),out={};
  for(const k of keys)out[k]=this.from[k]+(this.target[k]-this.from[k])*ease;
  out.opacity=this.toOpacity.map((v,i)=>this.from.opacity[i]+(v-this.from.opacity[i])*ease);
  if(instant){this.from=out;this.started=time-this.duration;}
  return out;
 }
 setTarget(profile,time,instant=false){
  const next=values(profile);
  if(keys.every(k=>next[k]===this.target[k]))return;
  this.from=this.sample(time);this.target=next;this.toOpacity=weights(next.particles);this.started=time;
  if(instant)this.sample(time,true);
 }
}
