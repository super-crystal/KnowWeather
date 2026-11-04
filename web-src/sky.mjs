import {weatherScene,skySize,skyRunning,particleAt,randomSequence,cloudBand} from './sky-model.mjs';
let installed;
const tau=Math.PI*2,hex=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const mix=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';
function texture(width,height,paint){const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);return c;}
function halo(color){return texture(256,256,(c)=>{const g=c.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,color);g.addColorStop(.12,color);g.addColorStop(.42,color+'55');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,256,256);});}
function cloudTexture(night=false){return texture(640,260,(c,w,h)=>{
 const random=randomSequence(91);for(let i=0;i<27;i++){const group=Math.floor(i/9),x=100+group*210+(random()-.5)*170,y=145-random()*65,r=28+random()*49;
  const g=c.createRadialGradient(x-r*.15,y-r*.3,r*.1,x,y,r);g.addColorStop(0,night?'#8a9eb5a0':'#ffffffe0');g.addColorStop(.55,night?'#627c9690':'#e7f0ffd0');g.addColorStop(.82,night?'#546f8c45':'#c6d8ed70');g.addColorStop(1,night?'#546f8c00':'#b3cee600');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 }c.globalCompositeOperation='destination-in';const mask=c.createLinearGradient(0,0,w,0);mask.addColorStop(0,'transparent');mask.addColorStop(.13,'#fff');mask.addColorStop(.87,'#fff');mask.addColorStop(1,'transparent');c.fillStyle=mask;c.fillRect(0,0,w,h);
});}
export class WeatherSky{
 constructor(box){
  this.box=box;this.canvas=document.createElement('canvas');this.canvas.className='weather-canvas';this.canvas.setAttribute('aria-hidden','true');this.ctx=this.canvas.getContext('2d',{alpha:false});this.time=0;this.quality=1;this.fps=60;this.frames=0;this.totalCost=0;this.sampleCost=0;this.samples=0;this.active=false;this.last=0;this.raf=0;this.disposed=false;this.cloudTravel=0;this.drift=1.2;this.cloudSprites=null;
  if(!this.ctx)return;box.append(this.canvas);box.classList.add('sky-live');
  this.clouds=[cloudTexture(),cloudTexture(true)];this.sun=halo('#fff4c6');this.moonGlow=halo('#c8deff');
  const random=randomSequence();this.particles=Array.from({length:110},()=>({x:random(),y:random(),depth:random(),phase:random()*tau}));this.stars=Array.from({length:52},()=>({x:random(),y:random()*.57,size:.4+random()*.7,phase:random()*tau}));
  this.profile=weatherScene();this.colors=this.profile.palette.map(hex);this.fromColors=this.colors;this.changedAt=0;this.reduced=matchMedia('(prefers-reduced-motion:reduce)');
  this.tick=now=>{this.raf=0;if(!this.active||this.disposed)return;if(this.reduced.matches){this.state();return;}const elapsed=now-this.last;if(elapsed>=1000/this.fps-1){const start=performance.now();const dt=Math.min(.05,Math.max(0,elapsed/1000));this.time+=dt;this.drift+=(this.profile.drift-this.drift)*(1-Math.exp(-dt/3));this.cloudTravel+=dt*this.drift;this.last=now;this.draw();const cost=performance.now()-start;this.frames++;this.totalCost+=cost;this.sampleCost+=cost;if(++this.samples===120){if(this.sampleCost/this.samples>9&&this.quality===1){this.quality=.72;this.fps=30;this.resize();}this.samples=0;this.sampleCost=0;}}this.raf=requestAnimationFrame(this.tick);};
  this.resize=()=>{const next=skySize(innerWidth,innerHeight,devicePixelRatio,this.quality);this.canvas.width=next.width;this.canvas.height=next.height;this.width=innerWidth;this.height=innerHeight;this.scale=next.scale;this.draw();};
  this.state=()=>{if(this.disposed)return;clearTimeout(this.reducedTimer);const dialog=!!document.querySelector('dialog[open]');if(this.reduced.matches&&!document.hidden&&!dialog)this.reducedTimer=setTimeout(this.state,500);const run=skyRunning({hidden:document.hidden,dialog,reduced:this.reduced.matches});if(run===this.active)return;this.active=run;cancelAnimationFrame(this.raf);this.raf=0;if(run){this.last=performance.now();this.raf=requestAnimationFrame(this.tick);}else if(!document.hidden)this.draw();};
  this.observer=new MutationObserver(this.state);this.observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',this.state);this.reduced.addEventListener('change',this.state);window.addEventListener('resize',this.resize,{passive:true});
  this.resize();this.state();this.assetPromise=this.loadCloudSprites();
 }
 setWeather(input){
  if(!this.ctx||this.disposed)return;const next=weatherScene(input),changed=next.scene!==this.profile.scene||next.night!==this.profile.night||next.phase!==this.profile.phase;
  if(changed){this.previousProfile=this.profile;this.fromColors=this.currentColors||this.colors;this.colors=next.palette.map(hex);this.changedAt=this.time;}
  this.profile=next;this.draw();this.state();
 }
 draw(){
  if(!this.ctx||!this.width)return;const c=this.ctx,w=this.width,h=this.height,p=this.profile,t=this.time,progress=this.reduced?.matches?1:Math.min(1,(t-this.changedAt)/1.2);
  this.currentColors=this.colors.map((color,i)=>color.map((v,j)=>this.fromColors[i][j]+(v-this.fromColors[i][j])*progress));
  c.setTransform(this.scale,0,0,this.scale,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  const sky=c.createLinearGradient(0,0,w*.25,h);[0,.5,1].forEach((stop,i)=>sky.addColorStop(stop,mix(this.fromColors[i],this.colors[i],progress)));c.fillStyle=sky;c.fillRect(0,0,w,h);
  if(!p.night&&(p.scene==='sunny'||p.scene==='cloudy'))this.sunlight(c,w,h,t,p.scene==='cloudy'?.45:1);
  if(p.night)this.night(c,w,h,t);
  if(this.previousProfile&&progress<1)this.cloudField(c,w,h,t,this.previousProfile,1-progress);
  this.cloudField(c,w,h,t,p,progress);
  // Let the cloud banks dissolve above the content cards, as in the reference scenes.
  const base=this.currentColors,rgba=(color,a)=>'rgba('+color.map(Math.round).join(',')+','+a+')';
  const atmosphere=c.createLinearGradient(0,0,0,h);atmosphere.addColorStop(0,rgba(base[0],0));atmosphere.addColorStop(.36,rgba(base[1],0));atmosphere.addColorStop(.55,rgba(base[1],1));atmosphere.addColorStop(1,rgba(base[2],1));c.globalAlpha=1;c.fillStyle=atmosphere;c.fillRect(0,0,w,h);
  if(p.scene==='fog')this.fog(c,w,h,t);
  if(p.rain||p.snow)this.precipitation(c,w,h,t);
  if(p.scene==='storm'&&!this.reduced.matches){const pulse=t%19;if(pulse>9&&pulse<10.8){c.globalAlpha=Math.sin((pulse-9)/1.8*Math.PI)*.065;c.fillStyle='#e4efff';c.fillRect(0,0,w,h*.65);}}
  c.globalAlpha=1;const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#12294255');shade.addColorStop(.3,'#12294228');shade.addColorStop(1,'#16365830');c.fillStyle=shade;c.fillRect(0,0,w,h);
 }
 async loadCloudSprites(){
  try{
   const images=await Promise.all([1,2,3,4].map(i=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=new URL('./assets/weather/cloud-'+i+'.webp',import.meta.url).href;})));
   if(this.disposed)return;
   const tint=(im,color)=>texture(480,288,(c,w,h)=>{c.drawImage(im,0,0,w,h);if(color){c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,w,h);c.globalCompositeOperation='destination-in';c.drawImage(im,0,0,w,h);}});
   this.cloudSprites={day:images.map(im=>tint(im,null)),warm:images.map(im=>tint(im,'#ffced0')),night:images.map(im=>tint(im,'#687fa7')),rain:images.map(im=>tint(im,'#a3b5c9'))};
   this.spritesAt=this.time;this.draw();return true;
  }catch{this.spriteError=true;return false;}
 }
 cloudField(c,w,h,t,p,opacity){
  const style=p.night?'night':p.rain||p.scene==='overcast'?'rain':p.phase==='sunrise'||p.phase==='sunset'?'warm':'day';
  const ready=this.cloudSprites?(this.reduced.matches?1:Math.min(1,(t-this.spritesAt)/.8)):0;
  for(let i=0;i<p.clouds;i++){
   const b=cloudBand(i,t,p,w,h,this.cloudTravel);
   for(let tile=-1;tile<=2;tile++){
    const x=b.x+tile*b.period;if(x+b.width<0||x>w||b.y+b.height<0||b.y>h)continue;
    if(ready<1){c.globalAlpha=b.alpha*opacity*(1-ready)*.65;c.drawImage(this.clouds[p.night||p.rain?1:0],x,b.y,b.width,b.height);}
    if(ready>0){c.globalAlpha=b.alpha*opacity*ready;c.drawImage(this.cloudSprites[style][b.sprite],x,b.y,b.width,b.height);}
   }
  }c.globalAlpha=1;
 }
 sunlight(c,w,h,t,opacity){
  const warm=this.profile.phase==='sunrise'||this.profile.phase==='sunset',x=w*(this.profile.phase==='sunrise'?.22:.79),y=h*(warm?.28:.16),size=Math.min(w*.85,370),breath=.88+Math.sin(t*.22)*.06;c.globalAlpha=opacity*breath*.7;c.drawImage(this.sun,x-size/2,y-size/2,size,size);
  c.save();c.translate(x,y);c.rotate(-.4+Math.sin(t*.04)*.08);const glow=c.createLinearGradient(0,0,0,h*.65);glow.addColorStop(0,'#fff6ce14');glow.addColorStop(1,'#fff6ce00');c.fillStyle=glow;c.globalAlpha=opacity;
  for(let i=0;i<4;i++){c.rotate(.13);c.beginPath();c.moveTo(-7,0);c.lineTo(-65,h*.7);c.lineTo(52,h*.7);c.lineTo(7,0);c.fill();}c.restore();
  c.globalAlpha=opacity*.82;c.fillStyle='#fff5d7';c.beginPath();c.arc(x,y,Math.min(17,w*.043),0,tau);c.fill();c.globalAlpha=1;
 }
 night(c,w,h,t){
  const count=this.profile.scene==='night'?52:this.profile.scene==='nightcloud'?18:4;c.fillStyle='#e6f1ff';
  for(const s of this.stars.slice(0,count)){c.globalAlpha=.12+(.5+Math.sin(t*.55+s.phase)*.5)*.48;c.beginPath();c.arc(s.x*w,s.y*h,s.size,0,tau);c.fill();}
  if(!['night','nightcloud','sunny','cloudy'].includes(this.profile.scene))return;
  const x=w*.8,y=h*.14,size=Math.min(w*.52,210);c.globalAlpha=.23;c.drawImage(this.moonGlow,x-size/2,y-size/2,size,size);c.globalAlpha=.92;
  c.fillStyle='#e8edf0';c.beginPath();c.arc(x,y,15,0,tau);c.fill();c.fillStyle='#c3d0d7';c.globalAlpha=.26;for(const [dx,dy,r] of [[-5,-3,4],[5,5,3],[-3,8,2]]){c.beginPath();c.arc(x+dx,y+dy,r,0,tau);c.fill();}c.globalAlpha=1;
 }
 fog(c,w,h,t){
  const sprite=this.clouds[0];for(let i=0;i<4;i++){c.globalAlpha=.16+i*.025;const x=Math.sin(t*.035+i)*w*.4-w*.8,y=h*(.22+i*.19);c.drawImage(sprite,x,y,w*2.3,h*.38);}c.globalAlpha=1;
 }
 precipitation(c,w,h,t){
  const p=this.profile,amount=Math.round(p.particles*(this.quality<1?.65:1));
  if(p.snow){c.fillStyle='#f6fcff';for(const a of this.particles.slice(0,amount)){const point=particleAt(a,t,p,w,h);c.globalAlpha=.22+a.depth*.5;c.beginPath();c.arc(point.x,point.y,point.size,0,tau);c.fill();}}
  else for(let depth=0;depth<3;depth++){c.beginPath();c.lineWidth=(.5+depth*.4)*p.rainWidth;c.strokeStyle=p.night?'#d3e7f7':'#e1f2fc';c.globalAlpha=(.1+depth*.065)*(.8+p.rainWidth*.2);for(const a of this.particles.slice(0,amount)){if(Math.floor(a.depth*3)!==depth)continue;const point=particleAt(a,t,p,w,h),slant=(.1+p.wind*.003)*point.size;c.moveTo(point.x,point.y);c.lineTo(point.x+slant,point.y+point.size);}c.stroke();}c.globalAlpha=1;
 }
 status(){return {scene:this.profile.scene,phase:this.profile.phase,cloudSprites:this.cloudSprites?4:0,spriteError:!!this.spriteError,cloudLayers:this.profile.clouds,active:this.active,frames:this.frames,fps:this.fps,quality:this.quality,pixels:this.canvas.width*this.canvas.height,averageDrawMs:this.frames?this.totalCost/this.frames:0};}
 dispose(){if(this.disposed)return;this.disposed=true;this.active=false;cancelAnimationFrame(this.raf);clearTimeout(this.reducedTimer);this.observer?.disconnect();document.removeEventListener('visibilitychange',this.state);this.reduced?.removeEventListener('change',this.state);window.removeEventListener('resize',this.resize);this.canvas.remove();this.box.classList.remove('sky-live');}
}
export function installSky(){if(!installed||installed.disposed)installed=new WeatherSky(document.querySelector('.sky'));return installed;}
