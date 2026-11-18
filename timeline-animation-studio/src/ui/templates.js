(() => {
  'use strict';
  const TL = window.TL = window.TL || {};
  const clone = value => JSON.parse(JSON.stringify(value));

  TL.themes = {
    archive: { id:'archive', name:'Warm archive', background:'#e8dfcc', foreground:'#252d2a', accent:'#a64a31', secondary:'#75816b', font:'Georgia', grid:true, texture:0.16 },
    midnight: { id:'midnight', name:'Midnight gold', background:'#101b27', foreground:'#f0ede4', accent:'#e9b55e', secondary:'#7290a7', font:'Georgia', grid:false, texture:0.06 },
    blueprint: { id:'blueprint', name:'Blueprint', background:'#142e48', foreground:'#edf5f9', accent:'#78d5e8', secondary:'#92abc0', font:'Arial', grid:true, texture:0.035 },
    editorial: { id:'editorial', name:'Editorial white', background:'#f4f2ed', foreground:'#202825', accent:'#cf583b', secondary:'#7a918a', font:'Arial', grid:false, texture:0 },
    forest: { id:'forest', name:'Forest journal', background:'#182b24', foreground:'#f0eddf', accent:'#c3d087', secondary:'#809c83', font:'Georgia', grid:false, texture:0.1 },
    neon: { id:'neon', name:'Electric cyan', background:'#101724', foreground:'#edf9fc', accent:'#4ce3d5', secondary:'#7d91e4', font:'Arial', grid:true, texture:0 },
    rose: { id:'rose', name:'Rose & ink', background:'#f0e1dd', foreground:'#332c35', accent:'#a84163', secondary:'#8473a0', font:'Georgia', grid:false, texture:0.055 },
    charcoal: { id:'charcoal', name:'Graphite', background:'#202326', foreground:'#efeee8', accent:'#ed7956', secondary:'#97a09b', font:'Arial', grid:false, texture:0.065 },
    terracotta: { id:'terracotta', name:'Terracotta', background:'#eddfca', foreground:'#47372f', accent:'#ba633d', secondary:'#8c946c', font:'Georgia', grid:false, texture:0.12 },
    monochrome: { id:'monochrome', name:'Print black', background:'#f3f1ea', foreground:'#191c1e', accent:'#24282b', secondary:'#93958f', font:'Arial', grid:true, texture:0.025 },
    ocean: { id:'ocean', name:'Ocean blue', background:'#e5edf0', foreground:'#213746', accent:'#236994', secondary:'#6a9b9e', font:'Arial', grid:false, texture:0.025 },
    parchment: { id:'parchment', name:'Old parchment', background:'#dacaac', foreground:'#3c352a', accent:'#924a2f', secondary:'#857350', font:'Georgia', grid:false, texture:0.24 }
  };

  TL.layouts = [
    { id:'horizontal', name:'Horizontal rail', family:'Documentary', description:'A left-to-right chronological rail with date ticks and event captions. Equal or proportional date spacing.' },
    { id:'alternating', name:'Alternating milestones', family:'Milestones', description:'Event cards alternate above and below a horizontal rail to create room for captions.' },
    { id:'vertical', name:'Vertical history', family:'Vertical', description:'A single vertical spine reveals a story from top to bottom. A natural fit for portrait videos.' },
    { id:'zigzag', name:'Zigzag sequence', family:'Vertical', description:'A vertical sequence places milestones alternately left and right of the center spine.' },
    { id:'serpentine', name:'Winding roadmap', family:'Roadmaps', description:'A connected route folds back across successive rows, following each milestone in sequence.' },
    { id:'circular', name:'Circular orbit', family:'Circular', description:'Milestones sit around a ring; the route draws clockwise through the sequence.' },
    { id:'spiral', name:'Spiral chronology', family:'Circular', description:'A growing spiral draws outward from the first date to reveal an expanding story.' },
    { id:'branching', name:'Branching history', family:'Branching', description:'A shared origin divides into alternate paths. Lane values identify the branches.' },
    { id:'parallel', name:'Parallel tracks', family:'Parallel', description:'Independent event lanes share one chronological axis for side-by-side comparison.' },
    { id:'gantt', name:'Duration bands', family:'Duration', description:'Calendar values and end values define visible duration bars on a shared date scale.' },
    { id:'ticker', name:'Year slider', family:'Counters', description:'A date ruler travels beneath a highlighted current date, with milestones along the rail.' },
    { id:'countdown', name:'Date counter', family:'Counters', description:'A large interpolating date or number anchors the composition as event captions change.' },
    { id:'perspective', name:'Perspective passage', family:'Cinematic', description:'A simulated depth rail places milestones into a receding 2.5D composition.' },
    { id:'photo', name:'Photo timeline', family:'Media', description:'Images and captions accompany each chronological milestone. Replace the original illustrative artwork with your photos.' },
    { id:'archive', name:'Paper archive', family:'Archives', description:'Paper-like dated records form a documentary chronology with warm texture and restrained motion.' },
    { id:'metro', name:'Metro route', family:'Transit', description:'A transit-inspired route connects stations with colored lane assignments and rounded turns.' },
    { id:'staircase', name:'Ascending steps', family:'Roadmaps', description:'Milestones advance along an upward staircase to emphasize progress or development.' },
    { id:'chapters', name:'Chapter strip', family:'Chapters', description:'A sequence of numbered chapter panels progressively reveals an outline or process.' }
  ];

  TL.cameraPresets = [
    { id:'overview', name:'Whole timeline', description:'Keep the full composition in view while the path and events reveal.' },
    { id:'follow', name:'Follow milestones', description:'Travel smoothly toward the active event as the timeline develops.' },
    { id:'push', name:'Slow push in', description:'Move from the complete timeline toward a closer composition.' },
    { id:'pull', name:'Pull back reveal', description:'Start closer and retreat to show the timeline in context.' },
    { id:'drift', name:'Documentary drift', description:'Add a restrained lateral camera move without distracting from the dates.' }
  ];

  TL.eventDefaults = (index = 0) => ({
    date:String(2000 + index * 5), value:2000 + index * 5, endValue:2003 + index * 5,
    title:'New milestone', description:'Write the moment that matters.',
    start:1 + index * 2.6, duration:1.1, lane:0, color:'', media:null,
    icon:'circle', offsetX:0, offsetY:0
  });

  // Each row is [display date, title, description, numeric date?, end date?, lane?].
  // Display labels and numeric values are intentionally independent: BCE dates,
  // clock times, quarters, and chapter numbers need no hidden date parser.
  const space = [
    ['1957','A satellite in orbit','Sputnik 1 becomes the first artificial Earth satellite.'],
    ['1961','The first human flight','Yuri Gagarin completes the first human spaceflight.'],
    ['1969','Footsteps on the Moon','Apollo 11 lands the first humans on the Moon.'],
    ['1998','A station takes shape','The first International Space Station module launches.'],
    ['2021','A new window opens','The James Webb Space Telescope launches.']
  ];
  const field = [
    ['2012','The first survey','A small team maps the questions worth asking.'],
    ['2015','A field station','An old workshop becomes a place to observe.'],
    ['2018','The pattern emerges','Separate records begin to tell a shared story.'],
    ['2021','A wider network','New partners help compare the findings.'],
    ['2025','The next question','The archive becomes a starting point for others.']
  ];
  const product = [
    ['Q1','Discover','Listen, gather evidence, and define a useful problem.',1,2,0],
    ['Q2','Make','Turn the strongest idea into a working prototype.',2,3,1],
    ['Q3','Test','Observe real use and resolve the difficult details.',3,4,2],
    ['Q4','Launch','Release the product and keep learning from use.',4,5,0]
  ];
  const studio = [
    ['2008','A room and an idea','A fictional creative studio opens its first workspace.'],
    ['2011','The first collection','A small series finds its first audience.'],
    ['2016','A shared practice','Designers and makers bring different skills together.'],
    ['2020','A new direction','The team explores a more considered way to work.'],
    ['2025','An open workshop','The next chapter brings the community inside.']
  ];
  const journal = [
    ['DAY 01','Set out','Leave the familiar route and start observing.',1],
    ['DAY 03','Follow the river','Record the details that usually go unnoticed.',3],
    ['DAY 06','A higher viewpoint','Pause and look at how the landscape connects.',6],
    ['DAY 09','The long way home','Bring the observations together in a field journal.',9]
  ];
  const cycle = [
    ['01','Observe','Start with what people actually do.',1],
    ['02','Understand','Find the question behind the first request.',2],
    ['03','Imagine','Explore several ways the answer could take shape.',3],
    ['04','Build','Make the smallest useful version.',4],
    ['05','Reflect','Learn from the result and begin again.',5]
  ];
  const history = [
    ['800 BCE','A first settlement','Illustrative chapter: people gather along the river.',-800],
    ['300 BCE','A trading place','Illustrative chapter: paths become routes of exchange.',-300],
    ['400 CE','A growing town','Illustrative chapter: a public square takes shape.',400],
    ['1100 CE','A regional center','Illustrative chapter: workshops line the main road.',1100],
    ['1800 CE','A changing city','Illustrative chapter: new connections reshape daily life.',1800]
  ];
  const branches = [
    ['2000','A shared beginning','One research question starts the journey.',2000,2001,0],
    ['2005','The northern route','One group studies the mountain watershed.',2005,2008,0],
    ['2005','The southern route','Another group follows the river to the coast.',2005,2008,1],
    ['2012','A new method','The mountain team develops a different approach.',2012,2014,0],
    ['2014','A wider picture','The coastal team adds a new set of observations.',2014,2016,1],
    ['2022','Findings converge','Both routes contribute to a shared archive.',2022,2023,0]
  ];
  const dual = [
    ['2010','Research begins','FIELD / Initial observations are recorded.',2010,2012,0],
    ['2010','Workshop opens','DESIGN / A small prototype team takes shape.',2010,2012,1],
    ['2015','The first study','FIELD / Patterns are tested in several places.',2015,2017,0],
    ['2017','A working model','DESIGN / The prototype reaches a wider audience.',2017,2019,1],
    ['2024','The shared archive','FIELD / Records are prepared for the next study.',2024,2025,0],
    ['2024','An open toolkit','DESIGN / The methods become available to others.',2024,2025,1]
  ];
  const production = [
    ['RESEARCH','Gather the evidence','Read, compare, and record the sources.',0,3,0],
    ['SCRIPT','Find the sequence','Give the evidence a clear narrative order.',2,5,1],
    ['DESIGN','Build the visual world','Create the maps, graphics, and chapter system.',4,8,2],
    ['EDIT','Shape the rhythm','Bring narration and silent visuals together.',7,11,3],
    ['REVIEW','Check every detail','Verify the cut before the final delivery.',10,12,0]
  ];
  const countdown = [
    ['90','A clear brief','Ninety days before an illustrative launch.',90],
    ['60','The first prototype','Sixty days remain to test the central idea.',60],
    ['30','The final review','Thirty days remain to resolve the details.',30],
    ['0','Launch day','The countdown reaches the beginning of the next chapter.',0]
  ];
  const day = [
    ['08:00','Doors open','An illustrative day at the independent design festival.',480],
    ['10:30','Morning session','Ideas, demonstrations, and practical conversations.',630],
    ['13:00','Open workshop','Participants explore the tools together.',780],
    ['16:30','The final conversation','A shared reflection on the work made today.',990],
    ['18:00','Until next time','The festival closes with a new set of questions.',1080]
  ];
  const chapters = [
    ['01','The question','Start with the detail that asks for an explanation.',1],
    ['02','The context','Step back to understand what came before.',2],
    ['03','The evidence','Look closely at the records and compare accounts.',3],
    ['04','The turning point','Find the moment when the pattern changes.',4],
    ['05','What comes next','End with the question the evidence leaves open.',5]
  ];
  const growth = [
    ['STAGE 01','A single seed','An illustrative community garden begins.',1],
    ['STAGE 02','Room to grow','Neighbors add their first shared planting beds.',2],
    ['STAGE 03','A living network','Skills, tools, and seasonal knowledge are exchanged.',3],
    ['STAGE 04','A lasting place','The garden becomes part of the neighborhood.',4]
  ];

  const specifications = [
    { id:'space-age', name:'The space age', family:'Documentary', layout:'horizontal', theme:'archive', title:'A journey beyond Earth', subtitle:'SPACE EXPLORATION / SAMPLE TIMELINE', rows:space, description:'A warm documentary rail with five landmark spaceflight dates.' },
    { id:'clean-chronology', name:'The essential line', family:'Minimal', layout:'horizontal', theme:'editorial', title:'Small beginnings. Lasting ideas.', rows:studio, description:'A restrained editorial rail with equal-spaced milestones.', style:{lineWidth:3,nodeSize:9,showDescriptions:false} },
    { id:'milestone-cards', name:'Milestone cards', family:'Milestones', layout:'alternating', theme:'ocean', title:'From first idea to open doors', rows:studio, description:'Alternating cards give each milestone its own caption space.', style:{cardStyle:'card'} },
    { id:'neon-milestones', name:'Electric milestones', family:'Milestones', layout:'alternating', theme:'neon', title:'Signals of progress', rows:field, description:'A cyan-on-midnight milestone system with crisp technical type.', animation:{reveal:'pop'}, style:{cardStyle:'glass',lineWidth:5,nodeSize:15} },
    { id:'portrait-history', name:'Portrait history', family:'Vertical', layout:'vertical', theme:'archive', title:'A journal of the journey', rows:journal, portrait:true, description:'A four-stop vertical history composed for phone videos.', style:{textScale:1.1} },
    { id:'vertical-field-notes', name:'Field notes', family:'Vertical', layout:'vertical', theme:'forest', title:'A closer look at the landscape', rows:field, description:'A forest-green field journal with a steady descending spine.', camera:'drift', style:{cardStyle:'plain'} },
    { id:'zigzag-story', name:'Two sides of the story', family:'Vertical', layout:'zigzag', theme:'rose', title:'Every turn brings a new idea', rows:studio, description:'Captions switch sides as the story moves down its center spine.' },
    { id:'portrait-zigzag', name:'The portrait sequence', family:'Vertical', layout:'zigzag', theme:'charcoal', title:'Four steps forward', rows:product, portrait:true, description:'A compact portrait sequence with alternating milestones.', animation:{reveal:'slide'} },
    { id:'winding-roadmap', name:'The winding road', family:'Roadmaps', layout:'serpentine', theme:'terracotta', title:'The route from question to answer', rows:[...cycle,['06','Share','Pass the useful findings to the next person.',6]], description:'A six-stop route folds back across the composition.' },
    { id:'launch-route', name:'Road to launch', family:'Roadmaps', layout:'serpentine', theme:'blueprint', title:'One year. Four useful steps.', rows:product, description:'A blueprint route for an illustrative quarterly launch plan.', animation:{reveal:'draw'}, style:{lineWidth:6,nodeSize:15} },
    { id:'orbit-cycle', name:'The learning orbit', family:'Circular', layout:'circular', theme:'midnight', title:'A process that keeps moving', rows:cycle, description:'A gold orbital ring reveals the five stages of a learning cycle.', style:{showDescriptions:false,lineWidth:4} },
    { id:'calendar-ring', name:'A year around the sun', family:'Circular', layout:'circular', theme:'editorial', title:'A year in four chapters', rows:product, description:'A clean circular calendar built around four quarterly milestones.', style:{showDescriptions:false,nodeSize:16}, animation:{reveal:'pop'} },
    { id:'spiral-growth', name:'The expanding story', family:'Circular', layout:'spiral', theme:'forest', title:'An idea grows beyond its beginning', rows:[...growth,['STAGE 05','A new season','A new group brings a fresh set of ideas.',5]], description:'An outward-growing spiral connects five stages of a garden project.', style:{showDescriptions:false} },
    { id:'deep-time-spiral', name:'A spiral through time', family:'Circular', layout:'spiral', theme:'parchment', title:'Layers of a changing place', rows:history, description:'An illustrative long chronology, including BCE and CE display labels.', style:{showDescriptions:false,lineWidth:5}, camera:'pull' },
    { id:'forking-paths', name:'Forking paths', family:'Branching', layout:'branching', theme:'editorial', title:'One beginning. Two directions.', rows:branches, description:'A common origin divides into two illustrative research routes.', style:{showDescriptions:false} },
    { id:'research-tree', name:'The research tree', family:'Branching', layout:'branching', theme:'blueprint', title:'How the questions connect', rows:[['01','The original question','A fictional research program begins.',1,2,0],['02A','Observation','The first team works directly in the field.',2,3,0],['02B','Simulation','The second team develops a working model.',2,3,1],['03A','Evidence','The fieldwork produces a new set of records.',3,4,0],['03B','Prediction','The model offers a testable explanation.',3,4,1],['04','A shared finding','Both teams bring the results together.',4,5,0]], description:'A labeled branching diagram with paired stages and a shared conclusion.', style:{showDescriptions:false,nodeSize:15} },
    { id:'parallel-histories', name:'Parallel histories', family:'Parallel', layout:'parallel', theme:'archive', title:'Two paths through the same years', rows:dual, spacing:'proportional', description:'Two event lanes share a proportional calendar axis.', style:{showDescriptions:false} },
    { id:'three-track-roadmap', name:'Three-track roadmap', family:'Parallel', layout:'parallel', theme:'neon', title:'A plan with room to move', rows:[['Q1','Research','Find the core questions.',1,2,0],['Q1','System','Build a reusable foundation.',1,2,1],['Q2','Prototype','Make the idea tangible.',2,3,2],['Q3','Field test','Compare the design with real use.',3,4,0],['Q3','Refine','Resolve the details that matter.',3,4,1],['Q4','Launch','Bring the work together.',4,5,2]], spacing:'proportional', description:'Three colored tracks distinguish research, system, and delivery milestones.', style:{showDescriptions:false} },
    { id:'production-bands', name:'Production calendar', family:'Duration', layout:'gantt', theme:'editorial', title:'Twelve weeks from research to review', rows:production, spacing:'proportional', description:'Editable start and end values show overlapping production periods.', style:{showDescriptions:false,nodeSize:10} },
    { id:'era-bands', name:'Overlapping eras', family:'Duration', layout:'gantt', theme:'parchment', title:'The layers of an imagined city', rows:[['SETTLEMENT','The riverside period','Illustrative era.',100,340,0],['TRADE','The market period','Illustrative era.',260,610,1],['CRAFT','The workshop period','Illustrative era.',470,790,2],['CONNECTION','The railway period','Illustrative era.',720,1000,3]], spacing:'proportional', description:'Four overlapping bands show that historical periods need not have clean boundaries.', style:{showDescriptions:false} },
    { id:'year-slider', name:'The year slider', family:'Counters', layout:'ticker', theme:'midnight', title:'Watch the years move', rows:space, spacing:'proportional', description:'A moving date ruler highlights landmark years beneath a fixed focus.' },
    { id:'festival-clock', name:'A day on the clock', family:'Counters', layout:'ticker', theme:'monochrome', title:'One day, many perspectives', rows:day, spacing:'proportional', description:'Custom clock labels sit on a proportional minute-based scale.', style:{showDescriptions:false} },
    { id:'launch-countdown', name:'Countdown to launch', family:'Counters', layout:'countdown', theme:'charcoal', title:'The countdown to a new beginning', rows:countdown, direction:'reverse', description:'A large counter moves from ninety toward zero through four preparation milestones.', style:{showDescriptions:true}, animation:{reveal:'fade'} },
    { id:'year-counter', name:'The rolling years', family:'Counters', layout:'countdown', theme:'archive', title:'Sixty-four years of looking up', rows:space, description:'A large date counter moves forward between verified spaceflight milestones.', animation:{reveal:'slide'} },
    { id:'perspective-passage', name:'Through the years', family:'Cinematic', layout:'perspective', theme:'midnight', title:'A passage through changing times', rows:studio, description:'A 2.5D rail recedes into depth as the milestone sequence develops.', camera:'follow', style:{showDescriptions:false} },
    { id:'technical-flythrough', name:'The technical passage', family:'Cinematic', layout:'perspective', theme:'blueprint', title:'From observation to a working system', rows:field, description:'A technical perspective timeline with a restrained camera follow.', camera:'follow', style:{showDescriptions:false,lineWidth:5}, animation:{reveal:'pop'} },
    { id:'photo-memories', name:'A photo history', family:'Media', layout:'photo', theme:'terracotta', title:'The moments that made the studio', rows:studio, description:'Five image-led milestones with editable photos and captions.', style:{cardStyle:'card',showDescriptions:false} },
    { id:'expedition-contact-sheet', name:'Expedition contact sheet', family:'Media', layout:'photo', theme:'charcoal', title:'Notes from the long way home', rows:journal, description:'Four large image panels form a quiet expedition photo chronology.', camera:'drift', style:{cardStyle:'paper',showDescriptions:false} },
    { id:'archive-documents', name:'From the archive', family:'Archives', layout:'archive', theme:'parchment', title:'A record of how it began', rows:field, description:'A paper archive combines date labels, textured records, and restrained reveals.', style:{cardStyle:'paper'}, animation:{reveal:'typewriter'} },
    { id:'editorial-dossier', name:'The editorial dossier', family:'Archives', layout:'archive', theme:'monochrome', title:'Five entries in an open record', rows:studio, description:'A high-contrast documentary dossier with numbered dated records.', style:{cardStyle:'paper',texture:0.07}, camera:'drift', animation:{reveal:'slide'} },
    { id:'metro-milestones', name:'Stations of an idea', family:'Transit', layout:'metro', theme:'ocean', title:'Next stop: something useful', rows:[...cycle,['06','Continue','The next question starts another journey.',6]], description:'A transit-inspired route maps six sequential stages to stations.', style:{showDescriptions:false,lineWidth:7,nodeSize:16} },
    { id:'interchange', name:'The interchange', family:'Transit', layout:'metro', theme:'charcoal', title:'Where separate journeys meet', rows:dual, description:'Two color-coded lane assignments create a shared interchange chronology.', style:{showDescriptions:false,lineWidth:8,nodeSize:16} },
    { id:'steps-of-progress', name:'Steps of progress', family:'Roadmaps', layout:'staircase', theme:'forest', title:'Give a small idea room to grow', rows:growth, description:'Four ascending stages emphasize the development of a community garden.', style:{showDescriptions:false,nodeSize:14} },
    { id:'portrait-ascent', name:'The portrait ascent', family:'Roadmaps', layout:'staircase', theme:'rose', title:'A little further each time', rows:product, portrait:true, description:'A rising four-step route composed for portrait storytelling.', style:{showDescriptions:false,textScale:1.1}, animation:{reveal:'pop'} },
    { id:'documentary-chapters', name:'The documentary outline', family:'Chapters', layout:'chapters', theme:'midnight', title:'An outline for the next explanation', rows:chapters, description:'A numbered chapter strip makes the structure of a documentary visible.', style:{cardStyle:'card',showDescriptions:true} },
    { id:'process-chapters', name:'Four working chapters', family:'Chapters', layout:'chapters', theme:'editorial', title:'A practical way to begin', rows:product, description:'Four bold chapter panels show an illustrative quarterly process.', style:{cardStyle:'plain',showDescriptions:true}, animation:{reveal:'slide'} }
  ];

  function make(spec) {
    const theme = TL.themes[spec.theme];
    const duration = spec.duration || 18;
    const intervals = Math.max(1, spec.rows.length - 1);
    const interval = (duration - 3.4) / intervals;
    const hash = Array.from(spec.id).reduce((n,c) => (Math.imul(n,31) + c.charCodeAt(0)) >>> 0, 17);
    const events = spec.rows.map((row,index) => {
      const numeric = row[3] == null ? Number(row[0]) : row[3];
      const value = Number.isFinite(numeric) ? numeric : index;
      return {
        ...TL.eventDefaults(index),
        id:spec.id + '-event-' + (index + 1), date:String(row[0]),
        value, endValue:row[4] == null ? value + 1 : row[4],
        title:row[1], description:row[2],
        start:+(1 + index * interval).toFixed(3), duration:1.1,
        lane:row[5] == null ? 0 : row[5],
        icon:spec.layout === 'chapters' ? 'square' : 'circle'
      };
    });
    return {
      version:1, kind:'timeline-studio', name:spec.name, title:spec.title,
      subtitle:spec.subtitle || 'ILLUSTRATIVE EXAMPLE / EDIT EVERY DETAIL',
      width:spec.portrait ? 1080 : 1920, height:spec.portrait ? 1920 : 1080,
      fps:30, duration, seed:hash,
      layout:spec.layout, theme:spec.theme, spacing:spec.spacing || 'equal', direction:spec.direction || 'forward',
      style:{
        background:theme.background, foreground:theme.foreground, accent:theme.accent,
        secondary:theme.secondary, font:theme.font, lineWidth:4, nodeSize:12, textScale:1,
        grid:theme.grid, texture:theme.texture, showDates:true, showDescriptions:true,
        showHeader:true, showFooter:true, cardStyle:'plain', ...clone(spec.style || {})
      },
      animation:{reveal:'draw',ease:'cinematic',stagger:+interval.toFixed(3),drawDuration:1.2,hold:1.3,...clone(spec.animation || {})},
      camera:{mode:spec.camera || 'overview',zoom:1,strength:0.4,panX:0,panY:0,rotation:0},
      events, media:{}, customPresets:[]
    };
  }

  TL.templates = specifications.map(spec => ({
    id:spec.id, name:spec.name, family:spec.family, description:spec.description,
    layout:spec.layout, accent:TL.themes[spec.theme].accent,
    make:() => make(spec)
  }));
  TL.makeProject = (id = 'space-age') => {
    const template = TL.templates.find(item => item.id === id);
    if (!template) throw new Error('Unknown timeline template: ' + id);
    return template.make();
  };
})();
