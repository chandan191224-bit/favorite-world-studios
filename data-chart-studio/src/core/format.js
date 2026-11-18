// Number formatting for Indian + international audiences: ₹ / $ / %, lakh / crore / lakh crore, million / billion /
// trillion (Hindi words or English), Indian digit grouping 12,34,56,789, optional Devanagari digits.
// The unit and decimals are chosen from the FINAL value (ref) so a counter keeps one unit and width while it counts.
DC.format = (() => {
  const WORDS = {
    indian: { en: [[1e12, 'lakh crore', 'L Cr'], [1e7, 'crore', 'Cr'], [1e5, 'lakh', 'L']], hi: [[1e12, 'लाख करोड़', 'लाख करोड़'], [1e7, 'करोड़', 'करोड़'], [1e5, 'लाख', 'लाख']] },
    intl: { en: [[1e12, 'trillion', 'T'], [1e9, 'billion', 'B'], [1e6, 'million', 'M'], [1e3, 'thousand', 'K']], hi: [[1e12, 'ट्रिलियन', 'ट्रिलियन'], [1e9, 'अरब', 'अरब'], [1e6, 'मिलियन', 'मिलियन'], [1e3, 'हज़ार', 'हज़ार']] },
  };
  const DEVA = '०१२३४५६७८९';
  const defaults = { prefix: '', suffix: '', unit: '', auto: 'none', unitStyle: 'word', decimals: 'auto', grouping: 'in', digits: 'latin', sign: false, scale: 1, minAuto: 1e5 };

  function group(intStr, mode) {
    if (mode === 'none' || intStr.length <= 3) return intStr;
    if (mode === 'intl') return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const last = intStr.slice(-3), rest = intStr.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last;
  }
  function pickUnit(ref, s, lang) {
    if (s.auto === 'none' || !WORDS[s.auto]) return null;
    const table = WORDS[s.auto][lang === 'hi' ? 'hi' : 'en'], a = Math.abs(ref);
    if (s.auto === 'indian' && a < (s.minAuto || 1e5)) return null;
    for (const [div, word, short] of table) if (a >= div * 0.9999) return { div, word: s.unitStyle === 'short' ? short : word };
    return null;
  }
  function autoDecimals(x) {
    const a = Math.abs(x);
    // one decimal more than the value has, never more than 2; keep exact decimals up to 999 (142.9 stays 142.9, not 143)
    for (let d = 0; d <= 2; d++) if (Math.abs(Math.round(a * 10 ** d) - a * 10 ** d) < 1e-6 * Math.max(1, a * 10 ** d)) return a >= 1000 ? 0 : d;
    return a >= 1000 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : 2;
  }
  // returns { text, num, prefix, unit, suffix } (parts for styled drawing)
  function parts(v, spec = {}, ref = v, lang = 'en') {
    const s = Object.assign({}, defaults, spec);
    v = (+v || 0) * (+s.scale || 1); ref = (+ref || 0) * (+s.scale || 1);
    const u = pickUnit(ref, s, lang), div = u ? u.div : 1;
    const x = v / div, dec = s.decimals === 'auto' || s.decimals === '' || s.decimals == null ? autoDecimals(ref / div) : Math.max(0, Math.min(4, +s.decimals));
    const neg = x < 0 && Math.abs(x) >= 0.5 * 10 ** -dec;
    let [i, f] = Math.abs(x).toFixed(dec).split('.');
    let n = group(i, s.grouping) + (f ? '.' + f : '');
    if (s.digits === 'deva') n = n.replace(/\d/g, d => DEVA[d]);
    const sign = neg ? '−' : s.sign && x > 0 ? '+' : '';
    const unit = [u ? u.word : '', s.unit || ''].filter(Boolean).join(' ');
    const text = sign + (s.prefix || '') + n + (unit ? ' ' + unit : '') + (s.suffix || '');
    return { text, sign, prefix: s.prefix || '', num: n, unit, suffix: s.suffix || '' };
  }
  const fmt = (v, spec, ref, lang) => parts(v, spec, ref, lang).text;
  // plain axis labels (short units, no decimals noise)
  function axis(v, spec = {}, lang = 'en', maxRef = v) {
    const s = Object.assign({}, defaults, spec, { unitStyle: 'short', decimals: 'auto' });
    if (s.auto === 'none' && Math.abs(maxRef * (s.scale || 1)) >= 1e7) s.auto = spec.grouping === 'intl' ? 'intl' : 'indian';
    const p = parts(v, s, maxRef, lang);
    if (s.auto !== 'none') { const u = pickUnit(maxRef * (s.scale || 1), s, lang); const x = (v * (s.scale || 1)) / (u ? u.div : 1); p.num = group(String(Math.round(Math.abs(x) * 100) / 100), s.grouping); }
    return p.sign + p.prefix + p.num + (p.unit ? ' ' + p.unit : '') + p.suffix;
  }
  return { parts, fmt, axis, group, defaults, WORDS };
})();
