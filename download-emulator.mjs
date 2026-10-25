import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const base=new URL('../../tools/android-build/',import.meta.url);
const repo=await readFile(new URL('repository.xml',base),'utf8'),sys=await readFile(new URL('system-images.xml',base),'utf8');
for(const [xml,name,prefix] of [[repo,'emulator','https://dl.google.com/android/repository/'],[sys,'system-images;android-36;default;x86_64','https://dl.google.com/android/repository/sys-img/android/']]){
  const packages=[...xml.matchAll(new RegExp('<remotePackage[^>]*path="'+name+'"[^>]*>([\\s\\S]*?)</remotePackage>','g'))].map(x=>x[1]);
  const part=packages.find(x=>x.includes('<channelRef ref="channel-0"'))||packages[0];
  if(!part?.includes('<uses-license ref="android-sdk-license"'))throw new Error('Additional unaccepted SDK license: '+name);
  const archives=[...part.matchAll(/<archive>([\s\S]*?)<\/archive>/g)].map(x=>x[1]);
  const archive=archives.find(x=>x.includes('<host-os>windows</host-os>'))||archives.find(x=>!x.includes('<host-os>'));
  const zip=archive?.match(/<url>([^<]+)<\/url>/)?.[1],sha1=archive?.match(/<checksum[^>]*>([^<]+)<\/checksum>/)?.[1];
  if(!zip||!sha1)throw new Error('Official package metadata missing');
  const r=await fetch(prefix+zip,{signal:AbortSignal.timeout(600000)});if(!r.ok)throw new Error('Download '+r.status);
  console.log('Downloading:',name,zip);
  const hash=createHash('sha1');let bytes=0,nextReport=100000000;
  const stream=Readable.fromWeb(r.body);stream.on('data',b=>{hash.update(b);bytes+=b.length;if(bytes>=nextReport){console.log(name,Math.round(bytes/1000000)+' MB');nextReport+=100000000;}});
  await pipeline(stream,createWriteStream(fileURLToPath(new URL(zip,base))));
  if(hash.digest('hex')!==sha1)throw new Error('Checksum mismatch');console.log('Verified:',zip,bytes);
}
