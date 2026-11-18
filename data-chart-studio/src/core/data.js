// Data from a pasted table / CSV. One simple shape for every chart:
//   first row = headers, first column = labels (category, country, or year), other columns = numbers (one per series).
// Optional extras: columns named color / flag / icon / note / group / image / unit / prefix / suffix (per row), and rows starting with
// #color, #flag, #icon (per column/series). Example:
//   year,India,China
//   #flag,in,cn
//   #color,#FF9933,#DE2910
//   2000,0.47,1.21
DC.data = (() => {
  const U = DC.util;
  const META_COLS = { color: 'color', colour: 'color', 'रंग': 'color', flag: 'flag', code: 'flag', icon: 'icon', note: 'note', 'नोट': 'note', group: 'group', image: 'image', photo: 'image', unit: 'unit', prefix: 'prefix', suffix: 'suffix' };
  const META_ROWS = { '#color': 'color', '#colour': 'color', '#flag': 'flag', '#icon': 'icon', '#image': 'image' };

  function parse(text) {
    const all = U.parseCSV(text);
    const headers = (all[0] || []).map(h => h || '');
    const metaRows = {}, rows = [];
    for (const r of all.slice(1)) {
      const k = (r[0] || '').toLowerCase();
      if (META_ROWS[k]) { metaRows[META_ROWS[k]] = r; continue; }
      if (k.startsWith('#')) continue; // comments
      rows.push(headers.map((_, i) => r[i] == null ? '' : r[i]));
    }
    const metaCol = {};
    headers.forEach((h, i) => { const m = META_COLS[h.trim().toLowerCase()]; if (m && i > 0 && metaCol[m] == null) metaCol[m] = i; });
    const metaIdx = new Set(Object.values(metaCol));
    const numCols = headers.map((_, i) => i).filter(i => i > 0 && !metaIdx.has(i) && rows.some(r => !isNaN(U.num(r[i]))));
    const colMeta = (kind, i) => (metaRows[kind] && metaRows[kind][i]) || '';
    return { headers, rows, metaCol, numCols, metaRows, colMeta, text };
  }
  const rowMeta = (ds, r, kind) => (ds.metaCol[kind] != null ? r[ds.metaCol[kind]] || '' : '');

  // rows as categories (bars, pie, ranking...). col = which numeric column (0 = first)
  function categories(ds, col = 0) {
    const c = ds.numCols[Math.min(col, ds.numCols.length - 1)];
    return ds.rows.map((r, i) => ({
      i, label: r[0], value: c == null ? NaN : U.num(r[c]), values: ds.numCols.map(j => U.num(r[j])),
      color: rowMeta(ds, r, 'color'), flag: rowMeta(ds, r, 'flag'), icon: rowMeta(ds, r, 'icon'), note: rowMeta(ds, r, 'note'),
      group: rowMeta(ds, r, 'group'), image: rowMeta(ds, r, 'image'),
      unit: rowMeta(ds, r, 'unit'), prefix: rowMeta(ds, r, 'prefix'), suffix: rowMeta(ds, r, 'suffix'),
    })).filter(d => d.label !== '' || !isNaN(d.value));
  }
  // columns as series over the rows (line, area, race, stacked, compare)
  function series(ds) {
    const x = ds.rows.map(r => r[0]);
    const xNum = x.map((v, i) => { const n = U.num(v); return isNaN(n) ? i : n; });
    const ser = ds.numCols.map((c, k) => ({
      i: k, col: c, name: ds.headers[c], values: ds.rows.map(r => U.num(r[c])),
      color: ds.colMeta('color', c), flag: ds.colMeta('flag', c), icon: ds.colMeta('icon', c), image: ds.colMeta('image', c),
    }));
    return { x, xNum, series: ser, xName: ds.headers[0] };
  }
  // scatter / bubble: label, x, y, [size], [group]
  function points(ds) {
    const find = n => ds.headers.findIndex((h, i) => i > 0 && h.trim().toLowerCase() === n);
    let xi = find('x'), yi = find('y'), si = find('size');
    const nc = ds.numCols;
    if (xi < 0) xi = nc[0]; if (yi < 0) yi = nc[1]; if (si < 0 && nc.length > 2) si = nc[2];
    return {
      xName: ds.headers[xi] || 'x', yName: ds.headers[yi] || 'y', sizeName: si >= 0 ? ds.headers[si] : '',
      pts: ds.rows.map((r, i) => ({ i, label: r[0], x: U.num(r[xi]), y: U.num(r[yi]), size: si >= 0 ? U.num(r[si]) : 1,
        group: rowMeta(ds, r, 'group'), color: rowMeta(ds, r, 'color'), flag: rowMeta(ds, r, 'flag') })).filter(p => !isNaN(p.x) && !isNaN(p.y)),
    };
  }
  return { parse, categories, series, points };
})();
