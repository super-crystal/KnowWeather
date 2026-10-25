"""Import verified release snapshots into a NEW local Git repository.

Does not move/delete working files or rewrite archives. Import dates are current,
not invented historical author dates. Early snapshots retain their actual DEX.
"""
from pathlib import Path
import argparse,datetime,hashlib,json,re,subprocess

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--archives',type=Path,required=True)
args=parser.parse_args();archives=args.archives.resolve()
if (root/'.git').exists():
 probe=subprocess.run(['git','-C',str(root),'show-ref'],capture_output=True)
 assert probe.returncode==1 and not probe.stdout,'Refusing to overwrite an existing Git history'
registry=json.loads((archives/'versions.json').read_text(encoding='utf-8'))
identity='Super_Crystal <83874713+super-crystal@users.noreply.github.com>'
stamp=f'{int(datetime.datetime.now(datetime.timezone.utc).timestamp())} +0000'
report=root/'output/git-migration';report.mkdir(parents=True,exist_ok=True)
snapshots=[]
def git(*cmd):return subprocess.run(['git','-C',str(root),*cmd],capture_output=True,check=True).stdout
def sha(data):return hashlib.sha256(data).hexdigest().upper()
def selected(project,complete):
 files={}
 for p in project.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(project);parts=rel.parts
  if any(x in {'.git','.signing','.build','output','__pycache__'} for x in parts):continue
  if p.suffix.lower() in {'.apk','.idsig','.p12','.jks','.keystore','.key','.pem','.log','.class','.pyc'}:continue
  if parts[0]=='native-compiled':
   if complete or rel.as_posix()!='native-compiled/classes.dex':continue
  if parts[0]=='research' and not (p.suffix in {'.py','.json'} or len(parts)>1 and parts[1]=='cloud-inputs'):continue
  if parts[0]=='historical-tools':continue
  if len(parts)==1 and p.name not in {'README.md','AGENTS.md','AndroidManifest.xml','.gitignore'} and p.suffix not in {'.mjs','.js','.ps1'}:continue
  data=p.read_bytes()
  assert not re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}',data),f'Potential secret in {rel}'
  files[rel.as_posix()]=data
 return files

for version in registry['android_versions']:
 v=version['version'];project=archives/v/'project'
 apk=archives/v/'release'/f'知天气-{v}.apk'
 assert sha(apk.read_bytes())==version['sha256'],f'Archive APK mismatch: {v}'
 files=selected(project,version['complete_native_source'])
 for prior in registry['android_versions'][:len(snapshots)+1]:
  pv=prior['version'];source=archives/pv/'版本变更.md'
  if source.exists():files[f'docs/releases/{pv}.md']=source.read_bytes()
 metadata={'version':v,'version_code':version['code'],'apk_sha256':version['sha256'],'apk_bytes':version['bytes'],'complete_native_source':version['complete_native_source'],'imported_on':'2026-10-25','history_note':'Imported verified archive snapshot; original commit history and author dates unavailable.','native_note':'Full Java source retained.' if version['complete_native_source'] else 'Original Java source unavailable. Exact archived DEX retained under native-compiled; not reconstructed from later source.'}
 files['docs/version-import.json']=(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
 snapshots.append((version,files))

git('init','-b','main')
git('config','user.name','Super_Crystal');git('config','user.email','83874713+super-crystal@users.noreply.github.com')
git('config','core.autocrlf','false');git('config','core.quotepath','false')
stream=report/'import.fast-import'
with stream.open('wb') as f:
 def write(s):f.write(s.encode('utf-8'))
 def data(b):write(f'data {len(b)}\n');f.write(b);write('\n')
 for mark,(version,files) in enumerate(snapshots,1):
  v=version['version'];write(f'commit refs/heads/main\nmark :{mark}\nauthor {identity} {stamp}\ncommitter {identity} {stamp}\n')
  data(f'Import verified archived release v{v}\n\nFull native source: {version["complete_native_source"]}.\nImported on 2026-10-25; not original historical commits.\n'.encode())
  if mark>1:write(f'from :{mark-1}\n')
  write('deleteall\n')
  for name,body in sorted(files.items()):
   quoted=json.dumps(name,ensure_ascii=False)
   write(f'M 100644 inline {quoted}\n');data(body)
  write('\n')
  write(f'tag v{v}\nfrom :{mark}\ntagger {identity} {stamp}\n')
  data(f'Verified archived release {v}\nAPK SHA256 {version["sha256"]}\nNative source complete: {version["complete_native_source"]}\nImported archive snapshot; original commit history unavailable.\n'.encode())
 write('done\n')
with stream.open('rb') as f:
 result=subprocess.run(['git','-C',str(root),'fast-import','--quiet'],stdin=f,capture_output=True)
 assert result.returncode==0,result.stderr.decode('utf-8','replace')
git('read-tree','HEAD')
# Materialize only new migration documentation, not the user's source files.
for name,body in snapshots[-1][1].items():
 if name.startswith('docs/releases/') or name=='docs/version-import.json':
  p=root/name;assert not p.exists(),f'Unexpected existing document: {p}'
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(body)
for version,files in snapshots:
 tag='v'+version['version']
 for name,body in files.items():assert git('show',tag+':'+name)==body,(tag,name)
summary={'imported_versions':[v['version'] for v,_ in snapshots],'commits':len(snapshots),'files_per_tag':{v['version']:len(files) for v,files in snapshots},'original_apks_verified':len(snapshots),'private_signing_material_imported':False,'remote_uploaded':False}
(report/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
