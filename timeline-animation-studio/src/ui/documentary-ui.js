/* Contextual editing panels for documentary scenes. */
(() => {
  'use strict';

  TL.documentaryInspector = (p, e, panel, {f, n, sel, range, E}) => {
    const d = {...TL.documentaryDefaults, ...p.documentary};
    const c = p.camera || {};
    const a = p.animation || {};
    const s = p.style || {};
    const ruler = p.layout === 'doc-ruler';
    const counter = p.layout === 'doc-counter';
    const dateCard = p.layout === 'doc-date-card';
    const perspective = p.layout === 'doc-perspective';
    const vertical = p.layout === 'doc-vertical';
    const world = !counter && !dateCard;
    const mediaLayout = world && (!ruler || d.showMedia !== false);
    const alternating = p.layout === 'doc-cutout' || p.layout === 'doc-luminous';
    const monthPrefix = dateCard || p.presetId === 'doc-loki-slider' || p.events?.some(event => event.month);
    const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
    const section = (title, content, note = '') => `<section class="inspector-section"><h3 class="section-title">${E(title)}</h3>${note ? `<p class="section-note">${E(note)}</p>` : ''}${content}</section>`;
    const disclosure = (title, content, note = '') => `<details class="form-disclosure"><summary>${E(title)}</summary>${note ? `<p class="section-note">${E(note)}</p>` : ''}${content}</details>`;
    const fields = content => `<div class="fields">${content}</div>`;
    const heading = (title, detail = '') => `<div class="section-heading inspector-heading"><h2>${E(title)}</h2>${detail ? `<span class="inline-value">${E(detail)}</span>` : ''}</div>`;
    const button = (action, label, options = {}) => `<button type="button" data-action="${action}"${options.danger ? ' class="danger"' : ''}${options.disabled ? ' disabled' : ''}>${E(label)}</button>`;
    const fontValues = [['Inter', 'Inter'], ['Montserrat', 'Montserrat'], ['Georgia', 'Georgia'], ['Courier New', 'Courier New']];
    if (s.font && !fontValues.some(([id]) => id === s.font)) fontValues.push([s.font, `${s.font} (project font)`]);

    if (panel === 'event') {
      if (!e) return heading('Event') + `<div class="empty"><p>Select a stop in the timeline to edit its content and timing.</p>${button('add', 'Add an event')}</div>`;

      const index = p.events.indexOf(e);
      const media = e.media && p.media?.[e.media];
      const image = media?.kind !== 'video' && (media?.dataUrl || media?.url);
      const fit = e.mediaFit || 'cover';
      const focusX = Math.max(0, Math.min(1, finite(e.mediaX, .5))) * 100;
      const focusY = Math.max(0, Math.min(1, finite(e.mediaY, .5))) * 100;
      const imagePreview = (crop = false) => image ? `<div class="${crop ? 'crop-frame' : 'media-card-preview'}"><img class="media-preview" src="${E(image)}" alt="${E(e.title ? `Image for ${e.title}` : 'Selected event image')}" style="object-fit:${fit === 'cover' ? 'cover' : 'contain'};object-position:${focusX}% ${focusY}%">${crop ? `<span class="crop-focus" style="left:${focusX}%;top:${focusY}%" aria-hidden="true"></span>` : ''}</div>` : '';

      let html = heading('Event', `${index + 1} of ${p.events.length}`) + `<div class="selection-summary"><strong>${E(e.date || '')} · ${E(e.title || 'Untitled event')}</strong><span>Arrive ${finite(e.start, 0).toFixed(2)} s · Hold ${finite(e.cameraHold, d.holdDuration).toFixed(1)} s</span></div>`;
      if (mediaLayout) {
        html += `<details class="form-disclosure media-management"><summary>${E(media ? 'Event image · Replace or remove' : 'Add an event image')}</summary><div class="media-card">${imagePreview()}${media ? `<div class="media-card-name" title="${E(media.name || '')}">${E(media.name || 'Event image')}</div>` : `<p class="section-note">Add a photo or a transparent image for this stop.</p>`}<div class="row-actions">${button('photo', media ? 'Replace image' : 'Add image')}${media ? button('removePhoto', 'Remove') : ''}</div></div></details>`;
      }

      html += section('Content', fields(
        f('Date on screen', 'event', 'date', e.date, 'text', {wide: true}) +
        (monthPrefix ? f('Month or prefix', 'event', 'month', e.month || '', 'text', {wide: true}) : '') +
        f('Heading', 'event', 'title', e.title, 'text', {wide: true}) +
        (!counter ? f('Caption', 'event', 'description', e.description, 'textarea', {wide: true}) : '')
      ));

      html += section('Timing', fields(
        n(world ? 'Arrive at (s)' : 'Reach date at (s)', 'event', 'start', e.start, 0, p.duration, .05) +
        n('Hold for (s)', 'event', 'cameraHold', e.cameraHold ?? d.holdDuration, .1, 60, .1) +
        (mediaLayout ? n('Image reveal (s)', 'event', 'duration', e.duration, .05, 12, .05, true) : '')
      ), 'Arrival is the video time, independent of the date shown on screen.');

      if (mediaLayout && media) {
        let imageFields = sel('Fit', 'event', 'mediaFit', fit, [['cover', 'Fill frame'], ['contain', 'Show full image'], ['cutout', 'Transparent cutout']], true);
        if (alternating) imageFields += sel('Side of rail', 'event', 'captionSide', e.captionSide || 'auto', [['auto', 'Follow the preset'], ['above', 'Above'], ['below', 'Below']], true);
        imageFields += range('Image scale', 'event', 'mediaScale', e.mediaScale ?? 1, .4, 2);
        if (image && fit === 'cover') imageFields += imagePreview(true) + range('Horizontal focus', 'event', 'mediaX', e.mediaX ?? .5, 0, 1) + range('Vertical focus', 'event', 'mediaY', e.mediaY ?? .5, 0, 1);
        html += disclosure('Image framing', fields(imageFields), 'Use a transparent PNG for a cutout. The preview shows the current crop focus.');
      }

      html += disclosure('Advanced event settings', fields(
        n('Numeric calendar value', 'event', 'value', e.value, -999999, 999999, 1, true) +
        f('Source or credit', 'event', 'source', e.source || '', 'text', {wide: true}) +
        (world ? range('Zoom at this stop', 'event', 'cameraZoom', e.cameraZoom ?? 1, .6, 2.2) : '') +
        (world && !ruler ? n('Position X', 'event', 'offsetX', e.offsetX ?? 0, -8000, 8000, 1) + n('Position Y', 'event', 'offsetY', e.offsetY ?? 0, -8000, 8000, 1) : '') +
        (!counter && !dateCard ? f('Date accent', 'event', 'color', e.color || s.accent, 'color', {wide: true}) : '')
      ), 'Numeric values drive calendar spacing. Display labels can contain months, BCE dates or Hindi text.');

      html += `<div class="row-actions event-order">${button('earlier', 'Move earlier', {disabled: index <= 0})}${button('later', 'Move later', {disabled: index >= p.events.length - 1})}</div><div class="row-actions event-actions">${button('duplicate', 'Duplicate')}${button('delete', 'Delete event', {danger: true})}</div>`;
      return html;
    }

    if (panel === 'style') {
      let html = heading('Appearance');
      html += section('Composition', fields(
        sel('Animation type', 'project', 'layout', p.layout, TL.layouts.filter(layout => layout.id.startsWith('doc-')).map(layout => [layout.id, layout.name]), true) +
        sel('Theme', 'project', 'theme', p.theme, Object.values(TL.themes).map(theme => [theme.id, theme.name]), true) +
        f('Accent', 'style', 'accent', s.accent, 'color') +
        f('Text', 'style', 'foreground', s.foreground, 'color') +
        f('Background', 'style', 'background', s.background, 'color') +
        f('Secondary', 'style', 'secondary', s.secondary, 'color')
      ));

      html += section('Typography', fields(
        sel('Typeface', 'style', 'font', s.font, fontValues, true) +
        range('Date size', 'documentary', 'yearSize', d.yearSize, 24, 180, 1) +
        range('Heading size', 'documentary', 'headingSize', d.headingSize, 24, 100, 1) +
        (!counter ? range('Caption size', 'documentary', 'descriptionSize', d.descriptionSize, 16, 44, 1) : '')
      ));

      const visibility = (!counter && !dateCard ? f('Show year labels', 'style', 'showDates', s.showDates, 'checkbox') : '') +
        (!counter ? f('Show captions', 'style', 'showDescriptions', s.showDescriptions, 'checkbox') : '') +
        f('Show topic heading', 'style', 'showHeader', s.showHeader, 'checkbox') +
        (mediaLayout ? f('Show image credits', 'documentary', 'showSources', !!d.showSources, 'checkbox') : '');
      html += disclosure('Labels and atmosphere', fields(
        visibility + range('Texture', 'style', 'texture', s.texture ?? 0, 0, .5) +
        range('Vignette', 'documentary', 'vignette', d.vignette, 0, .8) +
        f('Show grid', 'style', 'grid', s.grid, 'checkbox')
      ));

      if (world) {
        html += section(ruler ? 'Ruler placement' : 'Rail geometry', fields(
          range('Rail height', 'documentary', 'railY', d.railY, .25, .94) +
          range('Line weight', 'style', 'lineWidth', s.lineWidth, 1, 12, .5) +
          (!ruler ? n('Event spacing', 'documentary', 'spacing', d.spacing, 500, 2400, 25, true) : '')
        ));

        let images = ruler ? f('Show event images', 'documentary', 'showMedia', d.showMedia, 'checkbox') : '';
        if (!ruler || d.showMedia !== false) {
          images += sel('Treatment', 'documentary', 'mediaTreatment', d.mediaTreatment, [['photo', 'Photograph'], ['cutout', 'Transparent cutout'], ['circle', 'Circular frame'], ['paper', 'Archive paper']], true) +
            n('Image width', 'documentary', 'mediaWidth', d.mediaWidth, 180, 1400, 10) +
            n('Image height', 'documentary', 'mediaHeight', d.mediaHeight, 140, 850, 10) +
            (!vertical ? n('Gap from rail', 'documentary', 'mediaGap', d.mediaGap, 24, 240, 4, true) : '');
        }
        if (images) html += disclosure('Event images', fields(images));
      }
      html += `<div class="row-actions">${button('savePreset', 'Save as my preset')}</div>`;
      return html;
    }

    if (panel === 'motion') {
      const continuous = world && !ruler && d.cameraPath === 'continuous';
      let html = heading(counter ? 'Year animation' : dateCard ? 'Date transitions' : 'Camera and timing');
      const timing = n('Travel time (s)', 'documentary', 'moveDuration', d.moveDuration, .2, 5, .1) +
        (!continuous ? n('Default hold (s)', 'documentary', 'holdDuration', d.holdDuration, .5, 30, .1) : '') +
        sel('Easing', 'animation', 'ease', a.ease, [['cinematic', 'Cinematic'], ['smooth', 'Smooth'], ['linear', 'Linear'], ['ease-out', 'Ease out']], true);
      html += section('Pacing', fields(timing), continuous ? 'The camera crosses the scene over its full duration.' : 'Travel finishes at each arrival. The following hold leaves space for narration.');
      if (!continuous) html += `<div class="row-actions">${button('autoTiming', 'Build stops from holds')}</div><p class="section-note">Set an individual hold in the Event panel when one moment needs longer.</p>`;

      if (world) {
        html += section('Camera', fields(
          sel('Movement', 'camera', 'mode', c.mode, [['follow', 'Follow the events'], ['overview', 'Whole timeline'], ['push', 'Follow with a push in'], ['pull', 'Follow with a pull back'], ['drift', 'Documentary drift']], true) +
          (!ruler ? sel('Path', 'documentary', 'cameraPath', d.cameraPath, [['stops', 'Visit each event'], ['continuous', 'Continuous passage']], true) : '') +
          range('Scene zoom', 'camera', 'zoom', c.zoom ?? 1, .5, 2) +
          (['push', 'pull', 'drift'].includes(c.mode) ? range('Movement strength', 'camera', 'strength', c.strength ?? .4, 0, 1) : '')
        ));

        if (perspective) html += section('Perspective', fields(
          range('Depth', 'documentary', 'depth', d.depth, 0, .8) +
          range('Camera angle (degrees)', 'documentary', 'tilt', d.tilt, -12, 12, .5)
        ));

        if (!ruler) html += disclosure('Ending and composition', fields(
          f('Finish with a wide view', 'documentary', 'finalWide', d.finalWide, 'checkbox') +
          (d.finalWide ? n('Wide reveal (s)', 'documentary', 'wideDuration', d.wideDuration, .5, 5, .1, true) : '') +
          sel('Calendar spacing', 'project', 'spacing', p.spacing, [['equal', 'Equal event spacing'], ['proportional', 'Proportional dates']], true) +
          sel('Direction', 'project', 'direction', p.direction, [['forward', 'Forward'], ['reverse', 'Reverse']], true)
        ));
      }

      if (ruler) html += section('Year ruler', fields(
        n('Tick interval', 'documentary', 'tickStep', d.tickStep, .01, 1000, 1) +
        n('Label every N ticks', 'documentary', 'labelEvery', d.labelEvery, 1, 100, 1) +
        range('Pointer position', 'documentary', 'cursorPosition', d.cursorPosition, .2, .8) +
        range('Fade the ends', 'documentary', 'edgeFade', d.edgeFade || 0, 0, .45) +
        f('Show fixed pointer', 'documentary', 'cursor', d.cursor, 'checkbox') +
        f('Highlight current date', 'documentary', 'datePill', d.datePill, 'checkbox') +
        f('Show large date', 'documentary', 'showBigDate', d.showBigDate, 'checkbox')
      ));

      if (counter) html += section('Year strip', fields(
        sel('Roll direction', 'documentary', 'counterAxis', d.counterAxis, [['vertical', 'Vertical'], ['horizontal', 'Horizontal']], true) +
        n('Step between years', 'documentary', 'tickStep', d.tickStep, .01, 1000, 1, true) +
        range('Horizontal position', 'documentary', 'cursorPosition', d.cursorPosition, .2, .8) +
        f('Frame the active date', 'documentary', 'datePill', d.datePill, 'checkbox')
      ), 'The numeric values in each event define the years the strip passes through.');

      if (dateCard) html += section('Date placement', fields(
        range('Horizontal position', 'documentary', 'cursorPosition', d.cursorPosition, .2, .8)
      ));

      return html;
    }

    if (panel === 'project') {
      const backdrop = d.backgroundMedia && p.media?.[d.backgroundMedia];
      let html = heading('Scene settings');
      html += section('Scene', fields(
        f('Topic', 'project', 'title', p.title, 'text', {wide: true}) +
        f('Project note', 'project', 'subtitle', p.subtitle, 'textarea', {wide: true}) +
        n('Duration (s)', 'project', 'duration', p.duration, 1, 600, .5) +
        sel('Frame rate', 'project', 'fps', String(p.fps), ['24', '25', '30', '60'])
      ));

      html += disclosure('Output dimensions', fields(
        n('Width (px)', 'project', 'width', p.width, 240, 7680, 2) +
        n('Height (px)', 'project', 'height', p.height, 240, 7680, 2)
      ), 'Preview quality is independent from export resolution.');

      html += section('Backdrop',
        (backdrop ? `<div class="media-card backdrop-card"><div class="media-card-name">${E(backdrop.name || 'Imported backdrop')}</div><span class="inline-value">${backdrop.kind === 'video' ? 'Silent video' : 'Image'}</span></div>` : `<p class="section-note">Add footage or an image behind the timeline.</p>`) +
        `<div class="row-actions">${button('backdrop', backdrop ? 'Replace backdrop' : 'Import backdrop')}${backdrop ? button('removeBackdrop', 'Remove') : ''}</div>` +
        (backdrop ? fields(range('Darken backdrop', 'documentary', 'backgroundDim', d.backgroundDim, 0, .85)) : '') +
        `<p class="section-note">Transparent and green/blue exports omit the backdrop so you can layer the timeline over footage in your editor.</p>`
      );

      html += section('Event data', `<div class="row-actions">${button('importCSV', 'Import CSV')}${button('exportCSV', 'Export CSV')}</div><div class="row-actions">${button('sortDates', 'Sort by calendar value')}</div><p class="section-note">CSV requires date and title columns. Import replaces the event list and can be undone.</p>`);
      html += `<div class="row-actions">${button('references', 'View the 26 reference videos')}</div><p class="section-note">All exports are silent. Use PNG sequences for browser transparency or the PC renderer for transparent WebM.</p>`;
      return html;
    }

    return '';
  };
})();
