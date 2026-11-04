import test from 'node:test';
import assert from 'node:assert/strict';
import {snowStrength,weatherScene,particleAt,skyRunning} from './web-src/sky-model.mjs';
import {weatherURL,sources} from './web-src/weather-data.mjs';
test('snowfall is requested and increasing snowfall makes flakes larger and denser',()=>{
 assert(new URL(weatherURL({latitude:45,longitude:126},sources.ecmwf)).searchParams.get('current').split(',').includes('snowfall'));
 const seed={x:.5,y:.5,depth:.7,phase:0},profiles=[0,.1,1,5].map(snowfall=>weatherScene({scene:'snow',snowfall}));
 for(let i=1;i<profiles.length;i++){assert(profiles[i].particles>profiles[i-1].particles);assert(particleAt(seed,1,profiles[i],390,844).size>particleAt(seed,1,profiles[i-1],390,844).size);}
 assert(profiles.at(-1).particles<=110);
});
test('snow amount takes priority; missing/invalid snow uses precipitation then weather code',()=>{
 assert.equal(snowStrength({snowfall:0,precipitation:12}),snowStrength({snowfall:0}));
 assert(snowStrength({precipitation:8})>snowStrength({precipitation:.1}));
 assert(snowStrength({weather_code:75})>snowStrength({weather_code:71}));
 for(const snowfall of [NaN,Infinity,-1,null,undefined,1e9]){const p=weatherScene({scene:'snow',snowfall});assert(p.particles>0&&p.particles<=110);assert(Number.isFinite(p.snowSize));}
 assert.equal(snowStrength({snowfall:5}),snowStrength({snowfall:1e9}));
});
test('snow animation remains active during scrolling',()=>{assert.equal(skyRunning({scrolling:true}),true);});
