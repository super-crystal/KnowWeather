const clean=value=>typeof value==='string'?value.trim().slice(0,120):'';
export function locatedCity(latitude,longitude,data,accuracy=null){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('无效定位坐标');
 const a=data?.address||{},code=clean(a.country_code).toUpperCase();
 const candidates=[a.city_district,a.district,a.county,a.borough,a.city,a.town,a.municipality,a.suburb].map(clean).filter(Boolean);
 // Chinese OSM records may tag a county-level district as `city`. Never show a street instead of its parent district.
 const levels=clean(data?.display_name).split(/[,，]/).map(clean);
 const prefectures=[a.municipality,a.county,a.region,...levels].map(clean).filter(n=>/(市|自治州|地区|盟)$/.test(n)&&n!==clean(a.city)&&n!==clean(a.state));
 const countyCity=/市$/.test(clean(a.city))&&prefectures.length?clean(a.city):'';
 const district=code==='CN'?candidates.find(n=>/(区|县|旗)$/.test(n)&&n!==a.state&&!/(街道|社区|小区|地区|开发区|工业区)$/.test(n))||[a.county,a.city_district,a.district,a.borough].map(clean).find(n=>/市$/.test(n)&&n!==a.state)||countyCity:clean(a.city_district||a.district||a.county||a.borough);
 const name=district||clean(a.city||a.town||a.municipality||a.county)||'当前位置';
 const parent=clean(a.municipality)!==name&&clean(a.municipality)||clean(a.city)!==name&&clean(a.city)||prefectures.find(n=>n!==name)||'';
 return {name,latitude,longitude,country:clean(a.country),country_code:code,admin1:clean(a.state),admin2:parent,admin3:district,located:true,locationAccuracy:accuracy,regionResolved:name!=='当前位置',districtResolved:!!district,locationSource:clean(data?.provider)||'OpenStreetMap / Nominatim'};
}
