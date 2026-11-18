"""Fetch attributed public NASA image-library demo photos, never YouTube frames."""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from PIL import Image
import io,json,base64
root=Path(__file__).resolve().parents[1]
queries=[('shuttle','STS-1 launch'),('hubble','Hubble deployment'),('apollo','as11-40-5903'),('station','International Space Station orbit'),('webb','James Webb Space Telescope mirror')]
media={};manifest=[]
for key,query in queries:
    api='https://images-api.nasa.gov/search?'+urlencode({'q':query,'media_type':'image','page_size':5})
    data=json.load(urlopen(Request(api,headers={'User-Agent':'TimelineStudioResearch/1.0'}),timeout=30))
    items=data['collection']['items']
    item=next(x for x in items if x.get('links'))
    entry=item['data'][0];url=item['links'][0]['href']
    raw=urlopen(Request(url,headers={'User-Agent':'TimelineStudioResearch/1.0'}),timeout=30).read()
    img=Image.open(io.BytesIO(raw)).convert('RGB');img.thumbnail((1400,900));buf=io.BytesIO();img.save(buf,format='JPEG',quality=86)
    media['demo-'+key]={'kind':'image','name':entry['title'],'dataUrl':'data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()}
    manifest.append({'id':'demo-'+key,'query':query,'title':entry['title'],'nasa_id':entry['nasa_id'],'image':url,'source':api,'credit':entry.get('photographer') or entry.get('secondary_creator') or 'NASA','usage':'Illustrative NASA media-library demo; verify event-specific provenance before publishing. NASA imagery may include separately credited material.'})
    print(key,entry['title'],flush=True)
(root/'src/ui/demo-assets.js').write_text('TL.demoMedia='+json.dumps(media,separators=(',',':'))+';\n',encoding='utf-8')
(root/'research/NASA_DEMO_SOURCES.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
