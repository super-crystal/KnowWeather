import test from 'node:test';
import assert from 'node:assert/strict';
import {airRequest,normalizeAir,validAir,cachedAir,airLevel} from './web-src/air-quality.mjs';
const now=Date.parse('2026-10-28T12:00:00Z'),city={name:'杭州',latitude:30.25,longitude:120.16,country_code:'CN'};
test('provider requests require personal credentials, preserve coordinates and guard regional coverage',()=>{
 assert.throws(()=>airRequest(city,'waqi','demo'));
 assert.throws(()=>airRequest(city,'openweather',''));
 assert.throws(()=>airRequest(city,'hk'));
 assert.match(airRequest(city,'waqi','personal-test-token'),/geo:30.25;120.16/);
 assert.equal(new URL(airRequest(city,'openweather','personal-test-key')).searchParams.get('lat'),'30.25');
 assert.equal(new URL(airRequest(city)).searchParams.get('timezone'),'GMT');
});
test('CAMS null pollutants stay missing and fresh zero AQI remains valid',()=>{
 const d=normalizeAir({current:{time:'2026-10-28T12:00',us_aqi:0,pm2_5:null}},'cams',city,now);
 assert.equal(d.value,0);assert.equal(d.pollutants.pm2_5,null);assert.equal(d.unit,'μg/m³');
 assert.equal(validAir(d,now+21600000),false);assert.equal(validAir({...d,observedAt:'2026-10-28T14:00Z'},now),false);
});
test('OpenWeather keeps its independent 1–5 scale and rejects unknown levels',()=>{
 const raw={list:[{dt:now/1000,main:{aqi:4},components:{pm2_5:70,co:500}}]};
 const d=normalizeAir(raw,'openweather',city,now);assert.equal(d.value,4);assert.equal(airLevel(d.value,d.source),'差');assert.equal(d.pollutants.carbon_monoxide,500);
 raw.list[0].main.aqi=6;assert.throws(()=>normalizeAir(raw,'openweather',city,now));
});
test('WAQI retains originating agency, station distance and sub-index units, never persists cache',()=>{
 const d=normalizeAir({status:'ok',data:{aqi:83,time:{iso:'2026-10-28T20:00:00+08:00'},city:{name:'杭州站',geo:[30.25,120.16]},iaqi:{pm25:{v:83},co:{v:2}},attributions:[{name:'原始环保机构',url:'https://example.org/'}]}},'waqi',city,now);
 assert.equal(d.unit,'分指数');assert.equal(d.stationDistance,0);assert.equal(d.attributions[1].name,'原始环保机构');assert.equal(cachedAir(d,'waqi',now),null);
 assert.throws(()=>normalizeAir({status:'error',data:'Invalid key'},'waqi',city,now));
});
test('Hong Kong AQHI excludes stale stations and roadside readings from general maximum',()=>{
 const raw=[{station:'Central/Western',aqhi:4,publish_date:'2026-10-28T20:00:00'},{station:'Mong Kok',aqhi:'10+',publish_date:'2026-10-28T20:00:00'},{station:'Eastern',aqhi:9,publish_date:'2026-10-27T20:00:00'}];
 const d=normalizeAir(raw,'hk',city,now);assert.equal(d.value,4);assert.equal(d.stations.length,2);assert.equal(d.stations[1].value,11);assert.equal(airLevel(11,'hk'),'严重');
 assert.throws(()=>normalizeAir([{station:'Eastern',aqhi:'-',publish_date:'2026-10-28T20:00:00'}],'hk',city,now));
});
test('cache cannot cross providers or outlive observation/fetch freshness',()=>{
 const d=normalizeAir({current:{time:'2026-10-28T12:00',us_aqi:55}},'cams',city,now);
 assert.equal(cachedAir(d,'cams',now).cached,true);assert.equal(cachedAir(d,'openweather',now),null);assert.equal(cachedAir(d,'cams',now+21600000),null);assert.equal(cachedAir({...d,fetchedAt:'2026-10-28T13:00Z'},'cams',now),null);
});
