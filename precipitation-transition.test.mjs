import test from 'node:test';
import assert from 'node:assert/strict';
import {PrecipitationTransition} from './web-src/precipitation-transition.mjs';
import {weatherScene,particleAt} from './web-src/sky-model.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const scene of ['rain','snow']){
 const light=weatherScene({scene,precipitation:.1,snowfall:.1}),heavy=weatherScene({scene,precipitation:12,snowfall:5}),size=scene==='rain'?'rainLength':'snowSize';
 test(`${scene}: size and per-particle density fade to the exact target in 1.6s`,()=>{
  const t=new PrecipitationTransition(light),before=t.sample(20);t.setTarget(heavy,20);
  assert.deepEqual(t.sample(20),before);
  const mid=t.sample(20.8),end=t.sample(21.6);
  assert(mid[size]>light[size]&&mid[size]<heavy[size]);
  assert(mid.opacity.some(v=>v>0&&v<1));near(end[size],heavy[size]);
  assert.equal(end.opacity.reduce((a,b)=>a+b,0),heavy.particles);
  t.setTarget(light,22);assert(t.sample(22.8).opacity.some(v=>v>0&&v<1));near(t.sample(23.6)[size],light[size]);
 });
 test(`${scene}: rapid updates start from the visible state; identical updates do not restart`,()=>{
  const t=new PrecipitationTransition(light);t.setTarget(heavy,5);const mid=t.sample(5.6);
  t.setTarget(light,5.6);assert.deepEqual(t.sample(5.6),mid);
  t.setTarget(light,6);near(t.sample(7.2)[size],light[size]);
 });
 test(`${scene}: reduced motion snaps once and resume retains the settled values`,()=>{
  const t=new PrecipitationTransition(light);t.setTarget(heavy,1,true);near(t.sample(1)[size],heavy[size]);near(t.sample(10)[size],heavy[size]);
 });
}
test('rain position depends on accumulated travel, not elapsed time times the latest speed',()=>{
 const a={...weatherScene({scene:'rain',precipitation:.1}),rainTravel:50},b={...a,rainSpeed:2},seed={x:.4,y:.5,depth:.8,phase:0};
 near(particleAt(seed,1000,a,390,844).y,particleAt(seed,1000,b,390,844).y);
});
