import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherScene,rainStrength,particleAt,skyRunning} from './web-src/sky-model.mjs';

test('rain keeps animating while scrolling; visibility and accessibility still control playback',()=>{
 assert.equal(skyRunning({scrolling:true}),true);
 for(const key of ['hidden','dialog','reduced'])assert.equal(skyRunning({scrolling:true,[key]:true}),false);
});
test('stronger precipitation produces longer, thicker, denser and faster rain',()=>{
 const profiles=[0,.2,2,12].map(precipitation=>weatherScene({scene:'rain',precipitation}));
 const seed={x:.5,y:.5,depth:.7,phase:0};
 for(let i=1;i<profiles.length;i++){
  const a=profiles[i-1],b=profiles[i];
  for(const key of ['particles','rainLength','rainWidth','rainSpeed'])assert(b[key]>a[key],key);
  assert(particleAt(seed,1,b,390,844).size>particleAt(seed,1,a,390,844).size);
 }
 assert(profiles.at(-1).particles<=110);
});
test('missing precipitation falls back to weather type; extreme or invalid amounts remain bounded',()=>{
 assert(rainStrength({weather_code:65})>rainStrength({weather_code:61}));
 assert(rainStrength({weather_code:99})>rainStrength({weather_code:51}));
 for(const precipitation of [null,undefined,NaN,Infinity,-1,1e9]){
  const p=weatherScene({scene:'storm',precipitation});
  assert(p.particles>0&&p.particles<=110);assert(Number.isFinite(p.rainLength));
 }
 assert.equal(rainStrength({precipitation:12}),rainStrength({precipitation:1000}));
});
