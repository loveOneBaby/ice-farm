/* World-space water and frame-driven weather. No screen-space sea overlays,
 * CSS animation restarts, timers, network assets, or simulated economic modifiers. */
window.ICE_ENVIRONMENT = (() => {
 'use strict';
 const modes = {
  clear:{name:'晴雪 · 波光',description:'清透冰蓝海水，细碎反光，冰岸的浅水泛着青色。',tint:null,water:['#287aa4','#2a7ea8','#2c82ac','#2e86ae','#318ab1','#358eb5'],wind:.4},
  snow:{name:'飘雪 · 静谧',description:'远近两层雪花缓缓飘落，海面转冷，暖灯更显温柔。',tint:['#92b8d7',.13],water:['#376e94','#3a7499','#3c799d','#407ea1','#4583a6','#4988a8'],wind:.6},
  blizzard:{name:'风雪 · 灯火',description:'斜向风雪掠过冰原，远处稍有雾气，灯火仍指引着家园。',tint:['#55799c',.23],water:['#355773','#385d7a','#3b647e','#3f6a86','#45728e','#497795'],wind:2.2},
  aurora:{name:'极光 · 星幕',description:'青蓝与紫色光带缓缓展开，暖灯和晶体在夜色中闪耀。',tint:['#111b47',.31],water:['#142e56','#17355e','#193c65','#1c446e','#204c76','#25557e'],wind:.35},
  night:{name:'月夜 · 暖灯',description:'月色在水面留下细碎银光，海岸的窗灯逐一亮起。',tint:['#101c3a',.37],water:['#172c4b','#1a3455','#1e3c5d','#214264','#264d70','#2b577a'],wind:.2},
  dawn:{name:'晨曦 · 薄雾',description:'浅桃色晨光落在雪地上，海水泛着柔和的蓝紫色。',tint:['#efbc97',.13],water:['#546f9b','#58759e','#5e7ea4','#6486ad','#6c8fb5','#7599bc'],wind:.25}
 };
 const hash=n=>{let v=Math.sin(n*127.1+47.7)*43758.5453;return v-Math.floor(v);};
 const tiles=new Map(),patCache=new WeakMap();
 function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function poly(c,p,col){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fillStyle=col;c.fill();}
 function tile(mode){
  if(tiles.has(mode))return tiles.get(mode);
  const cv=document.createElement('canvas');cv.width=512;cv.height=256;const c=cv.getContext('2d'),palette=modes[mode].water;
  // All wavelengths divide the texture dimensions, so every edge joins exactly.
  for(let y=0;y<256;y+=4)for(let x=0;x<512;x+=4){
   const a=Math.sin(x*Math.PI/128+y*Math.PI/64)*.85+Math.cos(y*Math.PI/64)*.7+Math.sin(x*Math.PI/64-y*Math.PI/32)*.22;
   rect(c,x,y,4,4,palette[Math.max(0,Math.min(5,Math.floor(2.5+a)))]);
  }
  c.globalAlpha=.12;
  for(let i=0;i<145;i++){
   let x=Math.floor(hash(i+1)*512),y=Math.floor(hash(i+500)*256),w=3+(hash(i+90)*13|0);
   for(const sx of [-512,0,512])for(const sy of [-256,0,256]){
    rect(c,x+sx,y+sy,w,1,'#bee3ee');if(i%3===0)rect(c,x+sx+2,y+sy+2,w/2,1,'#bee3ee');
   }
  }
  tiles.set(mode,cv);return cv;
 }
 function pattern(ctx,mode){let set=patCache.get(ctx);if(!set){set={};patCache.set(ctx,set);}return set[mode]||(set[mode]=ctx.createPattern(tile(mode),'repeat'));}
 function isLand(x,y,regions,pad=0){return regions.some(r=>Math.abs(x-r.cx)/(180+pad)+Math.abs(y-r.cy-8)/(104+pad*.5)<1.13);}
 function coast(ctx,regions,t,mode){
  const all=new Set(regions.map(r=>r.gx+':'+r.gy));
  for(const r of regions){
   const pts=[[r.cx,r.cy-90],[r.cx+180,r.cy],[r.cx,r.cy+90],[r.cx-180,r.cy]];
   const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
   for(let e=0;e<4;e++){
    if(all.has((r.gx+dirs[e][0])+':'+(r.gy+dirs[e][1])))continue;
    const a=pts[e],b=pts[(e+1)%4],front=e===1||e===2;
    const yoff=front?37:4,nx=(e<2?1:-1)*.42,ny=(e===1||e===2?1:-1)*.90;
    const samples=[];
    for(let j=0;j<=32;j++){
     const f=j/32,n=(hash(j+e*70+r.gx*31+r.gy*7)-.5)*4;
     samples.push([a[0]+(b[0]-a[0])*f+nx*(7+n),a[1]+(b[1]-a[1])*f+yoff+ny*(7+n)]);
    }
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const [w,alpha,col]of [[30,.22,'#62c2cf'],[17,.22,'#77d6db'],[8,.29,'#89e0e6']]){
     ctx.beginPath();samples.forEach(([x,y],j)=>j?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.strokeStyle=col;ctx.globalAlpha=alpha;ctx.lineWidth=w;ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Broken shore foam, not a solid white outline around every plot.
    for(let j=2;j<31;j++)if(hash(j+e*59+r.gx*53+r.gy*29)>.58){const [x,y]=samples[j];rect(ctx,x,y,4+j%4,1,'#b9e8ee');}
   }
  }
 }
 function ice(ctx,x,y,s,t){
  y+=Math.round(Math.sin(t*.35+x)*1.2);
  const pts=[[-22,-4],[-14,-11],[-7,-11],[-2,-15],[13,-11],[20,-5],[24,0],[17,8],[2,12],[-12,9],[-24,3]];
  const p=pts.map(([a,b])=>[x+a*s,y+b*s]);
  poly(ctx,p.map(([a,b])=>[a,b+7*s]),'#397eac');
  poly(ctx,p.map(([a,b])=>[a,b+4*s]),'#83c9e6');poly(ctx,p,'#dceff8');
  poly(ctx,[[x-15*s,y-4*s],[x-3*s,y-10*s],[x+12*s,y-6*s],[x+17*s,y],[x+1*s,y+4*s],[x-15*s,y]],'#f5fcff');
  rect(ctx,x-10*s,y+10*s,13*s,1,'#77bed2');
 }
 function ocean(ctx,b,t,mode,regions){
  mode=modes[mode]?mode:'clear';ctx.save();ctx.fillStyle=pattern(ctx,mode);
  ctx.fillRect(Math.floor(b.minX),Math.floor(b.minY),Math.ceil(b.maxX-b.minX)+1,Math.ceil(b.maxY-b.minY)+1);
  coast(ctx,regions,t,mode);
  for(let gy=Math.floor(b.minY/164)-1;gy<=Math.ceil(b.maxY/164);gy++)for(let gx=Math.floor(b.minX/222)-1;gx<=Math.ceil(b.maxX/222);gx++){
   const seed=gx*19+gy*103,h=hash(seed+400),x=gx*222+hash(seed+201)*150,y=gy*164+hash(seed+203)*98;
   if(isLand(x,y,regions,30))continue;
   if(h>.65)ice(ctx,x,y,.36+hash(seed+610)*.55,t);
   else if(h<.55){
    const a=.15+Math.sin(t*.9+seed)*.1;ctx.globalAlpha=a;
    for(let j=0;j<3;j++)rect(ctx,x+j*4,y+j*3,(7+j*6),1,'#d9f5fc');ctx.globalAlpha=1;
   }
  }
  ctx.restore();
 }
 function weather(ctx,w,h,t,mode,lights,camera,motion){
  const m=modes[mode]||modes.clear;ctx.save();
  if(m.tint){ctx.globalAlpha=m.tint[1];rect(ctx,0,0,w,h,m.tint[0]);ctx.globalAlpha=1;}
  const night=mode==='night'||mode==='aurora';
  if(night){
   for(let i=0;i<58;i++){
    const x=hash(i+630)*w,y=hash(i+750)*h*.30;ctx.globalAlpha=.28+Math.max(0,Math.sin(t*.55+i))* .48;
    rect(ctx,x,y,i%9===0?2:1,i%9===0?2:1,'#e0ecff');
   }ctx.globalAlpha=1;
   if(mode==='night'){
    const x=w*.80,y=100;for(let yy=-13;yy<=13;yy++)for(let xx=-13;xx<=13;xx++)if(xx*xx+yy*yy<155&&(xx-6)*(xx-6)+(yy+4)*(yy+4)>117)rect(ctx,x+xx*1.2,y+yy*1.2,2,2,'#ece6bf');
   }
   if(mode==='aurora'){
    ctx.globalCompositeOperation='screen';
    for(let band=0;band<3;band++)for(let x=0;x<w;x+=4){
     const f=x/w,centre=92+band*27+Math.sin(f*5.8+t*.12+band*1.8)*33;
     const len=48+42*Math.sin(f*3.2+band+.5),envelope=Math.max(0,Math.sin(Math.PI*f));
     for(let v=0;v<len;v+=3){ctx.globalAlpha=(.075+(1-v/len)*.26)*envelope*(.70+.30*Math.sin(x*.073+band+t*.25));
      rect(ctx,x,centre+v,4,3,['#71d8d7','#9b9bdd','#82c9e2'][band]);
     }
    }ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
   }
  }
  if(mode==='snow'||mode==='blizzard'){
   const count=mode==='snow'?82:148;for(let i=0;i<count;i++){
    const z=i%3,wind=m.wind*(8+z*9),speed=(8+z*12);
    const x=((hash(i+320)*w+t*wind+Math.sin(t*.25+i)*7)%w+w)%w,y=(hash(i+990)*h+t*speed)%h;
    ctx.globalAlpha=.30+z*.19;rect(ctx,x,y,z===2?3:1,z===2?3:1,'#edf8ff');
    if(mode==='blizzard'&&z===2){rect(ctx,x-3,y-2,3,1,'#ebfaff');rect(ctx,x-6,y-3,3,1,'#ebfaff');}
   }ctx.globalAlpha=1;
  }
  if(mode==='dawn'){
   ctx.globalAlpha=.07;for(let y=0;y<h*.32;y+=4){rect(ctx,0,y,w,4,y<h*.15?'#ffd2b8':'#d8d5ef');}ctx.globalAlpha=1;
  }
  // Discrete warm light pools at real building/lantern anchors, not at fixed screen positions.
  if(night||mode==='blizzard')for(const l of lights){
   const x=Math.round(camera.x+l.x*camera.s),y=Math.round(camera.y+l.y*camera.s),r=l.kind==='lamp'?13:21;
   if(x<-30||x>w+30||y<-30||y>h+30)continue;
   for(let i=3;i>0;i--){ctx.globalAlpha=.035+(4-i)*.018;poly(ctx,[[x,y-r*i*.5],[x+r*i*.55,y],[x,y+r*i*.45],[x-r*i*.55,y]],l.kind==='crystal'?'#a5e6fa':'#ffcd80');}
   ctx.globalAlpha=.65;rect(ctx,x-1,y-2,2,3,l.kind==='crystal'?'#d4f9ff':'#ffe1a0');ctx.globalAlpha=1;
   if(l.image){ctx.globalAlpha=.92;ctx.drawImage(l.image,Math.round(camera.x+l.left*camera.s),Math.round(camera.y+l.top*camera.s),Math.round(l.width*camera.s),Math.round(l.height*camera.s));ctx.globalAlpha=1;}
  }
  ctx.restore();
 }
 return Object.freeze({modes,drawOcean:ocean,drawWeather:weather,tile,version:10});
})();

