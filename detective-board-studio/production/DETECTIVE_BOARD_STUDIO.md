# Detective Board Studio Pro

User request, 2026-10-30:

> Detective board animation, first search is about everywhere understand it then make studio where I can make all the types of detective type animation Full customisable, with customisable pretemplets , with customisable pre camera settings cinematic style, and smooth preview in my laptop and phone.

> ALL THE TYPES OF STUDIOS I MADE WITH THE CLAUDE IS AT THIS PATH YOU CAN SEE THEIR UI MAKE MAKE SIMILAR UI "C:\Users\chand\Desktop\clausd" ALSO ADD THIS PATH TO YOUR SKILL AS WELL SO THAT U CAN TAKE REFERENCES OF ANY THINGS , U CAN ALSO CHECK HOW THE MAP ANIMATION STUDIO IS ABLE TO SHOW SMOOTH PREVIEW, ETC FROM THIS PATH

> First always talk to me in english

## Location and use

`detective-board-studio/Detective Board Studio Pro.html`; PC launcher `Start Detective Studio.cmd`; phone launcher `Open On Phone.cmd` (same Wi-Fi, Node server on port 9851). The app is self-contained and offline, with local browser autosave plus portable media-inclusive JSON saves. Phone and laptop browser autosaves are separate.

For /make-video, use this studio for relationship boards, evidence webs, investigative timelines, suspect connections, dossiers, source-comparison sequences and cinematic clue reveals. Choose visuals by meaning; replace fictional demo text and procedural demo art with the episode's verified material. Every node, string and camera shot is editable. Nothing about an actual person is implied by the fictional templates.

Sound effects are never used. Output clips are silent. Keep music/narration in the main editor. Paper Studio remains the tool for filled newspaper/report animations; Paper Transition Studio handles scene transitions; Map Studio handles geographic animation. Detective boards can include an imported real map or source document image.

## Pipeline

`python production/pipeline/detective_fx.py templates` lists templates. `create` makes editable project JSON; repeat `--photo` / `--video` for real media placeholders. `render` invokes the local Chrome + FFmpeg renderer, with exact frame times and optional green/blue/matte/alpha modes. The same browser renderer powers previews and exports. See `detective-board-studio/README.md` for commands.

Integrate the resulting clip into the saved main editor project using its normal conflict-safe workflow. Do not render, change or upload an existing finished episode merely to demonstrate this new tool.

## Design and performance references

Source references: Paper Studio `studios/paper-animation-studio/paper-animation-studio-pro.html`; Paper Transition Studio `src/index.html`, `src/styles.css`, `src/ui/app.js`; Map Animation Studio `app/styles.css`, `app/Stage.tsx`, `src/lib/quality.ts`, `PERF_HANDOFF.md`.

Reused principles: dark/amber UI, library-stage-inspector-timeline layout, phone tabs, independent preview/export resolution, cached surfaces, viewport culling, bounded pixels and native canvas acceleration. Actual preview speed is measured separately. Map's handoff recorded unresolved performance issues; its presence is not proof this app is fast.

Camera tilt is simulated Canvas 2D foreshortening, not full 3D or optical depth-of-field. Browser alpha video is intentionally routed to transparent PNG/ZIP or the PC VP9 renderer. Physical-phone performance is not claimed without a physical-phone test.
