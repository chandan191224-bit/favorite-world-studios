# Timeline Animation Studio Pro — Favorite World

User request: “first acquire all the information related to the timeline animations that from YouTube and web and them make studio to make various types of timelines animations.”

Studio: `timeline-animation-studio/Timeline Animation Studio Pro.html`. Launch with `Start Timeline Studio.cmd`; phone with `Open On Phone.cmd`. Match the existing dark panels and amber controls. English conversation; Hindi/English content is editable.

Use the **Documentary** library for moving year rulers over footage, long offscreen photo histories, alternating cutout chronologies, luminous event branches, camera passages, rolling years and date inserts. The user corrected an earlier infographic interpretation: documentary motion and camera timing are the primary workflow. The 36 diagram presets are secondary under Diagrams. Replace sample dates, NASA illustrative photos and original cutout art with episode-specific material, then save the portable `.timeline.json` beside the episode assets.

16 documentary presets, eight renderer families and 12 themes. The camera visits one or two large events rather than fitting the whole chronology on screen. Event arrival, image reveal, travel duration, narration hold, per-stop zoom and final-wide reveal are editable. Import silent video/image backdrops for year rulers; alpha/key exports omit the backdrop for layering in the shared editor. Display dates and numeric calendar values are independent.

Pipeline helper: `python production/pipeline/timeline_fx.py templates|layouts|create|render`. Read the studio README for exact arguments. Default output is a silent full-resolution MP4, ready to place in the shared video editor. Transparent VP9 WebM uses `render --mode alpha` on PC; browser transparent assets use PNG/PNG sequences. Green/blue backgrounds and matte are supported. No sound effects are used.

Keep news/report page animations in Paper Studio, geographic motion in Map Studio and relationship/evidence webs in Detective Board Studio. Timeline clips can be layered with the user’s footage in the shared editor. Do not render or change finished episodes merely to demonstrate this tool.

Preview quality is independent from exports. Cached seeded surfaces and pre-rendered thumbnails keep playback light. Physical-phone performance has not been measured. Camera perspective is simulated in Canvas 2D. Follow the studio’s `VERIFICATION.md` rather than assuming unmeasured device speeds.

The user required at least 20 YouTube references. Exact search: “timeline animation after effects”. 26 videos selected; 25 opening samples visually inspected, one unavailable. Samples cover at most the opening 36 seconds; full tutorial viewings are not claimed. Actual per-video findings are in `research/twenty/REVIEW_*.md`, with a feature map in `research/REFERENCE_CATALOGUE.md`. The studio’s 26 refs button links every source. No paid API or downloaded AE template asset is required.
