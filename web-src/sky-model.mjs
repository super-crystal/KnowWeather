const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const scenes=['sunny','cloudy','overcast','fog','rain','snow','storm','night','nightcloud','unknown'];
// Visual strength uses available precipitation, with weather-code fallback only when missing.
export function rainStrength(input={}){
 if(Number.isFinite(input.precipitation)&&input.precipitation>=0)return .08+.92*Math.log1p(clamp(input.precipitation,0,12))/Math.log(13);
 const code=input.weather_code;
 return [55,65,82,99].includes(code)?.9:[53,63,81,95,96].includes(code)?.5:.15;
}
export function snowStrength(input={}){
 if(Number.isFinite(input.snowfall)&&input.snowfall>=0)return .08+.92*Math.log1p(clamp(input.snowfall,0,5))/Math.log(6);
 if(Number.isFinite(input.precipitation)&&input.precipitation>=0)return .08+.92*Math.log1p(clamp(input.precipitation,0,12))/Math.log(13);
 return [75,86].includes(input.weather_code)?.9:input.weather_code===73?.5:.15;
}
export function weatherScene(input={}){
 const scene=scenes.includes(input.scene)?input.scene:'unknown',night=input.is_day===0||scene==='night'||scene==='nightcloud';
 const wind=clamp(input.wind_speed_10m,0,70),strength=rainStrength(input),snowIntensity=snowStrength(input);
 const cloudCounts={sunny:2,cloudy:6,overcast:8,fog:6,rain:8,snow:8,storm:8,night:2,nightcloud:6,unknown:4};
 const hour=typeof input.time==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(input.time)?Number(input.time.slice(11,13))+Number(input.time.slice(14,16))/60:12;
 const phase=night?'night':hour>=16.5&&hour<20?'sunset':hour>=5&&hour<8?'sunrise':'day';
 const warm=(phase==='sunset'||phase==='sunrise')&&['sunny','cloudy'].includes(scene);
 return {scene,night,phase,wind,rain:scene==='rain'||scene==='storm',snow:scene==='snow',clouds:cloudCounts[scene],
  snowSize:.55+snowIntensity*1.3,
  rainLength:.55+strength*1.15,rainWidth:.6+strength*.8,rainSpeed:.8+strength*.45,
  particles:scene==='snow'?Math.round(20+snowIntensity*90):scene==='storm'||scene==='rain'?Math.round(26+strength*84):0,drift:1.8+wind*.10,
  palette:night?['#07182e','#1a3154','#425e83']:warm?['#4c65a2','#a08cbd','#dfb1a5']:scene==='sunny'?['#2365ad','#579dde','#a4d5ec']:scene==='cloudy'?['#2556ad','#63a3e6','#a0d2ef']:scene==='overcast'?['#506780','#869aaf','#b6c6d1']:scene==='fog'?['#7d96aa','#a2b5bf','#c2d0d4']:scene==='rain'?['#29465f','#5c7e98','#9db5c4']:scene==='storm'?['#1b2d49','#485b78','#8190a4']:scene==='snow'?['#688ea8','#9cb9cb','#cedfe7']:['#526f8c','#819eb5','#b1c8d4']};
}
export function cloudBand(index,time,profile,width,height,travel=time*profile.drift){
 const dense=profile.clouds>=6,depth=index%3,span=Math.min(width*(1.35+depth*.28),height*1.15),period=span+width*1.15;
 const base=[-.55,.48,-.64,.37,-.5,.44,-.4,.28][index%8]*width;
 const offset=((travel*(.4+depth*.36)+base+span)%period+period)%period;
 return {x:-span+offset,y:height*(dense?-.18+index*.061:.02+index*.11)+Math.sin(time*.055+index)*2,
  width:span,height:span*.6,period,depth,sprite:(index*7+Math.floor(index/3))%4,
  alpha:profile.scene==='sunny'?.22:profile.scene==='night'?.14:profile.scene==='fog'?.36:(profile.night?.65:.90)+depth*.04};
}
export function skySize(width,height,dpr=1,quality=1){
 width=clamp(width,1,5000);height=clamp(height,1,5000);const scale=Math.min(clamp(dpr,.5,1.35),Math.sqrt(600000/(width*height)))*clamp(quality,.55,1);
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale)),scale};
}
export function skyRunning({hidden=false,dialog=false,reduced=false,enabled=true}={}){return enabled&&!hidden&&!dialog&&!reduced;}
export function particleAt(p,time,profile,width,height){
 const snow=profile.snow,speed=((snow?22:270)+p.depth*(snow?28:370))*(snow?1:profile.rainSpeed??1),padding=snow?40:80,span=height+padding*2;
 const y=((p.y*span+time*speed)%span+span)%span-padding;
 const dx=time*(profile.wind*(snow?.5:1.1)+12),sway=snow?Math.sin(time*.7+p.phase)*20:0;
 return {x:((p.x*(width+120)+dx+sway)%(width+120)+width+120)%(width+120)-60,y,size:snow?(.7+p.depth*2.4)*(profile.snowSize??1):(7+p.depth*20)*(profile.rainLength??1)};
}
export function randomSequence(seed=719){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
