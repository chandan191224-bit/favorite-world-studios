"""Bounded research-only YouTube samples; not assets for the shipped editor."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import json, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

root=Path(__file__).resolve().parent/'twenty'
root.mkdir(exist_ok=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
source=json.loads((root/'sources.json').read_text(encoding='utf-8-sig'))
if isinstance(source,dict):source=source.get('videos',source.get('sources',[]))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
def work(item):
    video_id=item['id'];folder=root/video_id;folder.mkdir(exist_ok=True)
    result={**item,'sampleRequested':'0–36 seconds','reviewed':False}
    try:
        videos=[p for p in folder.glob('sample.*') if p.suffix in {'.mp4','.webm','.mkv'}]
        if not videos:
            cmd=[sys.executable,'-m','yt_dlp','--no-playlist','--no-warnings','--socket-timeout','15','--retries','1','--fragment-retries','1','--js-runtimes','node','--ffmpeg-location',ffmpeg,'--download-sections','*0-36','-f','bv*[height<=360]/b[height<=360]','-o',str(folder/'sample.%(ext)s'),'https://www.youtube.com/watch?v='+video_id]
            run=subprocess.run(cmd,capture_output=True,text=True,timeout=150)
            videos=[p for p in folder.glob('sample.*') if p.suffix in {'.mp4','.webm','.mkv'}]
            if run.returncode or not videos:raise RuntimeError((run.stderr or run.stdout)[-1800:])
        run=subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(videos[0]),'-vf','fps=1/3,scale=320:-2','-frames:v','12',str(folder/'frame-%02d.jpg')],capture_output=True,text=True,timeout=45)
        if run.returncode:raise RuntimeError(run.stderr[-1000:])
        frames=sorted(folder.glob('frame-*.jpg'))
        if not frames:raise RuntimeError('No extracted frames')
        sheet=Image.new('RGB',(1280,690),'#10141a');draw=ImageDraw.Draw(sheet)
        draw.text((10,8),item.get('title',video_id)[:150],font=font,fill='white')
        draw.text((10,30),'YouTube '+video_id+' | research sample only | first 36 seconds',font=font,fill='#c9d6e5')
        for index,file in enumerate(frames[:12]):
            img=Image.open(file).convert('RGB');img.thumbnail((320,180))
            x=index%4*320;y=60+index//4*210
            sheet.paste(img,(x+(320-img.width)//2,y))
            draw.text((x+8,y+183),f'approx. {index*3+1.5:.1f}s',font=font,fill='#ffcb79')
        sheet.save(folder/'contact.jpg',quality=90)
        result.update(sampleStatus='downloaded',contactSheet=str((folder/'contact.jpg').relative_to(root)),extractedFrames=len(frames))
    except Exception as error:result.update(sampleStatus='unavailable',error=str(error))
    (folder/'status.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    return result
results=[]
with ThreadPoolExecutor(max_workers=4) as pool:
    jobs=[pool.submit(work,x) for x in source]
    for future in as_completed(jobs):
        item=future.result();results.append(item)
        print(item['id'],item['sampleStatus'],flush=True)
        (root/'sample-status.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
print('Finished',len(results),'sources;',sum(r['sampleStatus']=='downloaded' for r in results),'downloaded',flush=True)
