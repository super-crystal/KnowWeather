const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const scenes=['sunny','cloudy','overcast','fog','rain','snow','storm','night','nightcloud','unknown'];
export function weatherScene(input={}){
 const scene=scenes.includes(input.scene)?input.scene:'unknown',night=input.is_day===0||scene==='night'||scene==='nightcloud';
 const wind=clamp(input.wind_speed_10m,0,70),wet=clamp(input.precipitation,0,12);
 const cloudCounts={sunny:3,cloudy:12,overcast:14,fog:10,rain:11,snow:11,storm:14,night:2,nightcloud:12,unknown:4};
 return {scene,night,wind,rain:scene==='rain'||scene==='storm',snow:scene==='snow',clouds:cloudCounts[scene],
  particles:scene==='snow'?60:scene==='storm'?108:scene==='rain'?Math.round(52+wet*4):0,drift:3+wind*.16,
  palette:night?['#07182e','#223b60','#557897']:scene==='sunny'?['#2365ad','#579dde','#a4d5ec']:scene==='cloudy'?['#466cac','#799aca','#c4cbd9']:scene==='overcast'?['#506780','#869aaf','#b6c6d1']:scene==='fog'?['#7d96aa','#a2b5bf','#c2d0d4']:scene==='rain'?['#29465f','#5c7e98','#9db5c4']:scene==='storm'?['#1b2d49','#485b78','#8190a4']:scene==='snow'?['#688ea8','#9cb9cb','#cedfe7']:['#526f8c','#819eb5','#b1c8d4']};
}
export function cloudBand(index,time,profile,width,height){
 const dense=profile.clouds>=10,span=width*(1.45+(index%4)*.19),period=span*.7;
 const speed=profile.drift*(.28+(index%4)*.15),offset=((time*speed+index*width*.37)%period+period)%period;
 return {x:-period+offset,y:height*(dense?-.19+index*1.12/(profile.clouds-1):.12+index*.25)+Math.sin(time*.08+index)*7,
  width:span,height:Math.max(span*.43,height*(dense?.27:.18)),period,
  alpha:profile.scene==='sunny'?.2:profile.scene==='night'?.13:profile.scene==='fog'?.32:(profile.night?.34:.38)+(index%3)*.06};
}
export function skySize(width,height,dpr=1,quality=1){
 width=clamp(width,1,5000);height=clamp(height,1,5000);const scale=Math.min(clamp(dpr,.5,1.35),Math.sqrt(600000/(width*height)))*clamp(quality,.55,1);
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale)),scale};
}
export function skyRunning({hidden=false,dialog=false,reduced=false,scrolling=false,enabled=true}={}){return enabled&&!hidden&&!dialog&&!reduced&&!scrolling;}
export function particleAt(p,time,profile,width,height){
 const snow=profile.snow,speed=(snow?22:270)+p.depth*(snow?28:370),span=height+80;
 const y=((p.y*span+time*speed)%span+span)%span-40;
 const dx=time*(profile.wind*(snow?.5:1.1)+12),sway=snow?Math.sin(time*.7+p.phase)*20:0;
 return {x:((p.x*(width+120)+dx+sway)%(width+120)+width+120)%(width+120)-60,y,size:snow?.7+p.depth*2.4:7+p.depth*20};
}
export function randomSequence(seed=719){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
