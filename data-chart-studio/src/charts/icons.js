window.DC = window.DC || {};
(function () {
  'use strict';
  // Pictograms use a shared 100-unit square and one prebuilt vector fill each.
  // Counter-clockwise contours make transparent windows, coin centres and badges.
  var definitions=[
    ['person','Person','व्यक्ति'],['man','Man','पुरुष'],['woman','Woman','महिला'],['child','Child','बच्चा'],
    ['family','Family','परिवार'],['student','Student','विद्यार्थी'],['farmer','Farmer','किसान'],
    ['worker','Worker','मज़दूर'],['doctor','Doctor','डॉक्टर'],['house','House','घर'],
    ['factory','Factory','कारखाना'],['rupee','Rupee coin','रुपया'],['dollar','Dollar coin','डॉलर'],
    ['car','Car','कार'],['bus','Bus','बस'],['train','Train','रेल'],['plane','Plane','विमान'],
    ['tree','Tree','पेड़'],['wheat','Wheat','गेहूँ'],['water-drop','Water drop','पानी की बूंद'],
    ['bulb','Bulb','बल्ब'],['phone','Phone','फ़ोन'],['school','School building','विद्यालय'],
    ['hospital','Hospital','अस्पताल'],['soldier-helmet','Soldier helmet','सैनिक का हेलमेट'],
    ['heart','Heart','दिल'],['star','Star','तारा']
  ];
  var paths=Object.create(null),aliases=Object.create(null),p;
  function polygon(a,hole){var q=a.slice();if(hole){q=[];for(var i=a.length-2;i>=0;i-=2)q.push(a[i],a[i+1]);}p.moveTo(q[0],q[1]);for(var j=2;j<q.length;j+=2)p.lineTo(q[j],q[j+1]);p.closePath();}
  function box(x,y,w,h,hole){polygon([x,y,x+w,y,x+w,y+h,x,y+h],hole);}
  function circle(x,y,r,hole){p.moveTo(x+r,y);p.arc(x,y,r,0,Math.PI*2,!!hole);p.closePath();}
  function oval(x,y,rx,ry,angle,hole){p.moveTo(x+Math.cos(angle||0)*rx,y+Math.sin(angle||0)*rx);p.ellipse(x,y,rx,ry,angle||0,0,Math.PI*2,!!hole);p.closePath();}
  function rounded(x,y,w,h,r){p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath();}
  function plus(x,y,s,t,hole){var a=s/2,b=t/2;polygon([x-b,y-a,x+b,y-a,x+b,y-b,x+a,y-b,x+a,y+b,x+b,y+b,x+b,y+a,x-b,y+a,x-b,y+b,x-a,y+b,x-a,y-b,x-b,y-b],hole);}
  function person(x,y,s,dress){circle(x,y+12*s,10*s);if(dress){polygon([x-11*s,y+27*s,x+11*s,y+27*s,x+25*s,y+64*s,x+18*s,y+67*s,x+11*s,y+49*s,x+19*s,y+72*s,x+10*s,y+72*s,x+10*s,y+90*s,x+2*s,y+90*s,x+2*s,y+72*s,x-2*s,y+72*s,x-2*s,y+90*s,x-10*s,y+90*s,x-10*s,y+72*s,x-19*s,y+72*s,x-11*s,y+49*s,x-18*s,y+67*s,x-25*s,y+64*s]);}
    else polygon([x-12*s,y+27*s,x+12*s,y+27*s,x+22*s,y+35*s,x+24*s,y+60*s,x+16*s,y+62*s,x+13*s,y+42*s,x+12*s,y+90*s,x+3*s,y+90*s,x+2*s,y+64*s,x-2*s,y+64*s,x-3*s,y+90*s,x-12*s,y+90*s,x-13*s,y+42*s,x-16*s,y+62*s,x-24*s,y+60*s,x-22*s,y+35*s]);}
  function make(id,build){p=new Path2D();build();paths[id]=p;}
  make('person',function(){person(50,3,1,false);});
  paths.man=paths.person;
  make('woman',function(){person(50,3,1,true);});
  make('child',function(){circle(50,24,13);polygon([37,43,63,43,80,60,73,68,63,58,62,89,53,89,52,72,48,72,47,89,38,89,37,58,27,68,20,60]);});
  make('family',function(){person(25,6,.83,false);person(75,6,.83,true);person(50,42,.54,false);});
  make('student',function(){person(50,16,.85,false);polygon([23,12,50,3,77,12,50,21]);polygon([33,16,50,22,67,16,67,21,50,27,33,21]);box(74,12,4,24);circle(76,37,4);});
  make('farmer',function(){person(46,15,.86,false);rounded(23,15,46,8,3);p.moveTo(31,17);p.quadraticCurveTo(31,1,46,2);p.quadraticCurveTo(61,1,61,17);p.closePath();rounded(77,29,6,64,3);polygon([59,44,78,48,75,55,57,51]);});
  make('worker',function(){person(50,20,.83,false);p.moveTo(33,21);p.arc(50,21,17,Math.PI,Math.PI*2);p.lineTo(67,24);p.lineTo(33,24);p.closePath();rounded(27,21,46,7,3);rounded(47,1,6,19,2);});
  make('doctor',function(){person(50,3,1,false);plus(50,48,16,5,true);});
  make('house',function(){polygon([6,44,50,7,94,44,87,52,81,47,81,91,19,91,19,47,13,52]);box(41,62,18,29,true);box(28,52,12,13,true);box(60,52,12,13,true);});
  make('factory',function(){polygon([8,89,8,46,32,32,32,47,56,32,56,47,73,37,73,89]);polygon([74,89,77,15,89,15,94,89]);box(18,63,12,14,true);box(40,63,12,14,true);box(61,63,10,14,true);p.moveTo(81,9);p.bezierCurveTo(67,9,67,0,55,4);p.bezierCurveTo(46,7,55,18,63,15);p.bezierCurveTo(71,17,80,18,81,9);p.closePath();});
  function coin(){circle(50,50,44);circle(50,50,34,true);}
  make('rupee',function(){coin();box(30,25,42,7);box(30,39,42,7);p.moveTo(43,29);p.lineTo(54,29);p.bezierCurveTo(72,42,61,58,43,58);p.lineTo(66,77);p.lineTo(54,77);p.lineTo(30,56);p.lineTo(30,50);p.lineTo(43,50);p.bezierCurveTo(59,50,59,36,43,32);p.closePath();});
  make('dollar',function(){coin();p.moveTo(66,29);p.bezierCurveTo(39,15,22,38,37,49);p.lineTo(57,58);p.bezierCurveTo(68,65,46,76,32,63);p.lineTo(27,71);p.bezierCurveTo(51,89,83,69,66,51);p.lineTo(44,41);p.bezierCurveTo(35,35,51,27,62,37);p.closePath();box(47,18,7,64);});
  make('car',function(){polygon([10,44,21,22,79,22,90,44,95,49,95,75,5,75,5,49]);polygon([28,31,72,31,79,45,21,45],true);box(14,54,14,9,true);box(72,54,14,9,true);rounded(12,70,15,17,4);rounded(73,70,15,17,4);});
  make('bus',function(){rounded(15,9,70,78,10);rounded(21,77,13,15,4);rounded(66,77,13,15,4);box(24,27,52,29,true);box(35,16,30,5,true);circle(29,70,5,true);circle(71,70,5,true);box(7,31,8,19);box(85,31,8,19);});
  make('train',function(){rounded(19,7,62,72,12);polygon([30,74,41,74,27,94,15,94]);polygon([59,74,70,74,85,94,73,94]);box(26,25,48,26,true);box(39,14,22,5,true);circle(33,64,5,true);circle(67,64,5,true);box(26,84,48,6);});
  make('plane',function(){p.moveTo(50,5);p.bezierCurveTo(55,5,56,12,56,18);p.lineTo(57,37);p.lineTo(94,61);p.lineTo(94,70);p.lineTo(57,57);p.lineTo(56,77);p.lineTo(69,87);p.lineTo(69,94);p.lineTo(50,88);p.lineTo(31,94);p.lineTo(31,87);p.lineTo(44,77);p.lineTo(43,57);p.lineTo(6,70);p.lineTo(6,61);p.lineTo(43,37);p.lineTo(44,18);p.bezierCurveTo(44,12,45,5,50,5);p.closePath();});
  make('tree',function(){rounded(44,47,12,46,2);circle(50,28,21);circle(29,43,19);circle(71,43,19);circle(38,55,20);circle(62,55,20);});
  make('wheat',function(){rounded(47,27,6,66,3);polygon([50,7,57,19,50,32,43,19]);for(var i=0;i<3;i++){var y=32+i*17;polygon([27,y-8,43,y-3,49,y+12,34,y+7]);polygon([73,y-8,57,y-3,51,y+12,66,y+7]);}});
  make('water-drop',function(){p.moveTo(50,5);p.bezierCurveTo(43,19,17,46,17,61);p.bezierCurveTo(17,105,83,105,83,61);p.bezierCurveTo(83,46,57,19,50,5);p.closePath();});
  make('bulb',function(){p.moveTo(34,70);p.bezierCurveTo(34,58,21,54,21,35);p.bezierCurveTo(21,-3,79,-3,79,35);p.bezierCurveTo(79,54,66,58,66,70);p.closePath();rounded(34,76,32,7,3);polygon([36,87,64,87,59,94,41,94]);});
  make('phone',function(){rounded(25,5,50,90,8);box(32,19,36,59,true);box(43,11,14,3,true);circle(50,87,4,true);});
  make('school',function(){polygon([6,91,6,43,29,43,29,33,50,15,71,33,71,43,94,43,94,91]);box(46,4,5,17);polygon([51,4,72,4,67,11,51,11]);circle(50,39,8,true);box(46,66,8,25,true);[[16,56],[16,73],[33,56],[59,56],[76,56],[76,73]].forEach(function(a){box(a[0],a[1],8,10,true);});});
  make('hospital',function(){box(26,8,48,83);box(6,43,20,48);box(74,43,20,48);plus(50,29,25,9,true);box(44,72,12,19,true);[[35,51],[57,51],[13,56],[13,74],[80,56],[80,74]].forEach(function(a){box(a[0],a[1],7,10,true);});});
  make('soldier-helmet',function(){p.moveTo(15,61);p.lineTo(15,43);p.bezierCurveTo(15,-5,85,-5,85,43);p.lineTo(85,61);p.lineTo(94,64);p.lineTo(94,74);p.lineTo(6,74);p.lineTo(6,64);p.closePath();polygon([24,74,32,74,37,84,63,84,68,74,76,74,69,94,31,94]);});
  make('heart',function(){p.moveTo(50,91);p.bezierCurveTo(40,80,7,58,7,33);p.bezierCurveTo(7,3,39,0,50,23);p.bezierCurveTo(61,0,93,3,93,33);p.bezierCurveTo(93,58,60,80,50,91);p.closePath();});
  make('star',function(){var a=[];for(var i=0;i<10;i++){var t=-Math.PI/2+i*Math.PI/5,r=i%2?18:46;a.push(50+Math.cos(t)*r,51+Math.sin(t)*r);}polygon(a);});
  definitions.forEach(function(d){aliases[d[0]]=d[0];aliases[d[1].toLowerCase()]=d[0];aliases[d[2]]=d[0];});
  var extra={'water':'water-drop','drop':'water-drop','water drop':'water-drop','water_drop':'water-drop',
    'school-building':'school','school_building':'school','dollar-coin':'dollar','dollar_coin':'dollar',
    'rupee-coin':'rupee','rupee_coin':'rupee','soldier':'soldier-helmet','helmet':'soldier-helmet','soldier_helmet':'soldier-helmet','airplane':'plane','aeroplane':'plane'};
  Object.keys(extra).forEach(function(k){aliases[k]=extra[k];});
  function resolve(id){return typeof id==='string'?aliases[id.trim().toLowerCase()]||null:null;}
  function fraction(n,fallback){return Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;}
  window.DC.icons={
    list:definitions.map(function(d){return {id:d[0],name:d[1],hi:d[2]};}),
    has:function(id){return resolve(id)!==null;},
    draw:function(c,id,cx,cy,size,color,opts){
      id=resolve(id);if(!id||![cx,cy,size].every(Number.isFinite)||size<=0)return false;
      opts=opts||{};var fill=fraction(opts.fill,1),alpha=fraction(opts.alpha,1);if(fill===0||alpha===0)return true;
      c.save();try{c.globalAlpha*=alpha;c.fillStyle=color||'#FFFFFF';c.translate(cx-size/2,cy-size/2);c.scale(size/100,size/100);
        if(fill<1){c.beginPath();c.rect(0,100*(1-fill),100,100*fill);c.clip();}c.fill(paths[id]);
      }finally{c.restore();}return true;
    }
  };
}());
