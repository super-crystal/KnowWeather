import {mkdir,writeFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../tools/android-build');
await mkdir(root,{recursive:true});
const response=await fetch('https://dl.google.com/android/repository/repository2-3.xml');
if(!response.ok)throw new Error('Cannot fetch official Android repository');
const xml=await response.text();
const packages=['build-tools;35.0.0','platforms;android-35'];
const records=[];
for(const name of packages) {
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const fragment=xml.match(new RegExp('<remotePackage[^>]*path="'+escaped+'"[^>]*>([\\s\\S]*?)</remotePackage>'))?.[1];
  if(!fragment)throw new Error('Package unavailable: '+name);
  const archives=[...fragment.matchAll(/<archive>([\s\S]*?)<\/archive>/g)].map(m=>m[1]);
  const archive=archives.find(a=>a.includes('<host-os>windows</host-os>'))||archives.find(a=>!a.includes('<host-os>'));
  if(!archive)throw new Error('Windows archive unavailable: '+name);
  const url=archive.match(/<url>([^<]+)<\/url>/)?.[1];
  const checksum=archive.match(/<checksum[^>]*>([^<]+)<\/checksum>/)?.[1];
  const size=archive.match(/<size>([^<]+)<\/size>/)?.[1];
  const licenseId=fragment.match(/<uses-license ref="([^"]+)"/)?.[1];
  records.push({name,url:'https://dl.google.com/android/repository/'+url,checksum,size:Number(size),licenseId,file:path.join(root,path.basename(url))});
}
await writeFile(path.join(root,'packages.json'),JSON.stringify(records,null,2));
console.log(JSON.stringify(records,null,2));
if(process.argv.includes('--metadata-only'))process.exit(0);
if(!process.argv.includes('--license-accepted'))throw new Error('Explicit user acceptance of the Android SDK license is required before downloading and using these tools.');
for(const record of records) {
  console.log('Downloading official SDK package: '+record.name);
  const res=await fetch(record.url,{signal:AbortSignal.timeout(180000)});
  if(!res.ok)throw new Error('Download failed: HTTP '+res.status);
  const hash=createHash('sha1');let received=0;
  const stream=Readable.fromWeb(res.body);
  stream.on('data',chunk=>{hash.update(chunk);received+=chunk.length;});
  await pipeline(stream,createWriteStream(record.file));
  if(hash.digest('hex')!==record.checksum)throw new Error('Official package checksum does not match: '+record.name);
  console.log('Verified '+record.name+': '+received+' bytes');
}
console.log('SDK archives downloaded and verified.');
