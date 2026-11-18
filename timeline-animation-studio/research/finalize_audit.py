from pathlib import Path
import json
root=Path(__file__).resolve().parent
sources=json.loads((root/'twenty/sources.json').read_text(encoding='utf-8-sig'))
statuses=json.loads((root/'twenty/sample-status.json').read_text(encoding='utf-8-sig'))
by_id={s['id']:s for s in statuses}
for source in sources:
    item=by_id[source['id']]
    source['watchStatus']='sampledFramesInspected' if item['sampleStatus']=='downloaded' else 'unavailable'
    source['sampleRange']='opening0–36seconds; full6-second demo for YpOSU795tHU'
    source['inspectionLimit']='Sampled frames only, not a full tutorial viewing.'
    if source['rank']==22:source['workflowCaveat']='Sampled tutorial UI appears CapCut; visual reference only.'
    if item['sampleStatus']=='unavailable':source['error']=item.get('error','')
(root/'twenty/sources.json').write_text(json.dumps(sources,indent=2,ensure_ascii=False),encoding='utf-8')
summary={'exactSearch':'timeline animation after effects','searchResults':40,'selectedYouTubeVideos':26,'downloadedSamples':25,'visuallyInspectedSamples':25,'unavailableSamples':1,'fullTutorialsClaimedWatched':0,'sampleRange':'At most opening0–36seconds; approximately3-second frame intervals','reviews':['twenty/REVIEW_01_10.md','twenty/REVIEW_11_20.md','twenty/REVIEW_21_26.md'],'primaryStudioScope':'Documentary moving year rulers, large offscreen photo journeys, cutouts, travel/hold camera stops, rolling dates and footage overlays','presets':16,'documentaryRendererFamilies':8,'secondaryDiagramPresets':36}
(root/'RESEARCH_SUMMARY.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
p=root/'twenty/SEARCH_AUDIT.md';text=p.read_text(encoding='utf-8-sig');text=text.replace('Each entry remains **searchOnly** until its actual animation sample is reviewed.', '**Final inspection status:**25opening samples visually inspected; one download unavailable(HTTP500). Each sample covers at most0–36seconds; no claim of full tutorial viewings. Read REVIEW_01_10.md, REVIEW_11_20.md and REVIEW_21_26.md for observed evidence and limitations.');p.write_text(text,encoding='utf-8')
