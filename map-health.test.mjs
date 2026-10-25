import test from 'node:test';
import assert from 'node:assert/strict';
import {TileHealth} from './web-src/map-health.mjs';
import {land,lakes,places} from './web-src/map-data.mjs';
function scenario(){let callback=null,cleared=false;const states=[];const health=new TileHealth(s=>states.push(s),{setTimer:f=>(callback=f,1),clearTimer:()=>cleared=true});health.start();return {health,states,timeout:()=>callback(),cleared:()=>cleared};}
test('hanging requests fall back even when no tileerror is dispatched',()=>{const s=scenario();s.timeout();assert.equal(s.states.at(-1),'fallback');});
test('removed online attempts cannot change an active local map',()=>{const s=scenario();s.health.dispose();s.health.tileLoaded();s.health.tileFailed();s.timeout();assert.deepEqual(s.states,['loading']);assert.ok(s.cleared());});
test('complete online loads cancel timeout; partial failures preserve local geography',()=>{const s=scenario();s.health.tileLoaded();s.health.settled();assert.equal(s.states.at(-1),'online');assert.ok(s.cleared());s.health.tileFailed();assert.equal(s.states.at(-1),'partial');});
test('bundled data has valid world geometry and real Chinese city coordinates',()=>{
 assert.equal(land.type,'FeatureCollection');assert.ok(land.features.length>1000);assert.ok(lakes.features.length>300);
 const hangzhou=places.find(p=>p.name==='杭州');assert.ok(hangzhou&&Math.abs(hangzhou.lat-30.25)<.1&&Math.abs(hangzhou.lon-120.17)<.1);
 const tokyo=places.find(p=>p.name==='东京');assert.ok(tokyo&&Math.abs(tokyo.lon-139.75)<.2);
 for(const d of [land,lakes]){const visit=c=>{if(typeof c[0]==='number'){assert.ok(Number.isFinite(c[0])&&Math.abs(c[0])<=180);assert.ok(Number.isFinite(c[1])&&Math.abs(c[1])<=90);}else c.forEach(visit);};d.features.forEach(f=>visit(f.geometry.coordinates));}
});
