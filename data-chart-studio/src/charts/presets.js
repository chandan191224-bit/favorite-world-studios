// Ready-made looks with sample data. Every preset is a full scene: replace the table with your own numbers.
// Sources are given where the numbers are real (rounded); "Sample data" where they are only for show.
(() => {
  const P = DC.charts.preset;
  const GDP_RACE = `year,United States,China,Japan,Germany,India,United Kingdom,France,Italy,Brazil,Russia,Canada
#flag,us,cn,jp,de,in,gb,fr,it,br,ru,ca
1990,5.96,0.36,3.18,1.77,0.32,1.09,1.27,1.18,0.46,0.52,0.60
2000,10.25,1.21,4.97,1.95,0.47,1.66,1.36,1.15,0.66,0.26,0.74
2010,15.05,6.09,5.76,3.40,1.68,2.49,2.65,2.14,2.21,1.52,1.62
2015,18.21,11.06,4.44,3.36,2.10,2.93,2.44,1.84,1.80,1.36,1.56
2020,21.35,14.69,5.05,3.89,2.67,2.70,2.64,1.90,1.48,1.49,1.65
2023,27.36,17.79,4.21,4.46,3.55,3.34,3.03,2.25,2.17,2.02,2.14`;
  const POP_RACE_HI = `वर्ष,भारत,चीन,अमेरिका,इंडोनेशिया,पाकिस्तान,ब्राज़ील,नाइजीरिया,बांग्लादेश
#flag,in,cn,us,id,pk,br,ng,bd
1960,43.5,66.7,18.6,8.8,4.6,7.2,4.5,5.0
1980,69.6,98.1,22.9,14.8,8.1,12.2,7.3,8.3
2000,105.7,126.3,28.2,21.4,15.4,17.5,12.3,13.0
2020,139.6,141.1,33.2,27.4,22.7,21.3,20.8,16.7
2023,142.9,141.0,33.5,27.8,24.0,21.6,22.4,17.3`;
  const TOP_POP = `country,population,flag
India,142.86,in
China,142.57,cn
United States,33.99,us
Indonesia,27.75,id
Pakistan,24.05,pk
Nigeria,22.38,ng
Brazil,21.64,br
Bangladesh,17.30,bd
Russia,14.44,ru
Mexico,12.85,mx`;
  const crore = { unit: 'crore', decimals: 'auto' }, croreHi = { unit: 'करोड़' };

  // ---- Race ----
  P({ id: 'race-gdp', name: 'GDP race (dark)', chart: 'race', theme: 'dark', lang: 'en', duration: 14, csv: GDP_RACE,
    title: "World's biggest economies", subtitle: 'GDP, trillion US dollars (current prices)', source: 'Source: IMF World Economic Outlook (rounded)',
    format: { prefix: '$', unit: 'T', decimals: 2 }, params: { bars: 10 }, highlight: 'India', highlightAt: 9 });
  P({ id: 'race-pop-hi', name: 'आबादी रेस (paper, Hindi)', chart: 'race', theme: 'paper', lang: 'hi', duration: 14, csv: POP_RACE_HI,
    title: 'दुनिया में सबसे ज़्यादा आबादी', subtitle: 'आबादी, करोड़ में', source: 'स्रोत: UN World Population Prospects (rounded)',
    format: croreHi, params: { bars: 8, labelMode: 'inside bars' }, highlight: 'भारत', highlightAt: 10,
    callouts: [{ target: 'भारत', text: '2023: भारत नंबर 1', at: 11.6, dur: 0.8 }] });
  P({ id: 'race-gdp-neon', name: 'GDP race (neon, total)', chart: 'race', theme: 'neon', lang: 'en', duration: 12, csv: GDP_RACE,
    title: 'THE GDP RACE', subtitle: 'Trillion US$', source: 'Source: IMF (rounded)', format: { prefix: '$', unit: 'T', decimals: 2 },
    params: { bars: 8, total: true, totalLabel: 'Top 11 total', stepEase: 'inOut' } });

  // ---- Lines ----
  P({ id: 'line-gdp-india', name: 'India GDP line + call-outs + push', chart: 'line', theme: 'dark', lang: 'en', duration: 8,
    csv: 'year,India GDP\n1991,0.27\n1995,0.36\n2000,0.47\n2005,0.82\n2010,1.68\n2015,2.10\n2020,2.67\n2023,3.55',
    title: "India's economy since 1991", subtitle: 'GDP, trillion US dollars', source: 'Source: World Bank / IMF (rounded)',
    format: { prefix: '$', unit: 'T', decimals: 2 }, params: { build: 4, dots: true },
    callouts: [{ target: '1991', text: '1991: economic reforms', at: 1.0 }, { target: '2023', text: '5th biggest economy', at: 4.7 }],
    camera: { target: '2023', at: 5.2, zoom: 1.45, dur: 1.4 } });
  P({ id: 'line-india-china-hi', name: 'भारत बनाम चीन (line, Hindi)', chart: 'line', theme: 'dark', lang: 'hi', duration: 8,
    csv: 'वर्ष,भारत,चीन\n#flag,in,cn\n#color,#FF9933,#E5383B\n1990,0.32,0.36\n1995,0.36,0.73\n2000,0.47,1.21\n2005,0.82,2.29\n2010,1.68,6.09\n2015,2.10,11.06\n2020,2.67,14.69\n2023,3.55,17.79',
    title: 'भारत और चीन की GDP', subtitle: 'ट्रिलियन डॉलर में', source: 'स्रोत: IMF (rounded)', format: { prefix: '$', unit: 'ट्रिलियन', decimals: 2 },
    params: { build: 4.5, followY: true, smooth: true } });
  P({ id: 'line-literacy-paper', name: 'साक्षरता (paper line, dots)', chart: 'line', theme: 'paper', lang: 'hi', duration: 7,
    csv: 'जनगणना,साक्षरता दर\n1951,18.3\n1961,28.3\n1971,34.5\n1981,43.6\n1991,52.2\n2001,64.8\n2011,74.0',
    title: 'भारत की साक्षरता दर', subtitle: 'हर जनगणना में, प्रतिशत', source: 'स्रोत: भारत की जनगणना (Census of India)',
    format: { suffix: '%', decimals: 1 }, params: { dots: true, build: 4 }, callouts: [{ target: '2011', text: '74% साक्षर', at: 4.6 }] });
  P({ id: 'line-petrol-neon', name: 'Petrol price (neon line)', chart: 'line', theme: 'neon', lang: 'en', duration: 7,
    csv: 'year,Petrol Delhi\n2010,51.4\n2012,65.6\n2014,72.3\n2016,59.7\n2018,75.6\n2020,69.6\n2021,101.8\n2022,96.7\n2024,94.7',
    title: 'PETROL PRICE IN DELHI', subtitle: '₹ per litre (approx., sample)', source: 'Sample data — replace with official figures',
    format: { prefix: '₹', decimals: 1 }, params: { yZero: false, build: 4.2 }, highlight: '', callouts: [{ target: '2021', text: '₹100 crossed', at: 4.4 }] });

  // ---- Area ----
  P({ id: 'area-population', name: 'Population area (light)', chart: 'area', theme: 'light', lang: 'en', duration: 7,
    csv: 'census,Population\n1951,36.1\n1961,43.9\n1971,54.8\n1981,68.3\n1991,84.6\n2001,102.9\n2011,121.1',
    title: "India's population", subtitle: 'Crore people, census years', source: 'Source: Census of India', format: crore, params: { smooth: true, build: 4 } });
  P({ id: 'area-stacked', name: 'Stacked area (dark)', chart: 'area', theme: 'dark', lang: 'en', duration: 7,
    csv: 'year,Coal,Hydro,Solar,Wind\n2015,70,14,1,3\n2017,74,12,2,4\n2019,72,11,4,5\n2021,74,10,6,5\n2023,73,9,8,5',
    title: 'Electricity by source', subtitle: 'Share of generation, % (sample)', source: 'Sample data — replace with official figures',
    format: { suffix: '%' }, params: { stacked: true, endLabel: false, build: 3.6 } });

  // ---- Columns ----
  P({ id: 'columns-growth', name: 'GDP growth columns (negatives)', chart: 'columns', theme: 'dark', lang: 'en', duration: 6,
    csv: 'year,GDP growth\nFY20,3.9\nFY21,-5.8\nFY22,9.7\nFY23,7.0\nFY24,8.2',
    title: "India's GDP growth", subtitle: 'Real GDP growth, % per year', source: 'Source: MoSPI (rounded)', format: { suffix: '%', decimals: 1, sign: true },
    params: { build: 2.6 }, callouts: [{ target: 'FY21', text: 'COVID lockdown', at: 3.2, below: true }] });
  P({ id: 'columns-medals', name: 'Grouped columns (India vs China)', chart: 'columns', theme: 'paper', lang: 'en', duration: 7,
    csv: 'Olympics,India,China\n#color,#C4752A,#B8382C\n2008,3,100\n2012,6,88\n2016,2,70\n2020,7,89\n2024,6,91',
    title: 'Olympic medals', subtitle: 'Total medals won', source: 'Source: IOC', format: {}, params: { build: 3 } });
  P({ id: 'columns-hi-neon', name: 'स्तंभ (neon, Hindi)', chart: 'columns', theme: 'neon', lang: 'hi', duration: 6,
    csv: 'साल,यात्री\n2019,14.1\n2020,5.3\n2021,8.4\n2022,13.6\n2023,15.4',
    title: 'हवाई यात्री (करोड़)', subtitle: 'घरेलू उड़ानें (sample)', source: 'Sample data', format: croreHi, params: {} });

  // ---- Bars ----
  P({ id: 'bars-states', name: 'States population bars (paper)', chart: 'bars', theme: 'paper', lang: 'en', duration: 6,
    csv: 'state,population\nUttar Pradesh,19.98\nMaharashtra,11.24\nBihar,10.41\nWest Bengal,9.13\nMadhya Pradesh,7.27\nTamil Nadu,7.21\nRajasthan,6.85\nKarnataka,6.11',
    title: 'Most populous states', subtitle: 'Crore people (Census 2011)', source: 'Source: Census of India 2011', format: crore, params: { build: 3 }, highlight: 'Uttar Pradesh', highlightAt: 3.6 });
  P({ id: 'bars-states-hi', name: 'राज्य (dark bars, Hindi)', chart: 'bars', theme: 'dark', lang: 'hi', duration: 6,
    csv: 'राज्य,आबादी\nउत्तर प्रदेश,19.98\nमहाराष्ट्र,11.24\nबिहार,10.41\nपश्चिम बंगाल,9.13\nमध्य प्रदेश,7.27\nतमिलनाडु,7.21',
    title: 'सबसे ज़्यादा आबादी वाले राज्य', subtitle: 'करोड़ में (जनगणना 2011)', source: 'स्रोत: जनगणना 2011', format: croreHi, params: { build: 2.6 },
    camera: { target: 'उत्तर प्रदेश', at: 3.8, zoom: 1.25, dur: 1.2 } });
  P({ id: 'bars-flags-neon', name: 'Bars with flags (neon)', chart: 'bars', theme: 'neon', lang: 'en', duration: 6, csv: TOP_POP.split('\n').slice(0, 7).join('\n'),
    title: 'MOST PEOPLE', subtitle: 'Crore people, 2023', source: 'Source: UN WPP 2022 (rounded)', format: crore, params: {} });

  // ---- Stacked ----
  P({ id: 'stacked-urban', name: '100% columns (urban vs rural)', chart: 'stacked', theme: 'light', lang: 'en', duration: 6,
    csv: 'census,Urban,Rural\n1951,17.3,82.7\n1971,19.9,80.1\n1991,25.7,74.3\n2011,31.2,68.8',
    title: 'India moves to cities', subtitle: 'Share of population', source: 'Source: Census of India', format: { suffix: '%' }, params: { percent: true, orient: 'vertical' } });
  P({ id: 'stacked-ages', name: 'Stacked bars (age groups)', chart: 'stacked', theme: 'dark', lang: 'en', duration: 6,
    csv: 'country,0-14,15-64,65+\n#color,#3fb6c6,#f2a93b,#ef6b5b\nIndia,25,68,7\nChina,17,69,14\nJapan,12,59,29\nNigeria,43,54,3',
    title: 'Young and old nations', subtitle: 'Share of population by age, % (approx.)', source: 'Approx. figures — check before use', format: { suffix: '%' }, params: { percent: true } });

  // ---- Compare ----
  P({ id: 'compare-india-china', name: 'India vs China (butterfly)', chart: 'compare', theme: 'dark', lang: 'en', duration: 8,
    csv: 'metric,India,China,unit,prefix\n#flag,in,cn\n#color,#FF9933,#E5383B\nGDP,3.55,17.79,trillion,$\nPopulation,142.9,141.0,crore,\nIncome per person,2480,12600,,$\nArea,32.9,96.0,lakh km²,\nMilitary budget,83.6,296,billion,$',
    title: 'India vs China', subtitle: 'Key numbers, 2023', source: 'Sources: IMF, UN, SIPRI (rounded)', format: {}, params: { build: 4 } });
  P({ id: 'compare-hi-paper', name: 'भारत बनाम पाकिस्तान (paper)', chart: 'compare', theme: 'paper', lang: 'hi', duration: 7,
    csv: 'पैमाना,भारत,पाकिस्तान,unit\n#flag,in,pk\nआबादी,142.9,24.0,करोड़\nGDP,3550,338,अरब डॉलर\nसाक्षरता,77,59,%',
    title: 'भारत बनाम पाकिस्तान', subtitle: 'कुछ अहम आंकड़े (approx.)', source: 'Approx. figures — check before use', format: {}, params: {} });
  P({ id: 'versus-gdp', name: 'Versus columns (5× badge)', chart: 'versus', theme: 'dark', lang: 'en', duration: 6,
    csv: 'country,GDP,flag,color\nIndia,3.55,in,#FF9933\nChina,17.79,cn,#E5383B',
    title: 'How big is the gap?', subtitle: 'GDP 2023, trillion US$', source: 'Source: IMF (rounded)', format: { prefix: '$', unit: 'T', decimals: 2 }, params: {} });
  P({ id: 'versus-neighbours-neon', name: 'Versus ×3 (neon)', chart: 'versus', theme: 'neon', lang: 'en', duration: 6,
    csv: 'country,Income per person,flag\nIndia,2480,in\nPakistan,1370,pk\nBangladesh,2530,bd',
    title: 'INCOME PER PERSON', subtitle: 'US$, 2023 (approx.)', source: 'Approx. figures — check before use', format: { prefix: '$' }, params: {} });

  // ---- Pie & donut ----
  P({ id: 'donut-budget-hi', name: 'रुपया कहाँ से आता है (donut)', chart: 'donut', theme: 'paper', lang: 'hi', duration: 7,
    csv: 'स्रोत,पैसे\nउधार,27\nआयकर,19\nGST,18\nकॉर्पोरेट टैक्स,17\nगैर-कर आय,9\nएक्साइज़,5\nकस्टम,4\nअन्य,1',
    title: 'सरकार का हर रुपया कहाँ से आता है', subtitle: 'बजट 2024-25, पैसे प्रति रुपया', source: 'स्रोत: केंद्रीय बजट 2024-25',
    format: { suffix: ' पैसे' }, params: { labels: 'legend', show: 'percent', centerLabel: 'हर ₹1' }, highlight: 'उधार', highlightAt: 4.6 });
  P({ id: 'pie-rain', name: 'Pie that fills (dark)', chart: 'pie', theme: 'dark', lang: 'en', duration: 6,
    csv: 'season,rain\nMonsoon (Jun–Sep),75\nPost-monsoon (Oct–Dec),11\nPre-monsoon (Mar–May),11\nWinter (Jan–Feb),3',
    title: "Where India's rain comes from", subtitle: 'Share of yearly rainfall (approx.)', source: 'Approx. — IMD long-period average', format: { suffix: '%' }, params: {} });
  P({ id: 'donut-neon', name: 'Donut (neon, legend)', chart: 'donut', theme: 'neon', lang: 'en', duration: 6,
    csv: 'phone,share\nAndroid,95.2\niOS,4.0\nOther,0.8',
    title: 'PHONES IN INDIA', subtitle: 'Market share, % (sample)', source: 'Sample data', format: { suffix: '%', decimals: 1 }, params: { labels: 'legend', centerLabel: 'Phones' } });

  // ---- Counters ----
  P({ id: 'counter-budget-hi', name: '₹48 लाख करोड़ (counter, Hindi)', chart: 'counter', theme: 'dark', lang: 'hi', duration: 5,
    csv: 'label,value,note\nकेंद्र सरकार का कुल खर्च,48210000000000,बजट 2024-25',
    title: '', subtitle: '', source: 'स्रोत: केंद्रीय बजट 2024-25', format: { prefix: '₹', auto: 'indian', decimals: 2 }, params: {} });
  P({ id: 'counter-trio', name: 'Three counters (mixed units)', chart: 'counter', theme: 'dark', lang: 'en', duration: 5,
    csv: 'label,value,prefix,unit,suffix\nPeople,142.86,,crore,\nEconomy,3.55,$,trillion,\nLiteracy,74,,,%',
    title: 'India in three numbers', subtitle: '', source: 'Sources: UN, IMF, Census 2011', format: {}, params: { build: 2.4 } });
  P({ id: 'counter-neon', name: 'Counter (neon, from→to)', chart: 'counter', theme: 'neon', lang: 'en', duration: 5,
    csv: 'label,to,from\nForex reserves,700,304', title: '', source: 'Sample data — replace with RBI figures',
    format: { prefix: '$', unit: 'billion' }, params: { fromCol: true } });
  P({ id: 'counter-paper-intl', name: 'Counter (paper, auto billion)', chart: 'counter', theme: 'paper', lang: 'en', duration: 5,
    csv: 'label,value\nPeople online in India,881000000', title: '', source: 'Sample data', format: { auto: 'intl', unitStyle: 'word' }, params: {} });

  // ---- Icon arrays ----
  P({ id: 'units-ages', name: 'Out of 100 Indians (icons)', chart: 'units', theme: 'dark', lang: 'en', duration: 6,
    csv: 'group,people,icon,color\nChildren (0-14),25,child,#3fb6c6\nWorking age (15-64),68,person,#f2a93b\nElderly (65+),7,person,#ef6b5b',
    title: 'Out of every 100 Indians', subtitle: 'By age group (approx.)', source: 'Approx. — UN WPP', format: {}, params: { per: 1, cols: 20, legendText: '= 1 person' } });
  P({ id: 'units-lakh-hi', name: '1 icon = 1 lakh (Hindi, side by side)', chart: 'units', theme: 'paper', lang: 'hi', duration: 6,
    csv: 'शहर,लोग\nशहर A,23.5\nशहर B,12.2\nशहर C,6.8', title: 'हर आइकन = 1 लाख लोग', subtitle: '(sample)', source: 'Sample data',
    format: { unit: 'लाख' }, params: { per: 1, layout: 'side by side', legendText: '= 1 लाख लोग' } });

  // ---- Scale ----
  P({ id: 'scale-economies', name: 'Scale circles (GDP)', chart: 'scale', theme: 'dark', lang: 'en', duration: 6,
    csv: 'country,GDP,color\nUnited States,27.36,#7c8cff\nChina,17.79,#ef6b5b\nIndia,3.55,#f2a93b\nPakistan,0.34,#5cc489',
    title: 'Size of economies', subtitle: 'GDP 2023, trillion US$ — circle area = size', source: 'Source: IMF (rounded)', format: { prefix: '$', unit: 'T', decimals: 2 }, params: {} });
  P({ id: 'scale-nested', name: 'Nested circles (paper)', chart: 'scale', theme: 'paper', lang: 'en', duration: 6,
    csv: 'country,GDP\nUnited States,27.36\nChina,17.79\nIndia,3.55\nPakistan,0.34',
    title: 'One inside the other', subtitle: 'GDP 2023, trillion US$', source: 'Source: IMF (rounded)', format: { prefix: '$', unit: 'T', decimals: 2 }, params: { shape: 'nested circles' } });
  P({ id: 'scale-area-squares', name: 'Area squares (neon)', chart: 'scale', theme: 'neon', lang: 'en', duration: 6,
    csv: 'country,area\nRussia,171\nUSA,98.3\nChina,96.0\nIndia,32.9\nPakistan,8.8\nSri Lanka,0.66',
    title: 'HOW BIG IS EACH COUNTRY', subtitle: 'Area, lakh km²', source: 'Source: UN (rounded)', format: { unit: 'lakh km²' }, params: { shape: 'squares' } });

  // ---- Rankings ----
  P({ id: 'ranking-population', name: 'Top 10 countdown (flags)', chart: 'ranking', theme: 'dark', lang: 'en', duration: 8, csv: TOP_POP,
    title: 'Most populous countries', subtitle: '2023, crore people', source: 'Source: UN WPP 2022 (rounded)', format: crore, params: { build: 5 }, highlight: 'India', highlightAt: 6.4 });
  P({ id: 'ranking-paper-hi', name: 'रैंकिंग (paper, Hindi)', chart: 'ranking', theme: 'paper', lang: 'hi', duration: 7,
    csv: 'देश,GDP,flag\nअमेरिका,27.36,us\nचीन,17.79,cn\nजर्मनी,4.46,de\nजापान,4.21,jp\nभारत,3.55,in\nब्रिटेन,3.34,gb',
    title: 'दुनिया की सबसे बड़ी अर्थव्यवस्थाएं', subtitle: 'GDP 2023, ट्रिलियन डॉलर', source: 'स्रोत: IMF (rounded)', format: { prefix: '$', unit: 'ट्रिलियन', decimals: 2 },
    params: { order: 'top first', build: 3.6 }, highlight: 'भारत', highlightAt: 4.8 });
  P({ id: 'flagrows-neighbours', name: 'Flag + value rows (neighbours)', chart: 'flagrows', theme: 'dark', lang: 'en', duration: 6,
    csv: 'country,population,flag,note\nPakistan,24.0,pk,Islamabad\nBangladesh,17.3,bd,Dhaka\nMyanmar,5.4,mm,Naypyidaw\nNepal,3.0,np,Kathmandu\nSri Lanka,2.2,lk,Colombo\nBhutan,0.08,bt,Thimphu',
    title: "India's neighbours", subtitle: 'Population, crore', source: 'Source: UN WPP (rounded)', format: crore, params: { build: 3 } });
  P({ id: 'flagrows-neon', name: 'Flag rows (neon, sorted)', chart: 'flagrows', theme: 'neon', lang: 'en', duration: 6,
    csv: 'country,spending,flag\nUSA,916,us\nChina,296,cn\nRussia,109,ru\nIndia,83.6,in\nSaudi Arabia,75.8,sa', title: 'MILITARY SPENDING', subtitle: 'Billion US$, 2023', source: 'Source: SIPRI (rounded)',
    format: { prefix: '$', unit: 'B' }, params: { sort: 'desc' } });

  // ---- Scatter ----
  P({ id: 'scatter-wealth-health', name: 'Bubble: wealth vs health', chart: 'scatter', theme: 'dark', lang: 'en', duration: 7,
    csv: 'country,x,y,size,group\nIndia,2.5,67.7,143,Asia\nChina,12.6,78.6,142,Asia\nUSA,81.7,77.5,34,Americas\nJapan,33.8,84.7,12.4,Asia\nPakistan,1.4,66.4,24,Asia\nBangladesh,2.5,72.4,17.3,Asia\nBrazil,10.0,73.4,21.6,Americas\nNigeria,1.6,53.6,22.4,Africa\nGermany,52.7,81.4,8.4,Europe\nIndonesia,4.9,71.0,27.8,Asia',
    title: 'Richer countries live longer', subtitle: 'Bubble size = population', source: 'Approx. figures (World Bank) — check before use', format: {},
    params: { xTitle: 'Income per person (thousand US$)', yTitle: 'Life expectancy (years)', zero: false, build: 3.4 }, highlight: 'India', highlightAt: 4.2 });
  P({ id: 'scatter-paper', name: 'Scatter dots (paper)', chart: 'scatter', theme: 'paper', lang: 'en', duration: 6,
    csv: 'state,x,y\nKerala,94,1.8\nTamil Nadu,80,1.4\nMaharashtra,82,1.7\nGujarat,78,1.9\nPunjab,76,1.6\nUttar Pradesh,68,2.4\nBihar,62,3.0\nRajasthan,67,2.0',
    title: 'Literacy vs children per woman', subtitle: 'States (sample)', source: 'Sample data', format: {}, params: { bubbles: false, labels: 'all', xTitle: 'Literacy %', yTitle: 'Children per woman', zero: false } });

  // ---- Gauges ----
  P({ id: 'gauge-literacy', name: 'Semicircle gauge', chart: 'gauge', theme: 'dark', lang: 'en', duration: 5,
    csv: 'label,value\nLiteracy rate,74', title: 'Literacy in India', subtitle: 'Census 2011', source: 'Source: Census of India 2011', format: { suffix: '%' }, params: { style: 'semicircle' } });
  P({ id: 'gauge-rings-hi', name: 'साक्षरता रिंग्स (Hindi)', chart: 'gauge', theme: 'paper', lang: 'hi', duration: 5,
    csv: 'वर्ग,दर\nपुरुष,82.1\nमहिला,65.5\nकुल,74.0', title: 'साक्षरता: पुरुष और महिला', subtitle: 'जनगणना 2011', source: 'स्रोत: भारत की जनगणना 2011', format: { suffix: '%', decimals: 1 }, params: { style: 'ring', stagger: 0.4 } });
  P({ id: 'gauge-bars-neon', name: 'Progress bars (neon)', chart: 'gauge', theme: 'neon', lang: 'en', duration: 5,
    csv: 'goal,done,target\nHomes with power,99,100\nTap water,78,100\nBank accounts,52,60', title: 'PROGRESS', subtitle: 'Sample targets', source: 'Sample data',
    format: {}, params: { style: 'bar' } });

  // ---- Tables ----
  P({ id: 'table-economies', name: 'Table builds (flags)', chart: 'table', theme: 'dark', lang: 'en', duration: 7,
    csv: 'Country,GDP ($T),Growth (%),flag\nUnited States,27.36,2.5,us\nChina,17.79,5.2,cn\nGermany,4.46,-0.3,de\nJapan,4.21,1.9,jp\nIndia,3.55,8.2,in\nUnited Kingdom,3.34,0.1,gb',
    title: 'Top economies, 2023', subtitle: '', source: 'Source: IMF (rounded)', format: { decimals: 'auto' }, params: {}, highlight: 'India', highlightAt: 5 });
  P({ id: 'table-hi-paper', name: 'तालिका (paper, Hindi)', chart: 'table', theme: 'paper', lang: 'hi', duration: 7,
    csv: 'राज्य,राजधानी,आबादी (करोड़)\nउत्तर प्रदेश,लखनऊ,19.98\nमहाराष्ट्र,मुंबई,11.24\nबिहार,पटना,10.41\nपश्चिम बंगाल,कोलकाता,9.13',
    title: 'बड़े राज्य', subtitle: 'जनगणना 2011', source: 'स्रोत: जनगणना 2011', format: {}, params: {} });
})();
