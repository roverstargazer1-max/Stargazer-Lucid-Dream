from PIL import Image
import numpy as np
import json
from pathlib import Path
root=Path('assets/检索页/v3')
ref=Image.open('assets/检索页/检索页v3.png').crop((259,104,2176,1388)).convert('RGB')
base=Image.open(root/'base-v3.png').convert('RGB')
rects={'star-chart':(598,16,966,129),'frame':(166,110,1360,250),'filters':(107,240,490,337),'arrow':(1360,14,1415,62),'index':(1583,46,1758,99),'name':(1428,185,1502,206),'id':(1859,169,1889,206),'close':(1858,11,1898,50)}
report=[]
for name,rect in rects.items():
 target=np.array(ref.crop(rect),dtype=float)
 bg=np.array(base.crop(rect),dtype=float)
 alpha=np.array(Image.open(Path('.scratch/starry-search/evidence/v3-20261012/native-alpha')/(name+'-v3.png')).convert('RGBA').getchannel('A'),dtype=float)/255
 delta=target-bg
 support=alpha>0
 # Extract the original composed pixels through the native Photoshop alpha.
 # Parent adjustment and blend layers must be resolved against the original blue ground.
 required=np.max(np.where(delta>=0,delta/np.maximum(255-bg,1),-delta/np.maximum(bg,1)),axis=2)
 alpha=np.maximum(alpha,np.ceil(required*255)/255)
 alpha[~support | np.all(delta==0,axis=2)]=0
 rgb=np.clip(np.rint(bg+delta/np.maximum(alpha[:,:,None],1/255)),0,255).astype('uint8')
 rgba=np.dstack((rgb,np.rint(alpha*255).astype('uint8')))
 Image.fromarray(rgba).save(root/(name+'-v3.png'),optimize=True)
 reconstructed=np.array(Image.alpha_composite(base.crop(rect).convert('RGBA'),Image.fromarray(rgba)).convert('RGB'),dtype=int)
 d=np.abs(reconstructed-target.astype(int))[support];report.append({'asset':name,'maxRGBDifference':int(d.max()),'meanRGBDifference':float(d.mean())})
Path('.scratch/starry-search/evidence/v3-20261012/asset-summary.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
