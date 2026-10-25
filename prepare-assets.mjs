import {mkdir,readFile,copyFile,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const src=path.join(root,'web-src'),assets=path.join(root,'assets/web');
// The checked-in city catalog is the source of truth; no sibling website needed.
const catalog=await readFile(path.join(src,'cities.mjs'),'utf8');
if(!catalog.includes('export const cities'))throw new Error('The checked-in city catalog is invalid');
await mkdir(assets,{recursive:true});
await cp(src,assets,{recursive:true});
await copyFile(path.join(root,'native.js'),path.join(assets,'native.js'));
console.log('Bundled local weather interface and checked-in city catalog.');
