import json
from pathlib import Path
root=Path(__file__).resolve().parent
data=json.loads((root/'search-exact.json').read_text(encoding='utf-8-sig'))
chosen=[
('9AtjrBHF560','Draw-on illuminated rail, event connectors and image reveals.'),
('IId0lGVP5SA','Documentary portrait cutouts on a travelling timeline.'),
('-a6PTzq04p8','A second Vox-style documentary chronology treatment.'),
('fk09MKjUGbs','Nitish Rajput documentary year-timeline animation without plugins.'),
('W-W6UItToJw','Documentary timelines explicitly modeled on Vox.'),
('oj4kiycTjb4','Purpose-built timeline-animation tutorial rather than editor-panel instruction.'),
('wH_XU69mKOE','Camera-driven Vox timeline with upper/lower media slides.'),
('crFgP3pkUOc','Dynamic date ruler and date slider based on Loki.'),
('YpOSU795tHU','Short original timeline animation demonstration.'),
('j6f2FfJsPdA','Cinematic three-dimensional timeline passage.'),
('MIWf11QcarQ','Documentary date-strip treatment from The Last Dance.'),
('ZxvWQNoMcAU','Historical photo chronology and documentary media staging.'),
('mxdpl1u6fWY','Scrolling timeline motion design.'),
('AW1oFLmNQ8Q','Historical documentary camera travel across large dated photos.'),
('h99HnzQmEss','Year chronology for showing dates in the past.'),
('YBZ-hPuBfII','Scrolling year/date ruler animation.'),
('uGAh2SHqpKo','Nitish Rajput-style year timelines for documentary editing.'),
('pBygKgR5OCM','Animated timeline design tutorial.'),
('_mRyTYz7JNk','Nitish Rajput documentary timeline replication tutorial.'),
('voJe4uhT_b0','Nitish Rajput year timeline effect tutorial.'),
('aaLKwXjmaGc','Compact scrolling year-ruler motion example.'),
('9_5DuApWzMY','Netflix-style documentary timeline animation.'),
('k9aVeJOHjcA','3D date timeline with camera travel and replaceable photos.'),
('ANcYLW9mfaw','Rolling year text motion for documentary date changes.'),
('HDf5JHhuMmI','3D historical documentary photo staging and camera movement.'),
('t6I8AkRLe-M','Short After Effects timeline template demo for comparison.')]
entries={e['id']:e for e in data['entries']}
out=[]
for rank,(video_id,reason) in enumerate(chosen,1):
    e=entries[video_id]
    out.append({'rank':rank,'id':video_id,'title':e.get('title'),'url':'https://www.youtube.com/watch?v='+video_id,'channel':e.get('channel'),'duration':e.get('duration'),'whyRelevant':reason,'watchStatus':'searchOnly','searchQuery':'timeline animation after effects','metadataSource':'YouTube search result via yt-dlp; no visual inspection claimed yet'})
(root/'sources.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'SEARCH_AUDIT.md').write_text('# YouTube search audit\n\nExact search: `timeline animation after effects`. Queried YouTube directly using `yt-dlp ytsearch40`. Retrieved 40 distinct results; selected 26 relevant effect/tutorial/demo videos below. Excluded general After Effects editor timeline/layers basics and duration/workflow tips. Premiere-only examples were excluded from the primary set. Each entry remains **searchOnly** until its actual animation sample is reviewed. Metadata is from the actual YouTube creator search results, not third-party copies.\n\n'+ '\n'.join(f"{e['rank']}. [{e['title']}]({e['url']}) — {e['channel']}; {e['duration']} seconds. {e['whyRelevant']}" for e in out)+'\n',encoding='utf-8')
print('Saved',len(out),'relevant creator videos to sources.json')
