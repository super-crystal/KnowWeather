import {readFile,writeFile} from 'node:fs/promises';
const base=new URL('../../tools/android-build/',import.meta.url);
const repo=await readFile(new URL('repository.xml',base),'utf8');
const sys=await(await fetch('https://dl.google.com/android/repository/sys-img/android/sys-img2-3.xml')).text();
await writeFile(new URL('system-images.xml',base),sys);
for(const [xml,name] of [[repo,'emulator'],[sys,'system-images;android-36;default;x86_64']]){
  const part=xml.match(new RegExp('<remotePackage[^>]*path="'+name+'"[^>]*>([\\s\\S]*?)</remotePackage>'))?.[1];
  const archives=[...(part||'').matchAll(/<archive>([\s\S]*?)<\/archive>/g)].map(x=>x[1]);
  console.log(name,part?.match(/<uses-license[^>]+>/)?.[0],archives.find(x=>x.includes('<host-os>windows</host-os>'))||archives[0]);
}
