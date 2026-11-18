window.DC = window.DC || {};
(function () {
  'use strict';
  // All coordinates are vector units (flag height = 1). No bitmap caches.
  var W = '#FFFFFF', R = '#CE1126', B = '#003087', G = '#00843D', Y = '#FEDD00';
  var entries = [
    ['in','India','भारत',1.5],['cn','China','चीन',1.5],['us','United States','अमेरिका',1.9],
    ['pk','Pakistan','पाकिस्तान',1.5],['bd','Bangladesh','बांग्लादेश',5/3],['np','Nepal','नेपाल',.82034],
    ['lk','Sri Lanka','श्रीलंका',2],['bt','Bhutan','भूटान',1.5],['mm','Myanmar','म्यांमार',1.5],
    ['af','Afghanistan','अफ़ग़ानिस्तान',2],['mv','Maldives','मालदीव',1.5],['jp','Japan','जापान',1.5],
    ['kr','South Korea','दक्षिण कोरिया',1.5],['kp','North Korea','उत्तर कोरिया',2],['tw','Taiwan','ताइवान',1.5],
    ['ru','Russia','रूस',1.5],['gb','United Kingdom','ब्रिटेन',2],['fr','France','फ़्रांस',1.5],
    ['de','Germany','जर्मनी',5/3],['it','Italy','इटली',1.5],['es','Spain','स्पेन',1.5],
    ['pt','Portugal','पुर्तगाल',1.5],['nl','Netherlands','नीदरलैंड',1.5],['ch','Switzerland','स्विट्ज़रलैंड',1],
    ['se','Sweden','स्वीडन',1.6],['no','Norway','नॉर्वे',22/16],['pl','Poland','पोलैंड',1.6],
    ['ua','Ukraine','यूक्रेन',1.5],['tr','Turkey','तुर्की',1.5],['ca','Canada','कनाडा',2],
    ['au','Australia','ऑस्ट्रेलिया',2],['nz','New Zealand','न्यूज़ीलैंड',2],['br','Brazil','ब्राज़ील',10/7],
    ['mx','Mexico','मेक्सिको',7/4],['ar','Argentina','अर्जेंटीना',1.6],['id','Indonesia','इंडोनेशिया',1.5],
    ['my','Malaysia','मलेशिया',2],['th','Thailand','थाईलैंड',1.5],['vn','Vietnam','वियतनाम',1.5],
    ['ph','Philippines','फ़िलीपींस',2],['sg','Singapore','सिंगापुर',1.5],['sa','Saudi Arabia','सऊदी अरब',1.5],
    ['ae','United Arab Emirates','संयुक्त अरब अमीरात',2],['qa','Qatar','क़तर',28/11],['ir','Iran','ईरान',7/4],
    ['iq','Iraq','इराक',1.5],['il','Israel','इज़राइल',22/16],['eg','Egypt','मिस्र',1.5],
    ['za','South Africa','दक्षिण अफ़्रीका',1.5],['ng','Nigeria','नाइजीरिया',2],['ke','Kenya','केन्या',1.5],
    ['eu','European Union','यूरोपीय संघ',1.5],['un','United Nations','संयुक्त राष्ट्र',1.5]
  ];
  var lookup = Object.create(null), ratios = Object.create(null), painters = Object.create(null);
  entries.forEach(function(e) { ratios[e[0]]=e[3]; [e[0],e[1],e[2]].forEach(function(k){lookup[k.toLowerCase()]=e[0];}); });
  var aliases = {
    usa:'us','u.s.':'us','u.s.a.':'us',america:'us','united states of america':'us',uk:'gb','u.k.':'gb',britain:'gb','great britain':'gb',
    bharat:'in',hindustan:'in','people\'s republic of china':'cn',prc:'cn',burma:'mm',korea:'kr','republic of korea':'kr',dprk:'kp',
    uae:'ae',emirates:'ae',turkiye:'tr','türkiye':'tr',ceylon:'lk','sri lanka':'lk','east timor':'tl',
    'european union':'eu','united nations':'un','ivory coast':'ci','afghanistan (islamic emirate)':'af','अफगानिस्तान':'af'
  };
  Object.keys(aliases).forEach(function(k){if(ratios[aliases[k]])lookup[k]=aliases[k];});
  function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);}
  function poly(c,p,col){c.fillStyle=col;c.beginPath();c.moveTo(p[0],p[1]);for(var i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.closePath();c.fill();}
  function disc(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  function line(c,p,col,width){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(p[0],p[1]);for(var i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.stroke();}
  var stars = Object.create(null), placedStars = Object.create(null);
  function starPath(n){if(stars[n])return stars[n];var p=new Path2D();for(var i=0;i<n*2;i++){var a=-Math.PI/2+i*Math.PI/n,r=i%2?.382:1;if(!i)p.moveTo(Math.cos(a)*r,Math.sin(a)*r);else p.lineTo(Math.cos(a)*r,Math.sin(a)*r);}p.closePath();stars[n]=p;return p;}
  [5,7,12,14,24].forEach(starPath);
  function star(c,x,y,r,col,n,rotation){
    n=n||5;rotation=rotation||0;var key=[x,y,r,n,rotation].join('|'),path=placedStars[key];
    // Cache transformed vectors too: avoid 27–50 canvas transform stacks per flag.
    if(!path){path=new Path2D();var co=Math.cos(rotation)*r,si=Math.sin(rotation)*r;path.addPath(starPath(n),new DOMMatrix([co,si,-si,co,x,y]));placedStars[key]=path;}
    c.fillStyle=col;c.fill(path);
  }
  function bands(c,w,colors,weights,vertical){var sum=weights?weights.reduce(function(a,b){return a+b;},0):colors.length,pos=0;colors.forEach(function(col,i){var d=(weights?weights[i]:1)/sum;if(vertical)rect(c,pos*w,0,d*w,1,col);else rect(c,0,pos,w,d,col);pos+=d;});}
  function crescent(c,x,y,r,col,background,dx,dy,inner){disc(c,x,y,r,col);disc(c,x+dx,y+dy,inner||r*.82,background);}
  function cross(c,x,y,w,h,t,col){rect(c,x-t/2,y-h/2,t,h,col);rect(c,x-w/2,y-t/2,w,t,col);}
  function nordic(c,w,bg,outer,inner){rect(c,0,0,w,1,bg);var x=w*7/22;cross(c,x,.5,w*2,2,.25,outer);if(inner)cross(c,x,.5,w*2,2,.125,inner);}
  function union(c,w,h){
    c.save();c.beginPath();c.rect(0,0,w,h);c.clip();rect(c,0,0,w,h,'#012169');
    line(c,[0,0,w,h],W,h*.2);line(c,[0,h,w,0],W,h*.2);
    // Red diagonals lie on opposite sides of each white saltire arm.
    poly(c,[0,0,w/2,h/2,w/2,h/2-h/15,0,-h/15],'#C8102E');
    poly(c,[w/2,h/2,w,h,w,h+h/15,w/2,h/2+h/15],'#C8102E');
    poly(c,[0,h,w/2,h/2,w/2,h/2-h/15,0,h-h/15],'#C8102E');
    poly(c,[w/2,h/2,w,0,w,h/15,w/2,h/2+h/15],'#C8102E');
    rect(c,w*.4,0,w*.2,h,W);rect(c,0,h/3,w,h/3,W);rect(c,w*.44,0,w*.12,h,'#C8102E');rect(c,0,h*.4,w,h*.2,'#C8102E');c.restore();
  }
  function emblem(c,x,y,s,col){ // Compact heraldic eagle/crown silhouette.
    poly(c,[x,y-s*.48,x+s*.16,y-s*.18,x+s*.5,y-s*.34,x+s*.36,y+s*.13,x+s*.16,y+s*.06,x+s*.2,y+s*.44,x-s*.2,y+s*.44,x-s*.16,y+s*.06,x-s*.36,y+s*.13,x-s*.5,y-s*.34,x-s*.16,y-s*.18],col);
  }
  function scriptMark(c,x,y,w,col){ // Abstract calligraphic rhythm, intentionally not readable text.
    c.save();c.strokeStyle=col;c.lineWidth=.027;c.lineCap='round';c.lineJoin='round';c.beginPath();
    for(var i=0;i<9;i++){var xx=x+i*w/9;c.moveTo(xx,y-.08*(i%3===0?1:.5));c.lineTo(xx,y+.035);c.quadraticCurveTo(xx+w/18,y+.08,xx+w/9,y+.015);}
    c.stroke();c.restore();
  }
  painters.in=function(c,w){bands(c,w,['#FF9933',W,'#138808']);var x=w/2,y=.5,r=.125;c.strokeStyle='#000080';c.lineWidth=.011;c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.stroke();c.lineWidth=.005;c.beginPath();for(var i=0;i<24;i++){var a=i*Math.PI/12;c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.stroke();disc(c,x,y,.016,'#000080');};
  painters.cn=function(c,w){rect(c,0,0,w,1,'#EE1C25');star(c,.25,.25,.15,'#FFFF00');[[.5,.1],[.6,.2],[.6,.35],[.5,.45]].forEach(function(p){star(c,p[0],p[1],.05,'#FFFF00',5,Math.atan2(.25-p[1],.25-p[0])+Math.PI/2);});};
  painters.us=function(c,w){bands(c,w,Array.from({length:13},function(_,i){return i%2?W:'#B31942';}));var cw=.76,ch=7/13;rect(c,0,0,cw,ch,'#0A3161');for(var row=0;row<9;row++){var count=row%2?5:6;for(var j=0;j<count;j++)star(c,(j+(row%2?1:.5))*cw/6,(row+1)*ch/10,.022,W);}};
  painters.pk=function(c,w){rect(c,0,0,w,1,'#01411C');rect(c,0,0,w/4,1,W);crescent(c,w*.61,.48,.30,W,'#01411C',.064,-.055,.259);star(c,w*.695,.32,.115,W,5,.43);};
  painters.bd=function(c,w){rect(c,0,0,w,1,'#006A4E');disc(c,w*.45,.5,.3333,'#F42A41');};
  painters.np=function(c){poly(c,[0,0,.70,.48,.29,.48,.82034,1,0,1],'#003893');poly(c,[.035,.066,.601,.445,.225,.445,.752,.965,.035,.965],'#DC143C');crescent(c,.225,.303,.12,W,'#DC143C',0,-.054,.112);star(c,.225,.337,.063,W,12);star(c,.239,.737,.132,W,12);};
  painters.lk=function(c,w){rect(c,0,0,w,1,'#FFBE29');rect(c,.06,.065,.27,.87,'#00534E');rect(c,.33,.065,.27,.87,'#EB7400');rect(c,.66,.065,w-.72,.87,'#8D153A');var col='#FFBE29';poly(c,[1.02,.45,1.13,.35,1.38,.39,1.52,.32,1.56,.44,1.45,.51,1.43,.65,1.28,.65,1.24,.54,1.12,.55,1.09,.72,.99,.72,1.02,.52],col);disc(c,1.49,.31,.082,col);line(c,[1.06,.44,.90,.31,.91,.23,1.01,.24],col,.045);line(c,[1.55,.46,1.68,.39,1.68,.20],col,.035);poly(c,[1.64,.21,1.68,.12,1.72,.21],col);[[.75,.15],[1.84,.15],[.75,.85],[1.84,.85]].forEach(function(p){poly(c,[p[0],p[1]-.04,p[0]+.035,p[1],p[0],p[1]+.04,p[0]-.035,p[1]],col);});};
  painters.bt=function(c,w){rect(c,0,0,w,1,'#FFCC00');poly(c,[0,1,w,0,w,1],'#FF4E12');c.save();c.translate(w/2,.5);c.rotate(-.48);line(c,[-.48,.06,-.33,-.06,-.18,.06,0,-.05,.18,.04,.34,-.04,.48,0],W,.085);emblem(c,.46,-.04,.18,W);for(var i=-1;i<=1;i+=2){line(c,[i*.21,0,i*.30,.19,i*.4,.16],W,.035);line(c,[i*.12,0,i*.13,-.15,i*.26,-.19],W,.035);}c.restore();};
  painters.mm=function(c,w){bands(c,w,['#FECB00','#34B233','#EA2839']);star(c,w/2,.5,.36,W);};
  // Current white Islamic Emirate banner; calligraphy is abstracted, not text.
  painters.af=function(c,w){rect(c,0,0,w,1,W);scriptMark(c,w*.23,.48,w*.54,'#111111');line(c,[w*.3,.64,w*.70,.64],'#111111',.025);};
  painters.mv=function(c,w){rect(c,0,0,w,1,'#D21034');rect(c,.25,.2,w-.5,.6,'#007E3A');crescent(c,w*.53,.5,.21,W,'#007E3A',.08,0,.21);};
  painters.jp=function(c,w){rect(c,0,0,w,1,W);disc(c,w/2,.5,.3,'#BC002D');};
  painters.kr=function(c,w){rect(c,0,0,w,1,W);c.save();c.translate(w/2,.5);c.rotate(.588);disc(c,0,0,.25,'#CD2E3A');c.fillStyle='#0047A0';c.beginPath();c.arc(0,0,.25,0,Math.PI);c.fill();disc(c,-.125,0,.125,'#CD2E3A');disc(c,.125,0,.125,'#0047A0');c.restore();
    // Geon upper left (3 whole), gon lower right (3 broken), gam upper right, ri lower left.
    [[-.48,-.29,-.98,[0,0,0]],[.48,.29,-.98,[1,1,1]],[.48,-.29,.98,[1,0,1]],[-.48,.29,.98,[0,1,0]]].forEach(function(t){c.save();c.translate(w/2+t[0],.5+t[1]);c.rotate(t[2]);for(var i=0;i<3;i++){var yy=(i-1)*.052-.018;if(t[3][i]){rect(c,-.125,yy,.105,.035,'#000');rect(c,.02,yy,.105,.035,'#000');}else rect(c,-.125,yy,.25,.035,'#000');}c.restore();});};
  painters.kp=function(c,w){bands(c,w,['#024FA2',W,'#ED1C27',W,'#024FA2'],[.16,.03,.62,.03,.16]);disc(c,.59,.5,.24,W);star(c,.59,.5,.225,'#ED1C27');};
  painters.tw=function(c,w){rect(c,0,0,w,1,'#FE0000');rect(c,0,0,w/2,.5,'#000095');star(c,w/4,.25,.19,W,12);disc(c,w/4,.25,.112,'#000095');disc(c,w/4,.25,.095,W);};
  painters.ru=function(c,w){bands(c,w,[W,'#0039A6','#D52B1E']);};
  painters.gb=function(c,w){union(c,w,1);};
  painters.fr=function(c,w){bands(c,w,['#000091',W,'#E1000F'],null,true);};
  painters.de=function(c,w){bands(c,w,['#000000','#DD0000','#FFCC00']);};
  painters.it=function(c,w){bands(c,w,['#009246',W,'#CE2B37'],null,true);};
  painters.es=function(c,w){bands(c,w,['#AA151B','#F1BF00','#AA151B'],[1,2,1]);rect(c,.38,.38,.19,.23,'#AA151B');rect(c,.40,.39,.065,.10,W);cross(c,.43,.44,.055,.085,.018,'#AA151B');rect(c,.49,.49,.06,.10,'#F1BF00');poly(c,[.38,.37,.36,.31,.43,.33,.48,.29,.52,.33,.59,.31,.57,.37],'#AA151B');line(c,[.32,.4,.32,.63],W,.028);line(c,[.63,.4,.63,.63],W,.028);};
  painters.pt=function(c,w){bands(c,w,['#006600','#FF0000'],[2,3],true);disc(c,w*.4,.5,.23,'#FFCC00');c.strokeStyle='#A47700';c.lineWidth=.014;c.beginPath();c.ellipse(w*.4,.5,.21,.09,.45,0,2*Math.PI);c.ellipse(w*.4,.5,.09,.21,0,0,2*Math.PI);c.stroke();poly(c,[w*.4-.12,.32,w*.4+.12,.32,w*.4+.12,.56,w*.4,.68,w*.4-.12,.56],'#D40000');poly(c,[w*.4-.085,.36,w*.4+.085,.36,w*.4+.085,.55,w*.4,.62,w*.4-.085,.55],W);[[0,0],[-.045,-.055],[.045,-.055],[0,-.1],[0,.055]].forEach(function(p){rect(c,w*.4+p[0]-.014,.48+p[1],.028,.035,'#003399');});};
  painters.nl=function(c,w){bands(c,w,['#AE1C28',W,'#21468B']);};
  painters.ch=function(c,w){rect(c,0,0,w,1,'#DA291C');cross(c,w/2,.5,.625,.625,.1875,W);};
  painters.se=function(c,w){nordic(c,w,'#006AA7','#FECC02');};
  painters.no=function(c,w){nordic(c,w,'#BA0C2F',W,'#00205B');};
  painters.pl=function(c,w){bands(c,w,[W,'#DC143C']);};
  painters.ua=function(c,w){bands(c,w,['#0057B7','#FFDD00']);};
  painters.tr=function(c,w){rect(c,0,0,w,1,'#E30A17');crescent(c,.57,.5,.25,W,'#E30A17',.06,0,.2);star(c,.91,.5,.125,W,5,Math.PI/2);};
  painters.ca=function(c,w){bands(c,w,['#D80621',W,'#D80621'],[1,2,1],true);var p=[0,-.37,.065,-.23,.13,-.28,.12,-.08,.23,-.17,.255,-.09,.36,-.11,.325,.04,.40,.07,.18,.25,.20,.31,.035,.285,.04,.41,-.04,.41,-.035,.285,-.20,.31,-.18,.25,-.40,.07,-.325,.04,-.36,-.11,-.255,-.09,-.23,-.17,-.12,-.08,-.13,-.28,-.065,-.23];poly(c,p.map(function(v,i){return v+(i%2?.48:w/2);}), '#D80621');};
  painters.au=function(c,w){rect(c,0,0,w,1,'#012169');union(c,w/2,.5);star(c,.5,.75,.15,W,7);[[1.5,.20,.075],[1.25,.44,.075],[1.72,.40,.075],[1.5,.80,.075]].forEach(function(p){star(c,p[0],p[1],p[2],W,7);});star(c,1.62,.57,.042,W);};
  painters.nz=function(c,w){rect(c,0,0,w,1,'#012169');union(c,w/2,.5);[[1.48,.23,.08],[1.22,.45,.07],[1.75,.42,.07],[1.48,.80,.09]].forEach(function(p){star(c,p[0],p[1],p[2],W);star(c,p[0],p[1],p[2]*.70,'#C8102E');});};
  painters.br=function(c,w){rect(c,0,0,w,1,'#009739');poly(c,[w/2,.1,w-.1,.5,w/2,.9,.1,.5],'#FEDD00');disc(c,w/2,.5,.25,'#012169');c.save();c.beginPath();c.arc(w/2,.5,.25,0,2*Math.PI);c.clip();c.strokeStyle=W;c.lineWidth=.034;c.beginPath();c.moveTo(w/2-.31,.43);c.quadraticCurveTo(w/2,.35,w/2+.30,.58);c.stroke();for(var i=0;i<27;i++){var a=i*2.399963,r=.055+.15*Math.sqrt(i/27);star(c,w/2+Math.cos(a)*r,.53+Math.sin(a)*r,.008,W);}c.restore();};
  painters.mx=function(c,w){bands(c,w,['#006847',W,'#CE1126'],null,true);emblem(c,w/2,.48,.23,'#896331');line(c,[w/2-.14,.57,w/2,.66,w/2+.14,.57],'#006847',.025);line(c,[w/2+.02,.43,w/2+.10,.41,w/2+.08,.53],'#006847',.018);};
  painters.ar=function(c,w){bands(c,w,['#74ACDF',W,'#74ACDF']);star(c,w/2,.5,.12,'#F6B40E',24);disc(c,w/2,.5,.065,'#F6B40E');};
  painters.id=function(c,w){bands(c,w,['#FF0000',W]);};
  painters.my=function(c,w){bands(c,w,Array.from({length:14},function(_,i){return i%2?W:'#CC0000';}));rect(c,0,0,1,8/14,'#010066');crescent(c,.40,.28,.205,'#FFCC00','#010066',.055,0,.18);star(c,.65,.28,.14,'#FFCC00',14);};
  painters.th=function(c,w){bands(c,w,['#A51931','#F4F5F8','#2D2A4A','#F4F5F8','#A51931'],[1,1,2,1,1]);};
  painters.vn=function(c,w){rect(c,0,0,w,1,'#DA251D');star(c,w/2,.5,.3,'#FFFF00');};
  painters.ph=function(c,w){bands(c,w,['#0038A8','#CE1126']);poly(c,[0,0,.866,.5,0,1],W);star(c,.31,.5,.12,'#FCD116',8);disc(c,.31,.5,.065,'#FCD116');[[.08,.13],[.08,.87],[.70,.5]].forEach(function(p){star(c,p[0],p[1],.045,'#FCD116');});};
  painters.sg=function(c,w){bands(c,w,['#EF3340',W]);crescent(c,.28,.25,.18,W,'#EF3340',.07,0,.165);for(var i=0;i<5;i++){var a=-Math.PI/2+i*2*Math.PI/5;star(c,.48+Math.cos(a)*.102,.25+Math.sin(a)*.102,.043,W);}};
  painters.sa=function(c,w){rect(c,0,0,w,1,'#006C35');scriptMark(c,.30,.43,.90,W);line(c,[.35,.68,1.13,.68,1.18,.65],W,.025);rect(c,.32,.66,.12,.045,W);};
  painters.ae=function(c,w){bands(c,w,['#00732F',W,'#000000']);rect(c,0,0,w/4,1,'#FF0000');};
  painters.qa=function(c,w){rect(c,0,0,w,1,'#8A1538');var p=[0,0,.64,0];for(var i=0;i<9;i++)p.push(.83,(i+.5)/9,.64,(i+1)/9);p.push(0,1);poly(c,p,W);};
  painters.ir=function(c,w){bands(c,w,['#239F40',W,'#DA0000']);for(var i=0;i<11;i++){var x=i*w/11;rect(c,x,.304,w/15,.026,W);rect(c,x,.670,w/15,.026,W);}c.save();c.translate(w/2,.50);c.strokeStyle='#DA0000';c.lineWidth=.026;c.beginPath();c.moveTo(-.13,-.1);c.bezierCurveTo(-.17,.12,-.035,.16,0,.05);c.bezierCurveTo(.035,.16,.17,.12,.13,-.1);c.moveTo(-.06,-.09);c.quadraticCurveTo(-.10,.08,0,.13);c.quadraticCurveTo(.10,.08,.06,-.09);c.moveTo(0,-.15);c.lineTo(0,.16);c.stroke();c.restore();};
  painters.iq=function(c,w){bands(c,w,['#CE1126',W,'#000000']);scriptMark(c,.43,.50,.64,'#007A3D');};
  painters.il=function(c,w){rect(c,0,0,w,1,W);rect(c,0,.094,w,.156,'#0038B8');rect(c,0,.75,w,.156,'#0038B8');var x=w/2;c.strokeStyle='#0038B8';c.lineWidth=.026;[[x,.325,x+.152,.588,x-.152,.588],[x,.675,x-.152,.412,x+.152,.412]].forEach(function(p){c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[2],p[3]);c.lineTo(p[4],p[5]);c.closePath();c.stroke();});};
  painters.eg=function(c,w){bands(c,w,['#CE1126',W,'#000000']);emblem(c,w/2,.5,.24,'#C09300');};
  painters.za=function(c,w){bands(c,w,['#E03C31','#001489']);poly(c,[0,0,.57,.333,w,.333,w,.667,.57,.667,0,1],W);poly(c,[0,.07,.62,.41,.62,.59,0,.93],'#FFB81C');poly(c,[0,.15,.50,.5,0,.85],'#000000');poly(c,[0,0,.61,.4,w,.4,w,.6,.61,.6,0,1,0,.84,.45,.5,0,.16],'#007749');};
  painters.ng=function(c,w){bands(c,w,['#008751',W,'#008751'],null,true);};
  painters.ke=function(c,w){bands(c,w,['#000000',W,'#BB0000',W,'#006600'],[3,0.5,3,0.5,3]);line(c,[w/2-.17,.18,w/2+.17,.82],W,.018);line(c,[w/2+.17,.18,w/2-.17,.82],W,.018);c.fillStyle='#BB0000';c.beginPath();c.ellipse(w/2,.5,.14,.32,0,0,2*Math.PI);c.fill();c.save();c.beginPath();c.ellipse(w/2,.5,.14,.32,0,0,2*Math.PI);c.clip();rect(c,w/2-.14,.17,.055,.66,'#000000');rect(c,w/2+.085,.17,.055,.66,'#000000');rect(c,w/2-.012,.17,.024,.66,W);c.restore();disc(c,w/2,.5,.037,W);};
  painters.eu=function(c,w){rect(c,0,0,w,1,'#003399');for(var i=0;i<12;i++){var a=-Math.PI/2+i*Math.PI/6;star(c,w/2+Math.cos(a)/3,.5+Math.sin(a)/3,.045,'#FFCC00');}};
  painters.un=function(c,w){rect(c,0,0,w,1,'#4B92DB');var x=w/2;c.strokeStyle=W;c.lineWidth=.014;c.beginPath();c.arc(x,.46,.24,0,2*Math.PI);c.ellipse(x,.46,.12,.24,0,0,2*Math.PI);c.ellipse(x,.46,.24,.10,0,0,2*Math.PI);c.moveTo(x-.24,.46);c.lineTo(x+.24,.46);c.moveTo(x,.22);c.lineTo(x,.70);c.stroke();poly(c,[x-.13,.32,x-.04,.29,x+.01,.36,x-.025,.45,x+.04,.49,x+.01,.60,x-.07,.56,x-.09,.43,x-.15,.40],W);for(var side=-1;side<=1;side+=2){for(var i=0;i<7;i++){var a=.1+i*.20,xx=x+side*Math.cos(a)*.33,yy=.47+Math.sin(a)*.33;c.save();c.translate(xx,yy);c.rotate(side*(.8+a));c.fillStyle=W;c.beginPath();c.ellipse(0,0,.045,.016,0,0,2*Math.PI);c.fill();c.restore();}line(c,[x+side*.33,.49,x+side*.28,.68,x+side*.12,.80,x,.83],W,.012);}};
  function outline(c,x,y,w,h,shape,r){c.beginPath();if(shape==='circle')c.arc(x+w/2,y+h/2,Math.min(w,h)/2,0,2*Math.PI);else if(shape==='round'){r=Math.max(0,Math.min(r,w/2,h/2));c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}else c.rect(x,y,w,h);}
  function resolve(value){return typeof value==='string' ? lookup[value.trim().toLowerCase()]||null : null;}
  window.DC.flags={
    list:entries.map(function(e){return {code:e[0],name:e[1],hi:e[2]};}),
    resolve:resolve,
    has:function(code){return resolve(code)!==null;},
    draw:function(c,code,x,y,w,h,opts){
      code=resolve(code);if(!code||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)return false;
      opts=opts||{};var shape=opts.shape||'rect',r=Number.isFinite(opts.radius)?opts.radius:Math.min(w,h)*.12;
      var ratio=ratios[code],scale=Math.max(w/ratio,h);
      c.save();try{c.setLineDash([]);c.lineCap='butt';c.lineJoin='miter';c.miterLimit=10;outline(c,x,y,w,h,shape,r);c.clip();c.save();try{c.translate(x+(w-ratio*scale)/2,y+(h-scale)/2);c.scale(scale,scale);painters[code](c,ratio);}finally{c.restore();}
        if(opts.border){outline(c,x,y,w,h,shape,r);c.strokeStyle=opts.border;c.lineWidth=2*Math.max(1,Math.min(w,h)*.04);c.stroke();}
      }finally{c.restore();}return true;
    }
  };
}());
