// Publish a built release using the existing Git Credential Manager authorization.
// Credentials stay in memory and must never be printed or written to disk.
import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const version=process.argv[2];assert.match(version||'',/^\d+\.\d+\.\d+$/);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
assert.equal(git('remote','get-url','origin'),'https://github.com/super-crystal/KnowWeather.git');
assert.equal(git('status','--porcelain'),'','Commit all changes before publishing');
const head=git('rev-parse','HEAD'),tag='v'+version;
assert.equal(git('rev-parse',tag+'^{}'),head);
assert.equal(git('ls-remote','origin','refs/heads/main').split(/\s/)[0],head);
assert.equal(git('ls-remote','origin','refs/tags/'+tag+'^{}').split(/\s/)[0],head);
const metadata=JSON.parse(await readFile('docs/releases/manifest.json','utf8')).versions.find(v=>v.version===version);
const apk=await readFile('output/builds/知天气-'+version+'.apk'),digest=createHash('sha256').update(apk).digest('hex');
assert.equal(apk.length,metadata.bytes);assert.equal(digest.toUpperCase(),metadata.sha256);
const credential=execFileSync('git',['-c','credential.interactive=never','credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'},stdio:['pipe','pipe','pipe']});
const token=credential.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);assert(token,'Git credential unavailable');
const base='https://api.github.com/repos/super-crystal/KnowWeather';
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
async function api(path,options={}){const r=await fetch(path.startsWith('https:')?path:base+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error('GitHub HTTP '+r.status);return r.status===204?null:r.json();}
const repo=await api('');assert.equal(repo.private,false);assert.equal(repo.permissions.push,true);
let release;const existing=await fetch(base+'/releases/tags/'+tag,{headers,signal:AbortSignal.timeout(30000)});
if(existing.status===404)release=await api('/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:head,name:'知天气 '+version,body:await readFile('docs/releases/'+version+'.md','utf8'),draft:false,prerelease:false})});
else{assert.equal(existing.status,200);release=await existing.json();}
const files=[{name:'KnowWeather-'+version+'.apk',data:apk,type:'application/vnd.android.package-archive'},{name:'SHA256SUMS.txt',data:Buffer.from(digest+'  KnowWeather-'+version+'.apk\n'),type:'text/plain'}];
for(const f of files){const expected=createHash('sha256').update(f.data).digest('hex');let asset=release.assets?.find(a=>a.name===f.name);if(!asset)asset=await api(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':f.type},body:f.data});assert.equal(asset.size,f.data.length);assert.equal(asset.digest,'sha256:'+expected);}
const verified=await api('/releases/'+release.id);const assets=verified.assets.map(a=>({name:a.name,size:a.size,digest:a.digest,state:a.state}));
for(const f of files){const a=assets.find(a=>a.name===f.name);assert(a);assert.equal(a.state,'uploaded');assert.equal(a.size,f.data.length);assert.equal(a.digest,'sha256:'+createHash('sha256').update(f.data).digest('hex'));}
const receipt={version,head,tag,url:verified.html_url,assets,verifiedAt:new Date().toISOString()};
await writeFile('output/builds/github-release-'+version+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
