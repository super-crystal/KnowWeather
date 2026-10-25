"""Publish verified historical APKs to the user-selected private GitHub repo.

Uses the already-authorized system Git Credential Manager in memory. Never logs
or writes tokens. Reuses matching assets and refuses to overwrite different ones.
No signing material is read: only version metadata and release/*.apk are used.
"""
from pathlib import Path
import argparse,hashlib,json,os,re,subprocess,urllib.error,urllib.parse,urllib.request

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--archives',type=Path,required=True)
parser.add_argument('--repo',required=True)
parser.add_argument('--apply',action='store_true')
args=parser.parse_args()
assert re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',args.repo)
origin=subprocess.run(['git','-C',str(root),'remote','get-url','origin'],capture_output=True,check=True).stdout.decode().strip()
assert origin.rstrip('/').removesuffix('.git').lower()==('https://github.com/'+args.repo).lower(),'Repository must match origin'
versions=json.loads((args.archives/'versions.json').read_text(encoding='utf-8'))['android_versions']
for item in versions:
 path=args.archives/item['version']/'release'/f"知天气-{item['version']}.apk"
 assert path.stat().st_size==item['bytes'] and hashlib.sha256(path.read_bytes()).hexdigest().upper()==item['sha256']
if not args.apply:
 print(f"Dry run: {len(versions)} verified APKs ready for private {args.repo}")
 raise SystemExit(0)

credential=subprocess.run(['git','-c','credential.interactive=never','credential','fill'],input=b'protocol=https\nhost=github.com\n\n',capture_output=True,check=True,env={**os.environ,'GIT_TERMINAL_PROMPT':'0','GCM_INTERACTIVE':'Never'})
fields=dict(line.split('=',1) for line in credential.stdout.decode().splitlines() if '=' in line)
token=fields.get('password');assert token,'GitHub credential unavailable'
api='https://api.github.com/repos/'+args.repo
def request(url,method='GET',payload=None,mime='application/json',missing_ok=False):
 parsed=urllib.parse.urlparse(url)
 assert parsed.scheme=='https' and parsed.hostname in {'api.github.com','uploads.github.com'}
 assert parsed.path.startswith('/repos/'+args.repo+'/') or parsed.path=='/repos/'+args.repo
 body=None if payload is None else json.dumps(payload,ensure_ascii=False).encode('utf-8') if isinstance(payload,dict) else payload
 req=urllib.request.Request(url,data=body,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'KnowWeather-version-migration','Content-Type':mime,'X-GitHub-Api-Version':'2022-11-28'})
 try:
  with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
 except urllib.error.HTTPError as exc:
  if missing_ok and exc.code==404:return None
  raise RuntimeError(f'GitHub HTTP {exc.code} for {method} {parsed.path}') from None

repo=request(api);assert repo['private'] and repo.get('permissions',{}).get('push'),'Private repo with push permission required'
report=root/'output/git-migration';report.mkdir(parents=True,exist_ok=True)
receipt={'repository':args.repo,'private':True,'date':'2026-10-25','releases':[],'complete':False}
def save():(report/'github-releases.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def upload(release,name,body,mime,assets):
 digest='sha256:'+hashlib.sha256(body).hexdigest()
 existing=next((x for x in assets if x['name']==name),None)
 if existing:
  assert existing['size']==len(body) and existing.get('digest')==digest,'Existing release asset differs; refusing replacement'
  return existing
 url=release['upload_url'].split('{',1)[0]+'?'+urllib.parse.urlencode({'name':name})
 asset=request(url,'POST',body,mime)
 verified=request(api+'/releases/assets/'+str(asset['id']))
 assert verified['state']=='uploaded' and verified['size']==len(body)
 assert verified.get('digest')==digest,'Remote asset SHA256 digest mismatch or absent'
 return verified

for index,item in enumerate(versions):
 version=item['version'];tag='v'+version
 release=request(api+'/releases/tags/'+urllib.parse.quote(tag,safe=''),missing_ok=True)
 if release is None:
  notes=f"历史发布版本迁移，原安装包未重新构建。\n\n- 版本代码：{item['code']}\n- 目标API：{item['sdk']}\n- 原生源码：{'完整Java源码' if item['complete_native_source'] else '原Java源码缺失，标签保留真实DEX，不冒充完整源码'}\n- APK大小：{item['bytes']} 字节\n- SHA256：`{item['sha256']}`\n\n[版本变更说明](https://github.com/{args.repo}/blob/{tag}/docs/releases/{version}.md)\n"
  release=request(api+'/releases','POST',{'tag_name':tag,'name':f"知天气 {version} · {item['title']}",'body':notes,'draft':False,'prerelease':False,'make_latest':'true' if index==len(versions)-1 else 'false'})
 assets=request(release['assets_url'])
 data=(args.archives/version/'release'/f'知天气-{version}.apk').read_bytes()
 name=f'KnowWeather-{version}.apk'
 apk=upload(release,name,data,'application/vnd.android.package-archive',assets)
 checksum=(item['sha256']+'  '+name+'\n').encode('utf-8')
 sums=upload(release,'SHA256SUMS.txt',checksum,'text/plain; charset=utf-8',assets)
 receipt['releases'].append({'version':version,'tag':tag,'id':release['id'],'url':release['html_url'],'apk_id':apk['id'],'apk_url':apk['browser_download_url'],'bytes':apk['size'],'digest':apk['digest'],'checksum_asset_id':sums['id']})
 save();print(f"Verified {tag}: original APK bytes and remote SHA256 match",flush=True)
assert len(receipt['releases'])==len(versions)
receipt['complete']=True;save();print('Completed all private releases; no signing keys uploaded.',flush=True)
