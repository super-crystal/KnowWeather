"""Render the user-provided APK's decoded cloud normals to lit RGBA sprites.

The four source normal maps are retained in research/cloud-inputs for provenance.
Only the rendered WebP sprites are included in the app, not the APK or COE code.
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
inputs=root/'research/cloud-inputs';output=root/'web-src/assets/weather';output.mkdir(parents=True,exist_ok=True)
rows=[]
for i,name in enumerate(['b_04_normal','b_09_normal','b_03_normal','c_05_normal'],1):
 source=inputs/(name+'.png');im=Image.open(source).convert('RGBA');a=np.asarray(im,dtype=np.float32)
 n=a[:,:,:3]/127.5-1;n/=np.maximum(np.linalg.norm(n,axis=2,keepdims=True),.001)
 direct=np.clip(n[:,:,0]*.35+n[:,:,1]*.5+n[:,:,2]*.79,0,1)
 direct=direct*direct*(3-2*direct)
 tone=np.clip(.44+direct*.56,0,1)
 rgb=np.array([112,142,180])+tone[:,:,None]*np.array([143,111,73])
 opacity=np.power(a[:,:,3]/255,.72)*255
 rgba=np.dstack((rgb,opacity)).clip(0,255).astype('uint8')
 rendered=Image.fromarray(rgba,'RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 rendered.thumbnail((800,488),Image.Resampling.LANCZOS)
 target=output/f'cloud-{i}.webp';rendered.save(target,format='WEBP',lossless=True,method=6)
 rows.append({'file':target.relative_to(root/'web-src').as_posix(),'width':rendered.width,'height':rendered.height,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest().upper(),'input':source.relative_to(root).as_posix(),'input_sha256':hashlib.sha256(source.read_bytes()).hexdigest().upper()})
(root/'research/cloud-assets.json').write_text(json.dumps({'generator':'research/shade-clouds.py','origin':'Decoded normal maps from user-provided com.coloros.weather2 16.41.2 APK','apk_sha256':'FBE3B5CE9353E6F1B1BC9BAE94414453D1254BA027826A059E0B0A8D5432FA6D','orientation':'vertical UV origin corrected','assets':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(rows,ensure_ascii=False,indent=2))
