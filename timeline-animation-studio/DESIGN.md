---
name: "Timeline Animation Studio Pro"
description: "An offline documentary timeline studio for laptop and phone."
colors:
  amber: "#efb54d"
  amber-hover: "#ffca6d"
  on-amber: "#1a1409"
  bg: "#101216"
  panel: "#191c22"
  input: "#111419"
  line: "#30343d"
  text: "#edf0f4"
  muted: "#a6afbd"
  soft: "#22262e"
  danger: "#f3a1a1"
  button-hover: "#2a303a"
  button-active: "#323a46"
  preset-surface: "#14171c"
  hold-surface: "#27313d"
  hold-selected: "#3b3427"
  event-surface: "#232b35"
  event-selected: "#433a2a"
typography:
  display:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "15px"
    letterSpacing: "-.025em"
  title:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "-.015em"
  body:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "13px"
  label:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "11px"
  supporting:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "11px"
    lineHeight: 1.6
  button:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 550
  export:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 650
  preset-title:
    fontFamily: "Inter, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  track: "4px"
  control: "5px"
  card: "6px"
  toast: "7px"
  dialog: "10px"
spacing:
  icon-gap: "7px"
  field-gap: "10px"
  card-gap: "12px"
  section-gap: "22px"
  section-inset: "18px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.export}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
  button-neutral:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
  button-neutral-hover:
    backgroundColor: "{colors.button-hover}"
  button-neutral-active:
    backgroundColor: "{colors.button-active}"
  field:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "9px 10px"
  preset-card:
    backgroundColor: "{colors.preset-surface}"
    rounded: "{rounded.card}"
    padding: "0"
  hold-block:
    backgroundColor: "{colors.hold-surface}"
    rounded: "{rounded.track}"
    padding: "5px 8px"
    height: "38px"
  hold-block-selected:
    backgroundColor: "{colors.hold-selected}"
  event-bar:
    backgroundColor: "{colors.event-surface}"
    rounded: "{rounded.track}"
    padding: "5px 8px"
    height: "43px"
  event-bar-selected:
    backgroundColor: "{colors.event-selected}"
---

# Design System: Timeline Animation Studio Pro

## Overview

**Creative North Star: "The Documentary Editing Desk"**

The established dark-panel and amber-control family is a quiet editing desk for documentary work. The media and chronology lead; the editor supplies legible controls, precise timing and a substantial preview. This is a code-led refinement of the pinned Clausd studio family after the user's rejection of the previous craft. It records the implementation, not a newly approved brand identity, seed or interface comp.

Offline use on a Windows laptop and a phone constrains the system: bundled fonts and inline icons must work without a runtime CDN, controls must preserve portable projects and imported media, and expanded preview must make the output inspectable beyond a small embedded stage. Output palettes belong to individual documentary families; they do not recolor the editor.

The North Star is a descriptive name for the settled implementation, not a new user-approved identity. This file merges the same-session provisional craft direction with the final observed source. Sources: `PRODUCT.md`, `DOCUMENTARY_CONTRACT.md`, `src/styles.css`, `src/craft.css`, `src/fonts.css`, `src/ui/craft-parts.js`, `src/ui/documentary-ui.js`, `src/ui/craft-presets.js`, `src/ui/icons.js` and `VERIFICATION.md`. The distributed artifact is `Timeline Animation Studio Pro.html`.

**Key Characteristics:**

- Charcoal surfaces, restrained rules and purposeful amber state cues.
- Large media with distinct date, heading and caption hierarchy.
- Directly readable camera holds, travel spans and linked event selection.
- Grouped contextual editing, with timing promoted on phones.

`research/CRAFT_VERDICT.md` records a bounded ship disposition: all eight listed correction items resolved in refreshed static captures, with 18 reported functional checks passing. `VERIFICATION.md` also records 11/11 final-artifact checks and five decoded silent video exports. This is evidence for those fixes, not approval of every surface, physical-phone behavior or continuous playback quality.

## Colors

A single warm operational accent sits within cool charcoal layers; the frontmatter owns exact reusable color values.

### Primary

- **Control Amber** (`amber`): Export, play, focused controls, active tabs, timeline playhead and selected editing cues.
- **Light Amber** (`amber-hover`): the filled primary button's hover response.
- **Amber Ink** (`on-amber`): dark text on the filled export action.

### Neutral

- **Canvas Charcoal** (`bg`): the workspace behind the composition.
- **Panel Charcoal** (`panel`): library, inspector and dialogs.
- **Input Charcoal** (`input`): recessed text fields and selects.
- **Hairline Slate** (`line`): rules that separate regions without heavy framing.
- **Soft Chalk** (`text`) and **Secondary Slate** (`muted`): primary interface text and supporting hierarchy.
- **Control Slate** (`soft`, `button-hover`, `button-active`): neutral action surfaces and state feedback.
- **Preset Charcoal** (`preset-surface`): complete media-first library rows.
- **Camera Slate / Selected Camera Umber** (`hold-surface`, `hold-selected`) and **Event Slate / Selected Event Umber** (`event-surface`, `event-selected`): distinct timing lanes with coordinated selection.

The inherited danger variable is retained as a semantic warning token. It is not a second brand accent. Documentary output may use parchment, monochrome, yellow editorial or luminous palettes established by its preset; those are content treatments rather than editor tokens.

**The Amber Has a Job Rule.** Use filled amber for Export and the play transport, and amber accents for selection, focus and the playhead. Keep inactive editor controls neutral.

## Typography

**Display / Body Font:** bundled Inter, with Segoe UI and sans-serif fallbacks. “Display” in the token layer means the compact editor brand, not a landing-page hero.

**Output fonts:** bundled Inter and Montserrat; Georgia and Courier New remain deliberate system-font options in the documentary type selector. Do not require an online font request.

The editor uses a compact hierarchy with modest weight changes. Normal interface text rests at the body token; supporting text is smaller, with comfortable line height. The inspector title uses the title token; section headings are smaller and quieter. Preset titles wrap above supporting family names and descriptions. At wide desktop sizes their title size increases; phone labels and fields become easier to read without introducing a new type family.

Timing readouts, timeline rulers, event dates and inline timing values use tabular numerals. Documentary output has its own composition scale: curated archive defaults set the date above the heading, and the heading above the caption. For example, the space-age archive uses date/heading/caption sizes of (78/44/25) in output coordinates. These values remain editable per project rather than becoming editor defaults. Long authored output titles must remain complete and clear of dates, rails and frame edges.

**The Dates Are Not Timing Rule.** Keep calendar labels distinct from video arrival and hold values; use tabular numerals for editable timing and playback readouts.

## Layout

Desktop is a three-column editing workspace beneath a fixed-height top bar (60px): library (250px), flexible stage, inspector (306px). The narrower desktop range (901–1250px) uses sidebars (226px/280px); wide desktop (1600px and above) uses (272px/328px). The center is a vertical stack of toolbar, flexible stage, transport and two-lane timing panel. The desktop timing panel is (226px), increasing to (232px) on wide screens. Final correction overrides keep its scroll area (129px), or (135px) on wide desktop, so the complete legend fits below it. The timeline's minimum content width is (660px).

Library previews form one full-width column on desktop with complete (16:9) media above title, family and description. Panel fields use two columns, with long content spanning both. Inspector sections use measured separation rather than a separate card for every setting. Stage padding, dividers and grouped forms keep the output visually central.

At (900px and below), the top bar is (56px), the workspace stacks, and fixed bottom navigation selects Library, Events, Edit or Export. Library previews use two columns; the timing content remains horizontally scrollable with a (700px) minimum width. The selected-event identity and arrival/hold summary precede editable timing; content follows, while image replacement/removal stays in a closed disclosure. Fields grow to (39px) minimum height. The phone timing viewport uses (153px), with a (145px) minimum. Safe-area padding is included in bottom navigation.

At (430px and below), the secondary brand word and some icon detail are suppressed; the embedded stage is (27dvh), with a (178px) minimum. Expanded preview hides editing panels, top bar, timeline and bottom navigation; it dedicates the viewport to the composition and transport, offers Fit/150%/200% magnification, and permits panning. These are implemented browser behaviors; physical-device validation remains unconfirmed.

## Elevation & Depth

The editor is primarily flat and uses tonal layers with one-pixel boundaries. Preset cards have no ambient shadow at rest. Selection adds a restrained outline; it does not turn every panel into a floating card. The stage, modal and transient toast supply the principal elevation cues.

### Shadow Vocabulary

- **Stage:** `0 10px 40px #0005` — separates the preview composition from the charcoal work area.
- **Selected preset:** `0 0 0 1px #dfa64a25` — reinforces the selected border without a decorative glow.
- **Dialog:** `0 20px 100px #000a` — isolates a bounded task above the workspace, with backdrop `#05070bd9`.
- **Toast:** `0 8px 30px #0006` — transient feedback above the editor.
- **Crop focus:** `0 0 0 1px #0008` — keeps the crop crosshair readable over media.

**The Flat Editing Desk Rule.** Use tonal layers and one-pixel rules for the editor. Reserve substantial shadows for the composition stage, transient feedback and dialogs.

## Shapes

Compact softly squared controls use the control radius; preset cards and fields use the card radius; timing spans use the tighter track radius. Toasts and dialogs have the slightly larger dedicated radii in the frontmatter. One-pixel rules carry structure; circular play and crop-focus controls retain their functional silhouettes. Full preview images are clipped within the card boundary, with their aspect ratio preserved. Avoid decorative pills or excessive rounding in the editor.

## Components

### Buttons

Neutral, compact and explicit. Normal actions use the soft surface and a muted border, with a lighter hover and pressed surface. Export uses the filled primary variant with a stronger weight (650) and dedicated horizontal padding. The round play control is also amber. Disabled actions reduce opacity to (.35). Existing actions, undo/redo and import/export behaviors remain intact.

Buttons, links, selects, inputs, textareas and the focusable preview canvas use an amber keyboard outline (2px) offset by (2px). This is an inherited rule from the base stylesheet. Do not replace it with hover alone. Background and border-color changes take (.16s); the reduced-motion media query removes CSS transitions.

### Inputs / Fields

Recessed, softly squared fields use the input surface and inherited text color. Grouped inspector fields use a lighter border (`#3a424f`), padding (9px 10px), and a normal minimum height (35px); phone fields grow as described in Layout. Captions use a taller textarea with (1.6) line height. Range and checkbox controls retain the native amber accent. Carets are amber. Project-name input stays visually quiet in the top bar. Range outputs pair exact values with their labels.

### Navigation

Desktop panel tabs are neutral text controls with a two-pixel amber underline when active. Animation/Arrange is a compact segmented control with a filled slate active state. Phone bottom navigation uses inline stroke icons above text; its selected destination has an umber surface and warm label. No unrelated marketing navigation belongs in the editor.

### Cards / Containers

Preset cards are full-width clickable buttons with complete media above text. Active cards receive a warm border and restrained selection ring. Event rows pair a tabular date, readable title, arrival/hold summary and subdued order number. Selected rows shift to umber with a warm border. Empty results state the next action in plain language. Media cards show the actual crop or contained image and keep replacement/removal actions nearby.

### Contextual Inspector

Event, Style, Motion and Project panels reveal controls appropriate to the current documentary family. Arrival is video time, separate from displayed date and numeric calendar value. Content, timing and optional media framing stay grouped. Advanced fields and media management use native disclosures; their summaries retain native disclosure affordances. Phone Edit promotes the selected-event summary and timing fields without changing the underlying project semantics.

### Camera & Event Timeline

A seconds ruler sits above Camera and Event media lanes. Arrival anchors each hold; a right-edge handle changes the hold, dashed connectors show travel, and the aligned media span shows the event's presence. Selected spans, the stage and inspector refer to the same event. Dragging an event retimes it; dragging a hold edge changes pacing. Sticky lane labels remain readable while the track scrolls. The full hold/event/travel legend stays visible below the two lanes.

### Preview and Documentary Motion

The composition stage shows a substantial current image with separate date, heading and caption baselines. Archive, ruler, cutout, luminous branch, perspective, vertical, counter and date-card families retain distinct visual grammar. Photo journeys keep a long offscreen chronology; whole-world context is explicit. The primary held archive image normally occupies roughly 42–50% of landscape width. Neighbor captions fade or cull before becoming partial-word debris. Ruler titles and fixed date pills occupy separate bands; year strips distinguish labeled integer years from intervening ticks.

Travel ends at arrival, followed by a narration hold. Incoming media anticipates the stop; stem/image/caption reveals are coordinated. The source exposes cinematic, smooth, linear and ease-out choices, stop-based or continuous paths, and optional final wide views. Year rolls pass through a masked window. These are implemented motion choices, not a claim that full live motion was approved. The perspective family is a 2.5D treatment; it does not claim optical depth of field.

### Icons and Offline Assets

Controls use self-contained SVG paths with `currentColor`, a (24×24) viewBox, stroke width (1.7), rounded caps/joins and `aria-hidden="true"`. Normal tool icons are (14–18px); phone navigation uses (19px), timeline lane icons (13px), and play uses (16px). Accessible labels or adjacent text supply meaning. Generated camera cutouts are explicitly illustrative; actual photo credits remain preserved. No new raster artwork is an approved interface mockup.

## Do's and Don'ts

### Do:

- Do preserve the pinned dark/amber editor family and use bundled fonts and inline SVG icons.
- Do retain complete preset previews, readable multiword titles and distinct date/title/caption baselines.
- Do show arrival, hold, travel and event-media spans as meaningful timing relationships.
- Do keep the phone selection summary and timing fields ahead of content and collapsed media management.
- Do preserve editable content, source credits, portable projects and the exact renderer shared by preview and export.

### Don't:

- Don't introduce a PRO badge, emoji controls, a chip wall or decorative editor glow.
- Don't flatten the documentary families into color swaps or fit every offscreen event into the default shot.
- Don't treat generated illustrative cutout artwork as historical photography or an approved UI comp.
- Don't describe static browser captures as physical-phone approval, continuous-motion approval or optical depth-of-field validation.
