(() => {
'use strict';
const C=window.ICE_CONFIG, AS=window.ICE_ASSETS, AM=window.ICE_ART_META, SC=window.ICE_SCENERY, CA=window.ICE_CROP_ART;
const cropHits=[], labelHits=[], sceneLights=[];
const ENV=window.ICE_ENVIRONMENT, LA=window.ICE_LABEL_ART;
const propHits=[], alphaMasks=new Map();
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const game=$('#game'), canvas=$('#scene'),ctx=canvas.getContext('2d'),mini=$('#minimap'),mc=mini.getContext('2d');
const art={}, camera={x:0,y:0,s:1}, pointers=new Map(), FX=[], metrics={frames:0,actions:[],errors:[],assets:0};
let W=0,H=0,DPR=1,started=false,selection=null,placement=null,drag=null,pinch=null,suppressTap=false,modalView=null,modalArgs={},lastFocus=null,lastSave=0,lastHud=0,lastAuto=0,storageAvailable=true,raf=0,disposed=false;
const weatherNames=Object.fromEntries(Object.entries(ENV.modes).map(([k,v])=>[k,v.name]));
const cropDefault={veg:'carrot',flowers:'lotus',orchard:'blueberry',special:'crystal'};
const itemDef=k=>C.crops[k]||C.items[k]||{name:k,icon:'nav-bag',sell:10};
Object.assign(C.items,{garland:{name:'极光花环',icon:'iceRose',sell:180},essence:{name:'晶草香露',icon:'crystal_4',sell:160}});
Object.assign(C.recipes,{garland:{name:'极光花环',icon:'iceRose',need:{iceRose:2,auroraOrchid:1},out:{garland:1},seconds:14},essence:{name:'晶草香露',icon:'crystal_4',need:{crystal:2,frostHerb:2},out:{essence:1},seconds:12}});
const cropNotes={lotus:'冰池边的白瓣雪莲，适合做花束主花。',tulip:'偏暖色的郁金香，成熟后花型挺拔。',daisy:'低矮清新的雏菊，铺面效果轻盈。',hydrangea:'团簇绽放的冰蓝绣球，观赏价值更高。',iceRose:'带晶莹高光的冰玫瑰，稀有度较高。',crystal:'剔透冰晶草，收成少但售价高。',crystalBloom:'水晶花拥有通透花瓣，偏收藏型收益。',frostHerb:'寒冰香草适合深色地块，叶型更明显。',auroraOrchid:'极光之兰有流光感，是高阶特产作物。',snowberry:'极光莓为多年生浆果，适合持续经营。',apple:'冰糖苹果属于果树型，采摘后保留树体。',pear:'雪梨树冠圆润，适合果园成片排布。',blueberry:'蓝莓灌木结果快，适合前期周转。',strawberry:'草莓低矮饱满，成熟时颜色最鲜亮。',carrot:'胡萝卜成长快，适合前期起步。',cabbage:'卷心菜个体饱满，收益稳定。',pumpkin:'南瓜体量最大，成熟时最有存在感。',pea:'雪甜豌豆是爬藤类蔬菜，看起来更灵动。',spinach:'嫩叶菠菜节奏快，适合补足日常产量。',wheat:'小麦是工坊基础作物，可加工成饲料和面包。'};
const familyTone={veg:'高产基础作物',flowers:'观赏型花卉',orchard:'多年生果木',special:'稀有特产'};
const workshopName=i=>'工坊 '+(Math.floor(i/2)+1)+' · '+(i%2?'B':'A')+' 工位';
const workshopCapacity=s=>Math.max(2,s.regions.filter(r=>r.type==='workshop').length*2);
const workshopJobs=()=>{if(!Array.isArray(state.jobs))state.jobs=state.job?[state.job]:[];while(state.jobs.length<workshopCapacity(state))state.jobs.push(null);state.job=null;return state.jobs;};
const freeWorkshopSlot=()=>workshopJobs().findIndex(j=>!j);
const cropDesc=spec=>cropNotes[spec]||'适合雪原家园的细腻插画作物。';
const fmt=n=>Math.floor(n).toLocaleString('zh-CN');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const im=(key,cls='',alt='')=>`<img class="${cls}" src="${AS[key]||AS['nav-bag']}" alt="${esc(alt)}">`;
const btn=(text,action,data='',cls='')=>`<button class="btn ${cls}" data-action="${action}" ${data}>${text}</button>`;
const enabledBtn=(text,action,data,enabled,cls='')=>`<button class="btn ${cls}" data-action="${action}" ${data} ${enabled?'':'disabled'}>${text}</button>`;
const now=()=>Date.now();
function baseState(){
 const s={version:C.version,coins:12480,gems:326,energy:40,level:28,weather:'clear',sound:false,motion:true,selectedRegion:'veg',regions:[],inventory:{fertilizer:6,wheat:8,blueberry:6,milk:2,feed:8,lotus:3,tulip:2,wood:6},stats:{harvests:0,animalsBought:0,animalCollects:0,fishHarvests:0,crafted:0,expansions:0,mined:0,explored:0},claims:[],discovered:['carrot','blueberry','lotus','cow','chicken','salmon'],mailClaimed:false,daily:'',companion:{owned:false,active:false},jobs:[null,null],job:null,activities:{mine:null,explore:null},decorations:[],coat:0,seq:0,energyUpdatedAt:now(),savedAt:now(),createdAt:now()};
 for(const r of C.initial){
  const rg={...r,districtId:r.id,initial:true,cells:r.cells.map((p,i)=>({id:r.id+'-'+i,x:p[0],y:p[1],entity:null}))};
  rg.cells.forEach((c,i)=>{
   const kind=C.types[r.type].kind;
   if(kind==='crop'&&i!==1&&i!==7){const list=r.type==='veg'?['carrot','carrot','cabbage','pea','pumpkin','spinach','carrot','carrot','cabbage']:r.type==='orchard'?['apple','pear','pear','blueberry','blueberry','blueberry','strawberry','strawberry','strawberry']:r.type==='flowers'?['tulip','daisy','hydrangea','lotus','daisy','iceRose','hydrangea','lotus','tulip']:r.type==='special'?['crystal','crystal','crystalBloom','frostHerb','auroraOrchid','crystal','snowberry','crystalBloom','auroraOrchid']:Object.keys(C.crops).filter(k=>C.crops[k].family===r.type),spec=list[i%list.length];c.entity={kind:'crop',species:spec,startedAt:now()-C.crops[spec].seconds*1000*(i===3?.35:1.2),endsAt:i===3?now()+5000:now()-1,watered:false};}
   if(kind==='animal'&&i!==1){const spec='sheep';c.entity={kind:'animal',species:spec,startedAt:now()-10000,endsAt:i%2?now()+8000:now()-1,hungry:false};}
   if(kind==='fish'&&i!==1){const spec='salmon';c.entity={kind:'fish',species:spec,startedAt:now()-10000,endsAt:i===3?now()+6000:now()-1,fed:false};}
  });s.regions.push(rg);
 }
 return s;
}
function validState(s){
 if(!s||s.version!==C.version||!Array.isArray(s.regions)||!s.regions.length)throw Error('这不是本版本的家园存档');
 for(const k of ['coins','gems','energy','level','seq'])if(!Number.isSafeInteger(s[k])||s[k]<0||s[k]>1e12)throw Error('存档数值无效');
 if(!s.inventory||!s.stats||!Array.isArray(s.claims)||!Array.isArray(s.discovered)||!Array.isArray(s.decorations)||!s.activities||!s.companion)throw Error('存档结构不完整');
 for(const [k,v] of Object.entries(s.inventory))if(!Object.hasOwn(C.items,k)&&!Object.hasOwn(C.crops,k)||!Number.isSafeInteger(v)||v<0||v>1e9)throw Error('背包数据无效');
 const ids=new Set(),cells=new Set(),grid=new Set();
 for(const r of s.regions){if(!Number.isSafeInteger(r.gx)||!Number.isSafeInteger(r.gy)||Math.abs(r.gx)>10000||Math.abs(r.gy)>10000||grid.has(r.gx+':'+r.gy))throw Error('区域网格重叠或无效');grid.add(r.gx+':'+r.gy);if(r.cx!==C.grid.originX+(r.gx-r.gy)*180||r.cy!==C.grid.originY+(r.gx+r.gy)*90)throw Error('区域网格坐标不匹配');if(!Object.hasOwn(C.types,r.type)||!Array.isArray(r.cells)||typeof r.id!=='string'||r.id.length>100||!/^[-a-zA-Z0-9_]+$/.test(r.id)||ids.has(r.id))throw Error('区域数据无效');ids.add(r.id);if(!Number.isFinite(r.cx)||!Number.isFinite(r.cy)||Math.abs(r.cx)>1e6||Math.abs(r.cy)>1e6||!Array.isArray(r.label)||r.label.length!==2)throw Error('区域坐标无效');for(const p of r.label)if(!Number.isFinite(p)||Math.abs(p)>1e6)throw Error('标牌坐标无效');for(const c of r.cells){if(cells.has(c.id)||typeof c.id!=='string'||c.id.length>120||!/^[-a-zA-Z0-9_]+$/.test(c.id)||!Number.isFinite(c.x)||!Number.isFinite(c.y))throw Error('地块坐标无效');cells.add(c.id);const e=c.entity;if(e){const defs=e.kind==='crop'?C.crops:e.kind==='animal'?C.animals:e.kind==='fish'?C.fish:null;if(!defs||!Object.hasOwn(defs,e.species)||!Number.isFinite(e.endsAt)||!Number.isFinite(e.startedAt))throw Error('经营对象数据无效');if(e.kind!==C.types[r.type].kind)throw Error('区域类型不匹配');if(e.kind==='crop'&&defs[e.species].family!==r.type)throw Error('作物分区不匹配');}}}
 for(const initial of C.initial)if(!s.regions.some(r=>r.id===initial.id&&r.type===initial.type))throw Error('存档缺少初始区域：'+initial.type);
 for(const r of s.regions){
  const kind=C.types[r.type].kind,rows=['animal','fish'].includes(kind)?2:3,expected=kind==='building'?0:rows*3;
  r.size=92;r.initial=C.initial.some(v=>v.id===r.id);r.label=[r.cx,r.cy-84];
  if(r.cells.length!==expected)throw Error('经营位数量不匹配');
  r.cells.forEach((c,i)=>{const a=i%3-1,b=Math.floor(i/3)-(rows-1)/2;if(c.x!==r.cx+(a-b)*49||c.y!==r.cy+(a+b)*24.5+5)throw Error('经营位不在对应区域');});
  if(typeof r.districtId!=='string'||!/^[-a-zA-Z0-9_]+$/.test(r.districtId))r.districtId=r.id;
 }
 if(!s.regions.some(r=>r.id===s.selectedRegion))s.selectedRegion='veg';
 for(const k of ['harvests','animalsBought','animalCollects','fishHarvests','crafted','expansions','mined','explored']){if(s.stats[k]===undefined)s.stats[k]=0;if(!Number.isSafeInteger(s.stats[k])||s.stats[k]<0||s.stats[k]>1e12)throw Error('统计数据无效');}
 s.level=Math.max(28,s.level);s.energy=Math.min(40,s.energy);s.coat=Number.isInteger(s.coat)?Math.max(0,Math.min(4,s.coat)):0;
 s.sound=s.sound===true;s.motion=s.motion!==false;s.hideLabels=s.hideLabels===true;
 s.companion={owned:s.companion.owned===true,active:s.companion.owned===true&&s.companion.active===true};
 for(const list of [s.claims,s.discovered])if(list.some(k=>typeof k!=='string'||k.length>100))throw Error('图鉴或记录数据无效');
 s.energyUpdatedAt=Number.isFinite(s.energyUpdatedAt)&&s.energyUpdatedAt>0?Math.min(now(),Math.max(0,s.energyUpdatedAt)):now();
 s.savedAt=Number.isFinite(s.savedAt)?Math.min(now(),Math.max(0,s.savedAt)):now();
 for(const r of s.regions){const n=/^region-(\d+)$/.exec(r.id);if(n)s.seq=Math.max(s.seq,Number(n[1]));}
 for(const d of s.decorations){const n=/^d(\d+)$/.exec(d.id||'');if(n)s.seq=Math.max(s.seq,Number(n[1]));}
 if(!Number.isSafeInteger(s.seq)||s.seq>1e12)throw Error('区域序号无效');
 for(const t of C.tasks)if(!Number.isSafeInteger(s.stats[t.stat])||s.stats[t.stat]<0)throw Error('任务数据无效');
 if(!Object.hasOwn(weatherNames,s.weather))s.weather='clear';
 for(const a of ['mine','explore'])if(s.activities[a]&&!Number.isFinite(s.activities[a].endsAt))throw Error('探险数据无效');
 if(!Array.isArray(s.jobs))s.jobs=s.job?[s.job,null]:[null,null];
 if(s.jobs.length>workshopCapacity(s)&&s.jobs.slice(workshopCapacity(s)).some(Boolean))throw Error('工位数超过已建工坊容量');
 s.jobs=s.jobs.slice(0,workshopCapacity(s));while(s.jobs.length<workshopCapacity(s))s.jobs.push(null);
 for(const j of s.jobs)if(j&&(!Object.hasOwn(C.recipes,j.recipe)||!Number.isFinite(j.endsAt)||!Number.isFinite(j.startedAt)))throw Error('加工数据无效');
 for(const d of s.decorations)if(!['pine','lamp','snowman'].includes(d.type)||!Number.isFinite(d.x)||!Number.isFinite(d.y))throw Error('装饰数据无效');
 return s;
}
let state=baseState(), protectedSave=null, pendingImport=null, importRequest=0, modalGeneration=0, refreshPending=false, savedBackup=null, awaySince=0;
try{
 const raw=localStorage.getItem(C.saveKey);
 if(raw){try{state=validState(JSON.parse(raw));}catch{protectedSave=raw;}}
}catch{storageAvailable=false;}
function saveIndicator(message,warning=false){$('#saveLabel').textContent=message;$('#saveBadge').textContent=warning?'未保存':'已存';const b=$('.farm-save');if(b){b.dataset.warning=String(warning);b.title=message;b.setAttribute('aria-label',message+'，打开农场存档');}}
function persist(){lastSave=now();if(protectedSave!==null){saveIndicator('原存档未能载入，已保留；请导出备份',true);return false;}try{state.savedAt=now();localStorage.setItem(C.saveKey,JSON.stringify(state));storageAvailable=true;saveIndicator('已自动保存 · '+new Date().toLocaleTimeString('zh-CN',{hour12:false}));return true;}catch{storageAvailable=false;saveIndicator('未能自动保存，请导出 JSON 备份',true);return false;}}
function recoverEnergy(){const at=now(),stamp=state.energyUpdatedAt??at;const steps=Math.floor(Math.max(0,at-stamp)/60000);if(state.energy>=40){state.energyUpdatedAt=at;return 0;}if(!steps)return 0;const gain=Math.min(40-state.energy,steps);state.energy+=gain;state.energyUpdatedAt=state.energy===40?at:stamp+steps*60000;return gain;}
function makeBackup(){const raw=protectedSave!==null?protectedSave:JSON.stringify(state);savedBackup=raw;try{localStorage.setItem(C.saveKey+':backup',raw);return true;}catch{return false;}}
function exportBackup(){let raw=savedBackup;try{raw ||= localStorage.getItem(C.saveKey+':backup');}catch{}if(!raw)return toast('还没有替换前的备份');exportFile(raw,'ice-homestead-before-replace.json','application/json');toast('替换前备份已导出');}
function applyImport(){if(!pendingImport)return;const next=pendingImport,backupStored=makeBackup();pendingImport=null;state=next;protectedSave=null;selection=null;cancelPlacement();recoverEnergy();close();commit('import');visibleNav();initialCamera();toast(storageAvailable?(backupStored?'存档已导入；旧进度已留备份':'已导入；旧备份仅暂留本页，请立即导出替换前备份'):'已导入本次会话；请立即导出新旧备份');}
function commit(action){metrics.actions.push({action,at:now()});if(metrics.actions.length>150)metrics.actions.shift();persist();syncHud(true);}
function region(id=state.selectedRegion){return state.regions.find(r=>r.id===id)||state.regions.find(r=>r.id==='veg')||state.regions[0];}
function locateCell(id){for(const r of state.regions){const c=r.cells.find(c=>c.id===id);if(c)return {r,c};}return null;}
function ready(e){return !!e&&!e.hungry&&e.endsAt<=now();}
function phase(e){if(!e)return '空闲';if(e.hungry)return e.kind==='crop'?'待养护':'待喂养';if(ready(e))return e.kind==='animal'?'可收取':e.kind==='fish'?'可捕捞':'可收获';return e.kind==='animal'?'生产中':e.kind==='fish'?'养成中':'生长中';}
function gain(items){for(const [k,n] of Object.entries(items))state.inventory[k]=(state.inventory[k]||0)+n;}
function discover(k){if(!state.discovered.includes(k))state.discovered.push(k);}
function afford(need){return Object.entries(need).every(([k,n])=>(state.inventory[k]||0)>=n);}
function take(need){if(!afford(need))return false;for(const [k,n]of Object.entries(need))state.inventory[k]-=n;return true;}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2300);}
let audio=null;
function sound(kind='tap'){if(!state.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='sine';o.frequency.setValueAtTime(kind==='harvest'?660:440,audio.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='harvest'?1100:560,audio.currentTime+.10);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.start();o.stop(audio.currentTime+.18);}catch{}}
function pop(c,text){const p=worldToScreen(c.x,c.y-15),el=document.createElement('span');el.className='floating-reward';el.textContent=text;el.style.left=p.x+'px';el.style.top=p.y+'px';$('#eventFlashes').appendChild(el);setTimeout(()=>el.remove(),1100);for(let i=0;i<12;i++)FX.push({x:c.x,y:c.y-7,vx:(Math.random()-.5)*38,vy:-15-Math.random()*30,t:performance.now(),life:850});sound('harvest');}
function harvest(id,quiet=false){const a=locateCell(id);if(!a||!ready(a.c.entity))return false;const {c}=a,e=c.entity;let n,k;
 if(e.kind==='crop'){const d=C.crops[e.species];n=d.yield;k=e.species;if(d.perennial){e.hungry=true;e.established=true;e.endsAt=0;e.watered=false;}else c.entity=null;state.stats.harvests++;}
 else if(e.kind==='animal'){const d=C.animals[e.species];n=d.yield;k=d.product;e.hungry=true;e.endsAt=0;state.stats.animalCollects++;}
 else{const d=C.fish[e.species];n=d.yield;k=d.product;c.entity=null;state.stats.fishHarvests++;}
 gain({[k]:n});discover(k);pop(c,`+${n} ${itemDef(k).name}`);if(!quiet)commit('harvest:'+id);return true;
}
function plant(id,species){const a=locateCell(id),d=C.crops[species];if(!a||!d||a.c.entity||d.family!==a.r.type)return toast('这块地不能种植该作物');if(state.coins<d.cost)return toast('金币不足');state.coins-=d.cost;a.c.entity={kind:'crop',species,startedAt:now(),endsAt:now()+d.seconds*1000,watered:false};discover(species);close();commit('plant:'+id);sound();toast('已播种 '+d.name+' · '+d.seconds+' 秒后成熟');}
function buy(id,species){const a=locateCell(id);if(!a||a.c.entity)return toast('该位置已有经营对象');const kind=C.types[a.r.type].kind,defs=kind==='animal'?C.animals:kind==='fish'?C.fish:null,d=defs?.[species];if(!d)return toast('请选择对应区域的品种');if(state.coins<d.cost)return toast('金币不足');state.coins-=d.cost;a.c.entity={kind,species,startedAt:now(),endsAt:now()+d.seconds*1000,hungry:false,fed:false};if(kind==='animal')state.stats.animalsBought++;discover(species);close();commit('buy:'+id);sound();toast((kind==='animal'?'欢迎 ':'已投放 ')+d.name);}
function feed(id){const a=locateCell(id),e=a?.c.entity;if(!e)return;if(ready(e))return toast('请先收取已经产出的物品');if(e.kind==='crop'&&C.crops[e.species].perennial){if(!e.hungry)return;if(!take({fertilizer:1})){if(state.coins<12)return toast('金币不足');state.coins-=12;}e.hungry=false;e.startedAt=now();e.established=true;e.watered=false;e.endsAt=now()+C.crops[e.species].seconds*1000;}else if(e.kind==='animal'){if(!e.hungry)return toast('正在生产，无需重复投喂');if(!take({feed:1})){if(state.coins<12)return toast('没有饲料且金币不足');state.coins-=12;}e.hungry=false;e.startedAt=now();e.endsAt=now()+C.animals[e.species].seconds*1000;}
 else if(e.kind==='fish'){if(e.fed)return toast('本轮已经投喂');if(!take({feed:1}))return toast('需要 1 份饲料');e.fed=true;e.endsAt=now()+(e.endsAt-now())*.55;}else return;
 commit('feed:'+id);cellPanel(id);toast(e.kind==='crop'?'养护完成 · 植株保留，开始下一轮结果':'已投喂');}
function speed(id){const a=locateCell(id),e=a?.c.entity;if(!e||e.hungry||ready(e))return;if(state.gems<2)return toast('冰晶不足');state.gems-=2;e.endsAt=now()-1;commit('speed:'+id);close();toast('已经可以收获了，点击地块收取');}
function water(id){const e=locateCell(id)?.c.entity;if(!e||e.kind!=='crop'||e.hungry||e.watered||ready(e))return;if(state.energy<2)return toast('体力不足');recoverEnergy();state.energy-=2;e.watered=true;e.endsAt=now()+(e.endsAt-now())*.6;commit('water:'+id);cellPanel(id);toast('浇水完成 · 剩余生长时间减少 40%');}
function beginCraft(key,slot){
 const d=C.recipes[key],jobs=workshopJobs();
 if(!d)return toast('配方不存在');
 if(slot==null||slot==='')slot=freeWorkshopSlot();
 slot=Number(slot);
 if(!Number.isInteger(slot)||slot<0||slot>=jobs.length||jobs[slot])return toast('当前没有空闲工位');
 if(!take(d.need))return toast('加工材料不足');
 jobs[slot]={recipe:key,startedAt:now(),endsAt:now()+d.seconds*1000};
 commit('craft-start:'+key+':'+slot);workshopPanel();toast('已加入 '+workshopName(slot));
}
function collectCraft(slot){
 const jobs=workshopJobs();slot=Number(slot??0);const j=jobs[slot];
 if(!j||j.endsAt>now())return toast('还在加工中');
 const d=C.recipes[j.recipe];gain(d.out);for(const k of Object.keys(d.out))discover(k);
 jobs[slot]=null;state.stats.crafted++;commit('craft-collect:'+slot);workshopPanel();toast(workshopName(slot)+' 已完成，成品已收入背包');sound('harvest');
}
function sell(k,n){const have=state.inventory[k]||0;n=n==='all'?have:Math.min(have,Number(n));if(!Number.isSafeInteger(n)||n<=0)return toast('没有可出售的物品');state.inventory[k]-=n;state.coins+=n*itemDef(k).sell;commit('sell:'+k);bagPanel();toast(`已出售 ${n} 份${itemDef(k).name}`);}
function claimTask(id){const t=C.tasks.find(t=>t.id===id);if(!t||state.claims.includes(id)||state.stats[t.stat]<t.goal)return;state.claims.push(id);state.coins+=t.coins;commit('task:'+id);tasksPanel();toast('任务奖励 +'+t.coins+' 金币');}
function startActivity(type){if(state.activities[type])return toast('请先完成或收取当前任务');const cost=type==='mine'?3:6;if(state.energy<cost)return toast('体力不足，可在居住区休息');state.energy-=cost;state.activities[type]={endsAt:now()+(type==='mine'?6000:12000)};commit('activity-start:'+type);activityPanel(type);}
function collectActivity(type){const a=state.activities[type];if(!a||a.endsAt>now())return;if(type==='mine'){gain({ore:3,wood:2});state.stats.mined++;}else{state.gems+=10;gain({crystal:2});state.stats.explored++;}state.activities[type]=null;commit('activity-collect:'+type);activityPanel(type);toast(type==='mine'?'获得寒铁矿 ×3、木材 ×2':'探险归来 · 冰晶 +10，冰晶草 ×2');}
function rest(){if(state.energy>=40)return toast('体力已充足');if(state.coins<30)return toast('需要 30 金币');recoverEnergy();state.coins-=30;state.energy=Math.min(40,state.energy+20);if(state.energy===40)state.energyUpdatedAt=now();commit('rest');homePanel();toast('暖炉休息 · 恢复 20 体力');}
function upgradeHome(){const cost=400+Math.max(0,state.level-28)*100;if(state.coins<cost)return toast('金币不足');state.coins-=cost;state.level++;commit('home-upgrade');homePanel();toast('家园升级到 Lv.'+state.level);}
function weather(w){if(!weatherNames[w])return;state.weather=w;commit('weather:'+w);visibleNav();weatherPanel();}
function daily(){const d=new Date().toLocaleDateString('en-CA');if(state.daily===d)return toast('今天已经领取');state.daily=d;state.coins+=200;gain({feed:6});commit('daily-gift');mailPanel();toast('今日补给 · 金币 +200，饲料 +6');}
function companion(){if(!state.companion.owned){if(state.coins<500)return toast('需要 500 金币');state.coins-=500;state.companion.owned=true;state.companion.active=true;}else state.companion.active=!state.companion.active;commit('companion');companionPanel();}
// Region expansion uses spatial free-neighbor discovery, never a fixed list of four unlocks.
function candidates(anchorId=state.selectedRegion){
 const anchor=region(anchorId),occupied=new Set(state.regions.map(r=>r.gx+':'+r.gy)),seen=new Set(),out=[];
 const rs=[anchor,...state.regions.filter(r=>r.id!==anchor.id)];
 for(const r of rs) for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
  const gx=r.gx+dx,gy=r.gy+dy,key=gx+':'+gy;if(occupied.has(key)||seen.has(key))continue;seen.add(key);
  out.push({gx,gy,x:C.grid.originX+(gx-gy)*C.grid.stepX,y:C.grid.originY+(gx+gy)*C.grid.stepY,parent:r.id});
 }
 return out.sort((a,b)=>Math.abs(a.gx-anchor.gx)+Math.abs(a.gy-anchor.gy)-Math.abs(b.gx-anchor.gx)-Math.abs(b.gy-anchor.gy)||b.y-a.y||b.x-a.x);
}
function r14LegacyBeginPlacement(type,anchorId){if(!C.types[type]||['mine','explore'].includes(type))return;const options=candidates(anchorId).filter(p=>!anchorId||region(p.parent).districtId===region(anchorId).districtId),cost=450+state.stats.expansions*150;if(!options.length)return toast('暂未找到足够宽阔的邻接位置');placement={kind:'region',type,options,index:0,cost,districtId:anchorId&&region(anchorId).type===type?region(anchorId).districtId:null};close();$('#placementBar').hidden=false;$('#placementText').textContent=`${C.types[type].name} · ${fmt(cost)} 金币 · 点击蓝色地基可更换位置`;focusPoint(options[0].x,options[0].y,Math.max(.95,camera.s));syncHud();}
function r14LegacyBeginDecoration(type){const cost={pine:60,lamp:80,snowman:100}[type];placement={kind:'decoration',type,cost,point:{x:region().cx,y:region().cy+78}};close();$('#placementBar').hidden=false;$('#placementText').textContent=`放置${{pine:'雪松',lamp:'暖灯',snowman:'雪人'}[type]} · ${cost} 金币 · 点击地面选择位置`;}
function confirmPlacement(){
 if(!placement)return;const p=placement;if(state.coins<p.cost)return toast('金币不足');
 if(p.kind==='decoration'){
  const q=p.point;if(!state.regions.some(r=>Math.abs(q.x-r.cx)/174+Math.abs(q.y-r.cy)/87<.91))return toast('请放在已开垦的雪地上');
  if(state.regions.some(r=>r.cells.some(c=>Math.abs(c.x-q.x)<36&&Math.abs(c.y-q.y)<22)))return toast('这里是经营位置，请放在旁边的雪地上');
  state.coins-=p.cost;state.decorations.push({id:'d'+(++state.seq),type:p.type,x:Math.round(q.x),y:Math.round(q.y),visualRegionId:p.visualRegionId});cancelPlacement();commit('decorate');toast('装饰已放置');return;
 }
 const q=p.options[p.index];if(!q||state.regions.some(r=>r.gx===q.gx&&r.gy===q.gy))return toast('这个位置已经被占用');
 const id='region-'+(++state.seq),kind=C.types[p.type].kind,rows=['animal','fish'].includes(kind)?2:3;
 const r={id,type:p.type,gx:q.gx,gy:q.gy,cx:q.x,cy:q.y,label:[q.x,q.y-84],initial:false,parentId:q.parent,districtId:p.districtId||id,size:92,
 cells:kind==='building'?[]:Array.from({length:rows*3},(_,i)=>{const a=i%3-1,b=Math.floor(i/3)-(rows-1)/2;return {id:id+'-'+i,x:q.x+(a-b)*49,y:q.y+(a+b)*24.5+5,entity:null};})};
 state.coins-=p.cost;state.regions.push(r);state.stats.expansions++;state.selectedRegion=id;cancelPlacement();workshopJobs();commit('expand:'+id);visibleNav();focusPoint(r.cx,r.cy,mobile()?1.25:1.3);toast('新区已开垦 · 与原区域共用同一套地形和素材');
}
function cancelPlacement(){placement=null;$('#placementBar').hidden=true;}
function selectRegion(id,open=true){const r=region(id);state.selectedRegion=r.id;selection=null;cancelPlacement();focusPoint(r.cx,r.cy,mobile()?1.45:1.4);syncHud(true);visibleNav();if(open)regionPanel(r.id);}
function visibleNav(){
 const type=region().type,current=C.types[type],totalCells=state.regions.reduce((n,r)=>n+r.cells.length,0);
 const n=[['plant','nav-plant','种植'],['build','nav-build','扩建'],['bag','nav-bag','仓库'],['workshop','nav-work','工坊']];
 $('#moduleDock').innerHTML=`<div class="module-rail"><div class="module-head"><small>SNOW FARM</small><b>农场经营</b><span>${current.name} · ${weatherNames[state.weather]} · ${state.regions.length} 区域</span><div class="module-badges"><span>${totalCells} 个经营位</span><span>独立存档</span></div></div><button class="module-launcher" data-action="module-hub" aria-label="打开家园模块">${im('nav-quest')}<span class="label">打开农场</span></button><div class="module-shortcuts">${n.map(([a,k,t])=>`<button class="module-btn" data-action="${a}" aria-label="${t}" title="${t}">${im(k)}<span class="label">${t}</span></button>`).join('')}</div></div>`;
}
function syncHud(force=false){if(!force&&now()-lastHud<600)return;lastHud=now();$('#coinCount').textContent=fmt(state.coins);$('#gemCount').textContent=fmt(state.gems);$('#levelLabel').textContent='Lv.'+state.level;$('#weatherPill').textContent=weatherNames[state.weather];$('#weatherLayer').className='weather-layer '+state.weather;const all=state.regions.flatMap(r=>r.cells),readyCount=all.filter(c=>ready(c.entity)).length,careCount=all.filter(c=>c.entity?.hungry).length;$('#missionTitle').textContent=readyCount?readyCount+' 处收成已成熟':'农场正在生长';$('#missionProgress').textContent=`待养护 ${careCount} · 体力 ${state.energy}/40`; $('#islandSummary').textContent=`${state.regions.length} 个区域 · ${state.regions.reduce((n,r)=>n+r.cells.length,0)} 个经营位`;$('#regionTotal').textContent=state.regions.length;
 const list=['veg','flowers','orchard','ranch','fishery','special'];$('#districtList').innerHTML=list.map(type=>{const rs=state.regions.filter(r=>r.type===type),all=rs.flatMap(r=>r.cells),rr=all.filter(c=>ready(c.entity)).length;return `<button class="district-btn ${region().type===type?'active':''}" data-action="goto-type" data-type="${type}">${im(C.types[type].icon)}<span><b>${C.types[type].name}</b><small>${rs.length} 片区域 · ${rr?'可收取 '+rr:all.length+' 个经营位'}</small></span></button>`}).join('');$$('.profile img').forEach(e=>e.style.filter=`hue-rotate(${state.coat*30}deg)`);
 if(placement&&placement.kind==='region')$('#worldTip').textContent='蓝色轮廓是可扩展地基，点击切换位置';else $('#worldTip').textContent=`${C.types[region().type].name} · 拖动地图 / 双指缩放 / 点击经营`;
}
function open(title,body,view,args={}){const wasClosed=$('#modal').hidden,focusEntry=wasClosed||view!==modalView||JSON.stringify(args)!==JSON.stringify(modalArgs);if(wasClosed)lastFocus=document.activeElement;modalGeneration++;refreshPending=false;if(view!=='import-confirm')pendingImport=null;modalView=view;modalArgs=args;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=body;$('#modal').hidden=false;$('#sheet').scrollTop=0;const generation=modalGeneration;setTimeout(()=>{if(focusEntry&&generation===modalGeneration&&!$('#modal').hidden)$('#sheet .close-btn')?.focus({preventScroll:true});},0);updateCountdowns();}
function close(){modalGeneration++;refreshPending=false;pendingImport=null;modalView=null;$('#modal').hidden=true;$('#sheetBody').innerHTML='';if(lastFocus instanceof HTMLElement&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});lastFocus=null;}
function reOpen(){if($('#modal').hidden)return;const active=document.activeElement?.dataset,v=modalView,a=modalArgs;if(v==='cell')cellPanel(a.id,true);else if(v==='workshop')workshopPanel();else if(v==='region')regionPanel(a.id);else if(v==='activity')activityPanel(a.type);else if(v==='farm-status')farmStatus();if(active?.action){const match=$$('#sheet button').find(e=>Object.entries(active).every(([k,value])=>e.dataset[k]===value));(match||$('#sheet .close-btn'))?.focus({preventScroll:true});}}
function countdown(end){return `<span class="countdown" data-end="${end}">${Math.max(0,Math.ceil((end-now())/1000))} 秒</span>`;}
function updateCountdowns(){let ended=false;$$('.countdown').forEach(el=>{const sec=Math.max(0,Math.ceil((Number(el.dataset.end)-now())/1000));el.textContent=sec?sec+' 秒':'已完成';if(!sec)ended=true;});$$('[data-progress-start]').forEach(el=>{const a=Number(el.dataset.progressStart),b=Number(el.dataset.progressEnd);el.style.width=((b<=a?1:Math.min(1,Math.max(0,(now()-a)/(b-a))))*100)+'%';});if(ended&&!refreshPending&&['cell','workshop','activity','region','farm-status'].includes(modalView)){const generation=modalGeneration;refreshPending=true;setTimeout(()=>{if(generation!==modalGeneration||$('#modal').hidden)return;refreshPending=false;const scroll=$('#sheet').scrollTop;reOpen();$('#sheet').scrollTop=scroll;},5);}}
function needText(need){return Object.entries(need).map(([k,n])=>`${itemDef(k).name} ${n}`).join(' + ');}
function regionPanel(id){const r=region(id),t=C.types[r.type];if(t.kind==='building'){if(r.type==='home')return homePanel();if(r.type==='workshop')return workshopPanel();return activityPanel(r.type);}
 const count=r.cells.filter(c=>ready(c.entity)).length,empty=r.cells.filter(c=>!c.entity).length;
 open(t.name,`<p>${t.desc}。每个位置都单独记录品种、生长进度与产物。</p><div class="kpis"><div class="kpi"><b>${r.cells.length}</b><small>经营位置</small></div><div class="kpi"><b>${empty}</b><small>空闲位置</small></div><div class="kpi"><b>${count}</b><small>可以收取</small></div></div><div class="sheet-grid">${r.cells.map((c,i)=>{const e=c.entity,d=e?(e.kind==='crop'?C.crops:e.kind==='animal'?C.animals:C.fish)[e.species]:null;return `<button class="item-card" data-action="cell" data-id="${c.id}">${im(d?.icon||t.icon)}<b>${d?.name||'空闲'+(t.kind==='animal'?'栏位':t.kind==='fish'?'鱼塘':'农田')}</b><small>位置 ${i+1} · ${phase(e)}${e&&!e.hungry&&!ready(e)?' · '+countdown(e.endsAt):''}</small><span class="status-tag ${ready(e)?'ready':''}">${ready(e)?'点击收取':e?.hungry?(e.kind==='crop'?'养护植株':'点击投喂'):e?'查看进度':'开始经营'}</span></button>`}).join('')}</div><div class="wide-actions">${enabledBtn('收取本区（'+count+'）','harvest-region',`data-id="${r.id}"`,count>0,'gold')}${enabledBtn('批量经营','bulk-plan',`data-id="${r.id}"`,empty>0||r.cells.some(c=>c.entity?.hungry))}${btn('扩展本区','expand-same',`data-id="${r.id}"`)}${btn('回地图','close','','subtle')}</div>`,'region',{id});}
function cellPanel(id,inspect=false){const a=locateCell(id);if(!a)return;const {r,c}=a,t=C.types[r.type],e=c.entity;state.selectedRegion=r.id;selection=c.id;syncHud(true);
 if(e&&ready(e)){if(!inspect){harvest(id);close();return;}const d=(e.kind==='crop'?C.crops:e.kind==='animal'?C.animals:C.fish)[e.species];open(d.name,`<div class="detail-hero">${im(d.icon)}<div><strong>${phase(e)}</strong><p>点击下方按钮收取。</p></div></div><div class="wide-actions">${btn('收取产物','harvest-cell',`data-id="${id}"`,'gold')}</div>`,'cell',{id});return;}
 if(!e){let defs,action,ids;if(t.kind==='crop'){defs=C.crops;action='plant-cell';ids=Object.keys(defs).filter(k=>defs[k].family===r.type);}else{defs=t.kind==='animal'?C.animals:C.fish;action='buy-cell';ids=Object.keys(defs);}open(t.kind==='crop'?'选择种子':t.kind==='animal'?'迎接新动物':'投放水产',`<p>${t.name} · ${t.kind==='crop'?'播种后作物会经历发芽、生长、成熟。':t.kind==='animal'?'动物产出后可收取，投喂后进入下一轮生产。':'每个鱼塘独立养成，捕捞后可重新投放。'}</p><div class="sheet-grid">${ids.map(k=>{const d=defs[k];return `<div class="item-card">${im(d.icon)}<b>${d.name}</b><small>${d.seconds} 秒 · 产出 ${d.yield} 份 · 售价 ${d.sell||itemDef(d.product||k).sell}</small>${t.kind==='crop'?`<small class="muted">${familyTone[d.family]} · ${cropDesc(k)}</small>`:''}<span class="price">${d.cost} 金币</span>${enabledBtn(t.kind==='crop'?'播种':t.kind==='animal'?'购入':'投放',action,`data-id="${id}" data-species="${k}"`,state.coins>=d.cost,'gold')}</div>`}).join('')}</div>`,'cell',{id});return;}
 const d=(e.kind==='crop'?C.crops:e.kind==='animal'?C.animals:C.fish)[e.species];
 let acts=e.hungry?btn(e.kind==='crop'?'养护植株 · 肥料 ×1 / 金币 12':'投喂 · 饲料 ×1 / 金币 12','feed',`data-id="${id}"`):enabledBtn('冰晶 ×2 · 立即成熟','speed',`data-id="${id}"`,state.gems>=2,'gold');
 if(e.kind==='crop'&&!e.hungry&&!e.watered)acts+=enabledBtn('浇水 · 体力 2','water',`data-id="${id}"`,state.energy>=2);
 if(e.kind==='fish'&&!e.fed)acts+=enabledBtn('投喂 · 饲料 ×1','feed',`data-id="${id}"`,(state.inventory.feed||0)>0);
 open(d.name,`<div class="detail-hero">${im(d.icon)}<div><strong>${phase(e)}</strong><p>${e.hungry?(e.kind==='crop'?'本轮已采摘，树体或灌木保留；养护后继续结果。':'收成已放入背包，等待新的饲料。'):'剩余 '+countdown(e.endsAt)}</p><small>${t.name} · 独立经营位置</small></div></div>${!e.hungry?`<div class="progress"><i data-progress-start="${e.startedAt}" data-progress-end="${e.endsAt}"></i></div>`:''}<div class="wide-actions">${acts}</div><p>金币 ${fmt(state.coins)} · 冰晶 ${fmt(state.gems)} · 饲料 ${state.inventory.feed||0} · 肥料 ${state.inventory.fertilizer||0} · 体力 ${state.energy}</p>${e.kind==='crop'?btn('铲除作物','confirm-clear',`data-id="${id}"`,'subtle'):''}`,'cell',{id});}
function bulkPanel(id){const r=region(id),kind=C.types[r.type].kind,defs=kind==='crop'?C.crops:kind==='animal'?C.animals:C.fish,empty=r.cells.filter(c=>!c.entity).length,hungry=r.cells.filter(c=>c.entity?.hungry).length,resource=kind==='animal'?'feed':'fertilizer',use=Math.min(hungry,state.inventory[resource]||0),cost=(hungry-use)*12;
open('批量经营 · '+C.types[r.type].name,`<p>仅操作本片区域。整批资源不足时不会扣费；成熟收成请先收取。</p>${hungry?`<div class="panel"><b>${hungry} 个位置待${kind==='animal'?'喂养':'养护'}</b><p>消耗 ${itemDef(resource).name} ×${use}${cost?' + 金币 '+cost:''}</p>${enabledBtn('确认整批养护','bulk-care',`data-id="${r.id}"`,state.coins>=cost,'gold full')}</div>`:''}${empty?`<p>${empty} 个空位，选择同一品种填满：</p><div class="sheet-grid">${Object.entries(defs).filter(([k,d])=>kind!=='crop'||d.family===r.type).map(([k,d])=>`<div class="item-card">${im(d.icon)}<b>${d.name}</b><small>${empty} 个位置 · 共 ${fmt(d.cost*empty)} 金币<br>${d.seconds} 秒 · 每位产出 ${d.yield} 份</small>${enabledBtn('确认'+(kind==='crop'?'播种':kind==='animal'?'购入':'投放'),'bulk-fill',`data-id="${r.id}" data-species="${k}"`,state.coins>=d.cost*empty,'gold')}</div>`).join('')}</div>`:''}${!empty&&!hungry?'<p>这片区域没有待经营的空位或待养护对象。</p>':''}`,'bulk',{id:r.id});}
function bulkFill(id,species){const r=state.regions.find(r=>r.id===id);if(!r)return;const kind=C.types[r.type].kind,defs=kind==='crop'?C.crops:kind==='animal'?C.animals:kind==='fish'?C.fish:null,d=defs?.[species];if(!d||kind==='crop'&&d.family!==r.type)return toast('品种与分区不匹配');const cells=r.cells.filter(c=>!c.entity);if(!cells.length)return toast('已没有空位');const cost=cells.length*d.cost;if(state.coins<cost)return toast('整批金币不足，尚未扣费');const at=now();state.coins-=cost;for(const c of cells)c.entity={kind,species,startedAt:at,endsAt:at+d.seconds*1000,hungry:false,watered:false,fed:false};if(kind==='animal')state.stats.animalsBought+=cells.length;discover(species);commit('bulk-fill:'+id);regionPanel(id);toast('已安排 '+cells.length+' 个位置 · 消耗 '+cost+' 金币');}
function bulkCare(id){const r=state.regions.find(r=>r.id===id);if(!r)return;const cells=r.cells.filter(c=>c.entity?.hungry&&(c.entity.kind==='animal'||c.entity.kind==='crop'&&C.crops[c.entity.species].perennial));if(!cells.length)return toast('没有待养护对象');const resource=C.types[r.type].kind==='animal'?'feed':'fertilizer',use=Math.min(cells.length,state.inventory[resource]||0),cost=(cells.length-use)*12;if(state.coins<cost)return toast('整批资源不足，尚未扣费');state.inventory[resource]=(state.inventory[resource]||0)-use;state.coins-=cost;const at=now();for(const c of cells){const e=c.entity,d=(e.kind==='animal'?C.animals:C.crops)[e.species];e.hungry=false;e.watered=false;e.established=true;e.startedAt=at;e.endsAt=at+d.seconds*1000;}commit('bulk-care:'+id);regionPanel(id);toast('已养护 '+cells.length+' 个位置');}
function farmStatus(){const jobs=workshopJobs(),done=jobs.filter(j=>j&&j.endsAt<=now()).length,next=[...state.regions.flatMap(r=>r.cells).map(c=>c.entity&&!c.entity.hungry?c.entity.endsAt:0),...jobs.map(j=>j?.endsAt||0)].filter(at=>at>now()).sort((a,b)=>a-b)[0];open('农场概览',`<p>收取成熟产物，安排下一轮。离线计时继续；作物不会枯萎，已完成的加工会等你回来。</p>${next?'<p>下一项完成：'+countdown(next)+'</p>':''}<div class="stack">${state.regions.filter(r=>r.cells.length).map(r=>{const readyCount=r.cells.filter(c=>ready(c.entity)).length,hungry=r.cells.filter(c=>c.entity?.hungry).length,empty=r.cells.filter(c=>!c.entity).length;return `<div class="panel row"><div class="grow"><b>${C.types[r.type].name}${r.initial?'':' · '+esc(r.id.split('-')[1])}</b><p>可收 ${readyCount} · 待养护 ${hungry} · 空位 ${empty}</p></div>${btn('进入','region-open',`data-id="${r.id}"`,readyCount?'gold':'subtle')}</div>`;}).join('')}</div><div class="wide-actions">${btn('工坊 · '+done+' 项可领取','workshop','','gold')}${btn('查看仓库','bag','','subtle')}</div><p>体力 ${state.energy}/40，每分钟恢复 1 点。当前余额 ${fmt(state.coins)} 金币。</p>`,'farm-status');}
function guidePanel(){open('经营说明',`<div class="stack"><div class="panel"><h3>1 · 种下，收获，再经营</h3><p>点空位选品种，点成熟作物收获。区域面板可整区收取、批量播种或批量养护。果园采摘后保留植株，消耗肥料或金币继续结果。</p></div><div class="panel"><h3>2 · 让收成流动起来</h3><p>收成先进入仓库。可直接出售赚金币，也能在工坊加工；配方显示材料与产量。动物每轮产出后需喂养，水产捕捞后需重新投放。体力用于浇水，休息或等待可恢复。</p></div><div class="panel"><h3>3 · 扩建确实带来容量</h3><p>蔬菜、花卉、果园和特产每片新增 9 位；牧场与水产每片新增 6 位。每座工坊新增 2 个工位。选择蓝色地基后再确认扣费，取消不扣费。居住区仅为景观与休息入口。</p></div><div class="panel"><h3>4 · 单文件与存档</h3><p>素材全部内嵌，不依赖网络。使用正常浏览器打开 HTML；应用内预览可能限制脚本、下载或存储。关闭后生长和加工继续计时，企鹅仅在前台自动收取。换设备或换文件路径前先导出 JSON。</p></div></div><div class="wide-actions">${btn('回到农场','close','','gold')}${btn('导出存档','export-save','','subtle')}</div>`,'guide');}

function bagPanel(filter='all'){const items=Object.entries(state.inventory).filter(([k,v])=>v>0&&(filter==='all'||(filter==='crop'&&C.crops[k])||(filter==='goods'&&!C.crops[k])));open('背包与仓库',`<div class="tabs">${['all','crop','goods'].map((k,i)=>`<button class="${k===filter?'active':''}" data-action="bag-filter" data-filter="${k}">${['全部物品','农场收成','养殖与制品'][i]}</button>`).join('')}</div><div class="sheet-grid">${items.map(([k,v])=>{const d=itemDef(k);return `<div class="item-card">${im(d.icon)}<b>${d.name} ×${v}</b><small>单价 ${d.sell} 金币</small>${btn('出售 1 份','sell',`data-item="${k}" data-count="1"`,'subtle')}${btn('全部出售','sell',`data-item="${k}" data-count="all"`)}</div>`}).join('')||'<div class="empty">背包还是空的，去收获一些作物吧。</div>'}</div>`,'bag');}
function workshopPanel(){
 const jobs=workshopJobs(),free=jobs.filter(j=>!j).length;
 open('加工工坊',`<p class="tagline">每座加工区提供 2 个独立工位；扩建加工区后会立即增加产线。材料只在成功开工时扣除，完成后手动收取。</p><div class="mini-kpis"><div><b>${jobs.length-free}</b><small>忙碌工位</small></div><div><b>${free}</b><small>空闲工位</small></div><div><b>${state.stats.crafted}</b><small>累计加工</small></div></div><div class="stack" style="margin-top:10px">${jobs.map((j,i)=>`<div class="panel"><div class="row">${im(j?C.recipes[j.recipe].icon:'nav-work','thumb')}<div class="grow"><b>${workshopName(i)}</b><p>${j?(j.endsAt>now()?C.recipes[j.recipe].name+' · 加工中 '+countdown(j.endsAt):C.recipes[j.recipe].name+' · 已完成，可收取'):'当前空闲，可接收新配方'}</p></div>${j&&j.endsAt<=now()?btn('收取','collect-craft',`data-slot="${i}"`,'gold'):''}</div>${j&&j.endsAt>now()?`<div class="progress"><i data-progress-start="${j.startedAt}" data-progress-end="${j.endsAt}"></i></div>`:''}</div>`).join('')}</div><div class="stack" style="margin-top:10px">${Object.entries(C.recipes).map(([key,d])=>`<div class="panel"><div class="row">${im(d.icon,'thumb')}<div class="grow"><b>${d.name}</b><p>${needText(d.need)}</p><small class="muted">${d.seconds} 秒 · 产出 ${needText(d.out)}</small></div>${enabledBtn(free?afford(d.need)?'加入空闲工位':'材料不足':'工位已满','craft',`data-recipe="${key}" data-slot="${freeWorkshopSlot()}"`,free>0&&afford(d.need),'gold')}</div></div>`).join('')}</div>`,'workshop');
}
function tasksPanel(){open('家园任务',`<p>完成目标后手动领取奖励。已领取的任务不会重复发放。</p><div class="stack">${C.tasks.map(t=>{const val=Math.min(t.goal,state.stats[t.stat]),claimed=state.claims.includes(t.id);return `<div class="panel"><div class="row"><div class="grow"><b>${t.title}</b><p>${t.desc} · ${val}/${t.goal}</p></div>${enabledBtn(claimed?'已领取':val>=t.goal?'领取奖励':'进行中','claim-task',`data-id="${t.id}"`,!claimed&&val>=t.goal,'gold')}</div><div class="progress"><i style="width:${val/t.goal*100}%"></i></div><small class="muted">奖励：${t.coins} 金币</small></div>`}).join('')}</div>`,'tasks');}
function mapPanel(){open('区域导航',`<p>点击定位对应的区域。新扩建的区域会自动出现在这里。</p><div class="sheet-grid">${state.regions.map((r,i)=>`<button class="item-card" data-action="goto" data-id="${r.id}">${im(C.types[r.type].icon)}<b>${C.types[r.type].name}${r.initial?'':' · '+r.id.split('-')[1]}</b><small>${r.cells.length?r.cells.length+' 个经营位置':'功能建筑'}${r.initial?'':' · 新开垦'}</small></button>`).join('')}</div><div class="wide-actions">${btn('查看全岛','overview-close','','subtle')}${btn('继续扩建','expand','','gold')}</div>`,'map');}
function expansionPanel(sameId=null){
 if(sameId&&['mine','explore'].includes(region(sameId).type))sameId=null;
 const r=sameId?region(sameId):null,types=r?[r.type]:['veg','flowers','orchard','ranch','fishery','special','home','workshop'];
 open(r?'扩展'+C.types[r.type].name:'开拓新的冰原',`<p>新增的每一块地都是独立模块，会自动接入地图、导航和存档。${r?'当前会继续扩张同一条分区。':'可以自由选择扩建方向与功能。'}</p><div class="mini-kpis"><div><b>${state.regions.length}</b><small>已有区域</small></div><div><b>${state.stats.expansions}</b><small>累计扩建</small></div><div><b>${450+state.stats.expansions*150}</b><small>本次花费</small></div></div><div class="sheet-grid">${types.map(k=>{const kind=C.types[k].kind,cap=kind==='crop'?9:kind==='animal'||kind==='fish'?6:1,built=state.regions.filter(r=>r.type===k).length,cells=state.regions.filter(r=>r.type===k).reduce((n,r)=>n+r.cells.length,0);return `<div class="item-card">${im(C.types[k].icon)}<b>${C.types[k].name}</b><small>${C.types[k].desc}</small><small class="muted">当前 ${built} 区 · ${kind==='building'?(k==='workshop'?'每新区新增 2 个工位':'景观与休息入口，不增加产能'):'总经营位 '+cells+' / 每新区 '+cap+' 位'}</small>${btn(r?'预览邻接地块':'预览放置','place-region',`data-type="${k}" ${sameId?`data-anchor="${sameId}"`:''}`,'gold')}</div>`}).join('')}</div>`,'expand');
}
function buildPanel(){open('建造与扩建',`<div class="detail-hero">${im('nav-build')}<div><strong>让家园自由生长</strong><p>每一个分区都可继续动态扩展。<br>每个新区都是真正可经营的地块；每座新工坊增加两个工位。</p></div></div><div class="wide-actions">${btn('新增区域','expand','','gold')}${btn('扩展当前分区','expand-same',`data-id="${region().id}"`)}</div><div class="mini-kpis"><div><b>${state.regions.length}</b><small>总区域</small></div><div><b>${state.stats.expansions}</b><small>累计扩建</small></div><div><b>${state.decorations.length}</b><small>摆放装饰</small></div></div><p style="margin-top:18px">为雪地添一点生活气息</p><div class="sheet-grid">${[['pine','pine','雪松',60],['lamp','nav-build','暖灯',80],['snowman','penguin','雪人',100]].map(([k,a,n,c])=>`<div class="item-card">${im(a)}<b>${n}</b><small>${c} 金币</small>${btn('选择位置','decorate',`data-type="${k}"`,'subtle')}</div>`).join('')}</div>`,'build');}
function r14LegacyHomePanel(){open('居住区 · 我的家园',`<div class="detail-hero">${im('avatar')}<div><strong>极地农夫 · Lv.${state.level}</strong><p>已有 ${state.regions.length} 片区域<br>累计收获 ${state.stats.harvests} 次</p></div></div><div class="kpis"><div class="kpi"><b>${state.energy}/40</b><small>当前体力</small></div><div class="kpi"><b>${state.decorations.length}</b><small>已摆放装饰</small></div><div class="kpi"><b>${state.discovered.length}</b><small>已发现条目</small></div></div><div class="wide-actions">${btn('升级主屋 · '+(400+Math.max(0,state.level-28)*100),'upgrade-home','','gold')}${enabledBtn('暖炉休息 · 30 金币','rest','',state.energy<40)}</div><div class="wide-actions">${btn('伙伴小屋','companion','','subtle')}${btn('切换冬装配色','coat','','subtle')}${btn('农场存档','settings','','subtle')}</div>`,'home');}
function companionPanel(){open('企鹅伙伴',`<div class="detail-hero">${im('penguin')}<div><strong>勤快的小企鹅</strong><p>在页面前台时每 3 秒收取一块成熟作物。<br>离线期间作物仍会成熟，伙伴不会代购或重复收获。</p></div></div><p>状态：${state.companion.owned?(state.companion.active?'正在巡田':'正在休息'):'还未入住'}</p>${btn(state.companion.owned?(state.companion.active?'让伙伴休息':'开始自动收获'):'500 金币 · 邀请入住','toggle-companion','','gold full')}`,'companion');}
function activityPanel(type){const a=state.activities[type],mine=type==='mine';open(mine?'矿场 · 采集资源':'雪山 · 遗迹探险',`<div class="detail-hero">${im(mine?'gem':'nav-explore')}<div><strong>${mine?'冰下的宝藏':'通往雪山的路'}</strong><p>${mine?'采集寒铁矿与木材，建设你的家园。':'带上行囊，寻找冰原深处的晶石。'}</p></div></div><p>体力 ${state.energy}/40 · 本次消耗 ${mine?3:6} 体力</p>${a?(a.endsAt>now()?`<div class="panel"><b>${mine?'采集中':'探险中'} · ${countdown(a.endsAt)}</b></div>`:btn('收取本次奖励','collect-activity',`data-type="${type}"`,'gold full')):btn(mine?'开始采集 · 6 秒':'出发探险 · 12 秒','start-activity',`data-type="${type}"`,'gold full')}`,'activity',{type});}
const weatherThumbs={};
function weatherThumb(k){
 if(weatherThumbs[k])return weatherThumbs[k];
 const cv=document.createElement('canvas');cv.width=160;cv.height=88;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
 ENV.drawOcean(c,{minX:0,minY:0,maxX:160,maxY:88},1,k,[]);
 poly(c,[[43,50],[78,32],[129,51],[89,75]],'#78bcdd');poly(c,[[43,45],[78,27],[129,46],[89,70]],'#e5f4fc');
 if(art['cottage-medium'])c.drawImage(art['cottage-medium'],64,15,50,45);
 ENV.drawWeather(c,160,88,1,k,[{x:87,y:49,kind:'window'}],{x:0,y:0,s:1},true);
 return weatherThumbs[k]=cv.toDataURL();
}
function weatherPanel(){open('冰原天气',`<p>六种天气各有独立海色、光照与动态。天气只改变视觉，不修改作物生长时间或产量。关闭场景动画后，雪花与光带停在静态画面。</p><div class="weather-grid">${Object.entries(ENV.modes).map(([k,m])=>`<button class="weather-choice ${state.weather===k?'current':''}" data-action="set-weather" data-weather="${k}" aria-pressed="${state.weather===k}"><img src="${weatherThumb(k)}" alt="${m.name}预览"><strong>${m.name}</strong><small>${m.description}</small></button>`).join('')}</div>`,'weather');}
function mailPanel(){const d=new Date().toLocaleDateString('en-CA');open('邮件与补给',`<div class="stack"><div class="panel"><h3>欢迎来到冰原家园</h3><p>为第一季播种备好一篮小麦、蓝莓和饲料。</p>${enabledBtn(state.mailClaimed?'已领取新手物资':'领取新手物资','claim-mail','',!state.mailClaimed,'gold full')}</div><div class="panel"><h3>今日暖心补给</h3><p>200 金币 + 6 份饲料，每个本地自然日可领取一次。</p>${enabledBtn(state.daily===d?'今天已经领取':'领取今日补给','daily','',state.daily!==d,'gold full')}</div></div>`,'mail');}
function bookPanel(){const entries=[...Object.entries(C.crops),...Object.entries(C.animals),...Object.entries(C.fish)];open('冰原图鉴',`<p>播种、购入或投放对应品种即可点亮图鉴。已发现 ${entries.filter(([k])=>state.discovered.includes(k)).length} / ${entries.length} 个经营品种。</p><div class="sheet-grid">${entries.map(([k,d])=>`<div class="item-card" style="${state.discovered.includes(k)?'':'filter:grayscale(1);opacity:.6'}">${im(d.icon)}<b>${d.name}</b><small>${state.discovered.includes(k)?'已发现':'等待探索'} · ${d.seconds} 秒</small></div>`).join('')}</div>`,'book');}
function tradePanel(){open('物资商人',`<div class="detail-hero">${im('npc')}<div><strong>“换一点温暖的物资吧。”</strong><p>多余的收成，可以换成下一季的准备。</p></div></div><div class="stack" style="margin-top:12px"><div class="panel"><div class="row"><b>胡萝卜 ×3 → 饲料 ×4</b>${enabledBtn('交换','trade-exchange','',afford({carrot:3}),'gold')}</div></div><div class="panel"><div class="row"><b>金币 120 → 饲料 ×10</b>${enabledBtn('购买','buy-feed','',state.coins>=120)}</div></div></div>`,'trade');}
function achievementPanel(){const total=state.stats.harvests+state.stats.animalCollects+state.stats.fishHarvests;open('家园成就',`<div class="detail-hero">${im('achievement')}<div><strong>${total>=10?'勤劳的经营者':'初到冰原'}</strong><p>共完成 ${total} 次收获与收取<br>已开拓 ${state.stats.expansions} 个新区域</p></div></div><div class="stack" style="margin-top:12px">${[[10,'第一桶金'],[30,'冰原园丁'],[100,'丰收大师']].map(([n,t])=>`<div class="panel"><div class="row"><b>${t}</b><span class="status-tag ${total>=n?'ready':''}">${Math.min(total,n)} / ${n}</span></div><div class="progress"><i style="width:${Math.min(100,total/n*100)}%"></i></div></div>`).join('')}</div>`,'achievement');}
function moduleHub(){const arr=[['plant','nav-plant','种植区'],['flowers','flower_4','花卉区'],['orchard','apple_4','果园区'],['special','crystalgrass_4','特色作物'],['ranch','nav-ranch','养殖区'],['fishery','nav-fish','水产区'],['build','nav-build','建造扩建'],['workshop','nav-work','加工工坊'],['bag','nav-bag','背包仓库'],['book','nav-book','冰原图鉴'],['farm-status','nav-plant','农场概览'],['more','nav-book','农场工具']];open('家园模块入口',`<p>选择分区进入经营；扩建区域会自动加入导航。收成先进入仓库，可出售或交给工坊加工。</p><div class="mini-kpis"><div><b>${state.regions.length}</b><small>区域</small></div><div><b>${state.regions.reduce((n,r)=>n+r.cells.length,0)}</b><small>经营位</small></div><div><b>${state.stats.crafted}</b><small>加工次数</small></div></div><div class="sheet-grid">${arr.map(([a,k,n])=>`<button class="item-card" data-action="${['flowers','orchard','special'].includes(a)?'goto-type':a}" ${['flowers','orchard','special'].includes(a)?`data-type="${a}"`:''}>${im(k)}<b>${n}</b></button>`).join('')}</div>`,'module-hub');}
function morePanel(){const arr=[['book','nav-book','冰原图鉴'],['map','nav-explore','区域地图'],['weather','crystal_4','天气光照'],['companion','penguin','企鹅伙伴'],['trade','npc','物资商人'],['settings','nav-bag','存档与备份'],['guide','nav-book','经营说明']];open('农场工具',`<div class="sheet-grid">${arr.map(([a,k,n])=>`<button class="item-card" data-action="${a}">${im(k)}<b>${n}</b></button>`).join('')}</div>`,'more');}
function gardenReview(){open('花卉与晶体 · 实际生长素材',`<p>下方是游戏正在使用的独立前景。地面另画一次；花卉与水晶草均有五个阶段。雪莲白色花瓣已单独检查，未使用全图去白。</p><div class="crop-review tone-water">${[...CA.flowers,...CA.specials].map(k=>`<section><h3>${C.crops[k].name}</h3><div class="crop-stage-row">${Array.from({length:5},(_,i)=>`<figure>${im(k+'_garden_'+i)}<figcaption>${['播种','萌芽','枝叶','初绽','盛开'][i]}</figcaption></figure>`).join('')}</div></section>`).join('')}</div>`,'garden-review');}
function settingsPanel(){open('农场存档与备份',`<div class="stack"><div class="panel row"><div><b>操作音效</b><p>轻柔的点击与收获提示音</p></div>${btn(state.sound?'已开启':'已关闭','toggle-sound','','subtle')}</div><div class="panel row"><div><b>场景动画</b><p>作物轻摆、落雪、水面与暖炉烟雾</p></div>${btn(state.motion?'已开启':'已关闭','toggle-motion','','subtle')}</div><div class="panel"><h3>农场存档</h3><p>${protectedSave!==null?'原存档暂时无法识别，已停止覆盖。请先导出原存档备份，再决定导入或重置。':storageAvailable?'当前浏览器自动保存。关闭后重新打开可继续经营。':'当前浏览器环境限制本地存储。请导出 JSON，避免丢失进度。'}<br>离线时生长与加工继续计时；体力每分钟恢复 1 点。不同浏览器、设备或文件路径可能使用不同存储，换版本前请导出 JSON。</p><div class="wide-actions">${btn('导出存档','export-save')}${btn('导入存档','import-save','','subtle')}${btn('导出替换前备份','export-backup','','subtle')}</div></div><div class="wide-actions">${btn('保存家园截图','screenshot','','subtle')}${btn('清除已摆装饰','confirm-decor-clear','','subtle')}</div>${protectedSave!==null?btn('导出未能识别的原存档','export-protected','','subtle full'):''}${btn('查看花卉与晶体生长素材','garden-review','','subtle full')}${btn('查看蔬菜与果园生长素材','crop-review','','subtle full')}${btn('查看建筑与船只素材','art-review','','subtle full')}${btn('重置这座农场','confirm-reset','','danger full')}</div>`,'settings');}
function cropReviewPanel(tone='snow'){
 const tones=['snow','water','dark'];if(!tones.includes(tone))tone='snow';
 const names=[...CA.vegetables,...CA.orchard], stages=['播种 / 幼苗','枝叶生长','生长 / 开花','结果 / 膨大','成熟可收','积雪成熟'];
 open('蔬菜与果园 · 实装素材',`<p>这里展示的就是地图使用的独立前景。土壤单独绘制，地面不随枝叶摆动。果树和浆果采摘后保留枝叶，养护后继续结果。</p><div class="tabs">${tones.map((v,i)=>`<button data-action="crop-review-tone" data-tone="${v}" class="${v===tone?'active':''}">${['雪地底','水面底','深色底'][i]}</button>`).join('')}</div><div class="crop-review tone-${tone}">${names.map(name=>`<section><h3>${C.crops[name].name}</h3><div class="crop-stage-row">${Array.from({length:CA.vegetables.includes(name)?5:6},(_,i)=>{const key=name+(CA.vegetables.includes(name)?'_field_':'_orchard_')+i;return `<figure>${im(key)}<figcaption>${stages[i]}</figcaption></figure>`}).join('')}</div></section>`).join('')}</div>`,'crop-review',{tone});
}
function referencePanel(){open('原设计稿对照',`<p>本版以你确认的第三版冰原航图设计为依据。游戏地图由独立地形、建筑与经营对象实时组合，不把整张设计图当作地图。</p><img class="reference-image" src="${AS['design-reference']}" alt="本轮依据的冰原家园设计稿">`,'reference');}
function portPanel(){
 open('冰原港口',`<div class="port-hero">${im('boat')}<div><strong>雪岸渔船</strong><p>渔船、码头与水花分开绘制，点击下方入口管理水产。</p></div></div><div class="wide-actions">${btn('管理鱼塘','fishery','','gold')}${btn('港口补给','trade')}${btn('查看收成','bag','','subtle')}</div>`,'port');
}
function artReviewPanel(){
 const keys=['cottage','hut','greenhouse','workshop','barn','storehouse','boat','rowboat','dock-long','lighthouse','pine','lamp'];
 open('建筑与港口 · 素材检视',`<p>下列是实际运行资源。浅色、海水色和深色底交替展示透明边缘；每张建筑只有一层完整轮廓，没有原场景矩形底图。</p><div class="asset-inspector">${keys.map((k,i)=>`<figure class="art-item tone-${i%3}">${im(k)}<figcaption>${esc(k)} · ${AM[k].width}×${AM[k].height}</figcaption></figure>`).join('')}</div><p>烟雾、游鱼和水波均使用新生成的四帧序列，角色、鲸与旗帜也有独立序列。此轮更新保留原来的经营存档。</p>`,'art-review');
}
function exportFile(data,name,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function exportSave(){exportFile(JSON.stringify(state,null,2),'ice-homestead-save.json','application/json');toast('存档已导出');}
function screenshot(){const cv=document.createElement('canvas');cv.width=canvas.width;cv.height=canvas.height;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(canvas,0,0);for(const h of labelHits){if(art[h.asset])c.drawImage(art[h.asset],h.left,h.top,h.right-h.left,h.bottom-h.top);}const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='ice-homestead-world-r10.png';a.click();toast('已保存当前家园视野（含区域标牌，不含操作面板）');}
function allRegionHarvest(id){let n=0;for(const c of region(id).cells)if(harvest(c.id,true))n++;if(n){commit('harvest-region:'+id);toast('已收取 '+n+' 个经营位');}regionPanel(id);}
function r14LegacyHandle(action,d){sound();switch(action){
 case 'region-open':return selectRegion(d.id);case 'guide':return guidePanel();case 'farm-status':return farmStatus();case 'bulk-plan':return bulkPanel(d.id);case 'bulk-fill':return bulkFill(d.id,d.species);case 'bulk-care':return bulkCare(d.id);case 'import-confirm':return applyImport();case 'export-backup':return exportBackup();case 'export-protected':if(protectedSave!==null)exportFile(protectedSave,'ice-original-save-backup.json','application/json');return;case 'crop-review':return cropReviewPanel();case 'crop-review-tone':return cropReviewPanel(d.tone);case 'art-review':return artReviewPanel();case 'port':return portPanel();
 case 'toggle-labels':state.hideLabels=!state.hideLabels;commit('labels');return;case 'close':return close();case 'module-hub':return moduleHub();case 'home':return homePanel();case 'build':return buildPanel();case 'plant':return selectRegion(['veg','flowers','orchard','special'].includes(region().type)?region().id:state.regions.find(r=>r.type==='veg').id);
 case 'garden-review':return gardenReview();case 'ranch':return selectRegion(region().type==='ranch'?region().id:state.regions.find(r=>r.type==='ranch').id);case 'fishery':return selectRegion(region().type==='fishery'?region().id:state.regions.find(r=>r.type==='fishery').id);case 'bag':return bagPanel();case 'workshop':return workshopPanel();case 'book':return bookPanel();case 'tasks':return tasksPanel();case 'more':return morePanel();case 'settings':return settingsPanel();case 'map':return mapPanel();case 'weather':return weatherPanel();case 'reference':return referencePanel();case 'mail':return mailPanel();case 'companion':return companionPanel();case 'trade':return tradePanel();case 'achievement':return achievementPanel();case 'mine':case 'explore':return activityPanel(action);
 case 'cell':return cellPanel(d.id);case 'harvest-cell':harvest(d.id);close();return;case 'plant-cell':return plant(d.id,d.species);case 'buy-cell':return buy(d.id,d.species);case 'feed':return feed(d.id);case 'speed':return speed(d.id);case 'water':return water(d.id);case 'craft':return beginCraft(d.recipe,d.slot);case 'collect-craft':return collectCraft(d.slot);case 'sell':return sell(d.item,d.count);case 'bag-filter':return bagPanel(d.filter);case 'claim-task':return claimTask(d.id);case 'harvest-region':return allRegionHarvest(d.id);
 case 'confirm-clear':return open('铲除这株作物？',`<p>已消耗的种子金币不会退回。铲除后可以重新播种。</p><div class="wide-actions">${btn('确认铲除','clear-cell',`data-id="${d.id}"`,'danger')}${btn('保留作物','cell',`data-id="${d.id}"`,'subtle')}</div>`,'confirm');case 'clear-cell':{const c=locateCell(d.id)?.c;if(c?.entity?.kind==='crop'){c.entity=null;commit('clear:'+d.id);close();}return;}
 case 'expand':return expansionPanel();case 'expand-same':return expansionPanel(d.id);case 'place-region':return beginPlacement(d.type,d.anchor);case 'confirm-place':return confirmPlacement();case 'cancel-place':return cancelPlacement();case 'decorate':return beginDecoration(d.type);
 case 'goto':return selectRegion(d.id,false),close();case 'goto-type':return selectRegion(state.regions.find(r=>r.type===d.type).id,false),close();case 'overview':return overview();case 'overview-close':close();return overview();case 'focus':return focusPoint(region().cx,region().cy,mobile()?1.5:1.4);case 'zoom-in':return zoomAt(1.2,W*.5,H*.52);case 'zoom-out':return zoomAt(1/1.2,W*.5,H*.52);
 case 'set-weather':return weather(d.weather);case 'upgrade-home':return upgradeHome();case 'rest':return rest();case 'coat':state.coat=(state.coat+1)%5;commit('coat');homePanel();return;case 'start-activity':return startActivity(d.type);case 'collect-activity':return collectActivity(d.type);case 'toggle-companion':return companion();case 'daily':return daily();case 'claim-mail':if(!state.mailClaimed){state.mailClaimed=true;gain({wheat:6,blueberry:6,feed:6});commit('mail');mailPanel();toast('新手物资已收入背包');}return;
 case 'trade':return tradePanel();case 'buy-feed':if(state.coins>=120){state.coins-=120;gain({feed:10});commit('buy-feed');tradePanel();toast('已购入饲料 ×10');}return;
 case 'toggle-sound':state.sound=!state.sound;commit('sound');settingsPanel();return;case 'toggle-motion':state.motion=!state.motion;commit('motion');settingsPanel();return;case 'export-save':return exportSave();case 'import-save':return $('#importInput').click();case 'screenshot':return screenshot();
 case 'confirm-reset':return open('重置这座农场？',`<p>会用初始农场替换当前进度。替换前会保留一份备份；建议先导出 JSON。</p><div class="wide-actions">${btn('确认重置','reset','', 'danger')}${btn('返回存档','settings','','subtle')}</div>`,'confirm');case 'reset':makeBackup();protectedSave=null;state=baseState();selection=null;cancelPlacement();commit('reset');close();visibleNav();initialCamera();return;
 case 'confirm-decor-clear':return open('移除全部装饰？',`<p>只移除后来摆放的装饰，不影响土地、建筑与作物。金币不退回。</p><div class="wide-actions">${btn('确认移除','clear-decor','','danger')}${btn('取消','settings','','subtle')}</div>`,'confirm');case 'clear-decor':state.decorations=[];commit('clear-decor');settingsPanel();return;
 default:throw Error('未实现的操作：'+action);
 }}
// A canvas pointer-up may open a sheet underneath that same finger. Consume
// only its synthesized click; a new intentional UI pointer-down resets the guard.
// This prevents a single tap on empty land from also buying the first seed.
let canvasGestureClick=false;
document.addEventListener('pointerdown',e=>{canvasGestureClick=e.target===canvas;},true);
document.addEventListener('keydown',()=>{canvasGestureClick=false;},true);
document.addEventListener('click',e=>{if(canvasGestureClick){canvasGestureClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
// Single delegated listener also covers dynamically created regions and menus.
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const d={...b.dataset};if(d.action==='trade-exchange'){if(take({carrot:3})){gain({feed:4});commit('trade-exchange');tradePanel();toast('交换完成');}return;}try{handle(d.action,d);}catch(err){metrics.errors.push(String(err));console.error(err);toast('操作未完成，请重试或导出存档');}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();cancelPlacement();}if(!$('#modal').hidden&&e.key==='Tab'){const els=$$('#sheet button:not([disabled]),#sheet input,#sheet a');if(!els.length)return;const a=els[0],z=els.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});
$('#importInput').addEventListener('change',async e=>{const input=e.target,f=input.files[0],generation=modalGeneration,request=++importRequest;if(!f)return;try{if(f.size>16e6)throw Error('存档文件超过 16 MB');const parsed=validState(JSON.parse(await f.text()));if(request!==importRequest||generation!==modalGeneration)return;pendingImport=parsed;open('确认导入这份农场？',`<p>文件：${esc(f.name)}<br>${parsed.regions.length} 片区域 · 金币 ${fmt(parsed.coins)} · ${parsed.stats.harvests} 次作物收获</p><div class="farm-note">确认后会替换当前进度，替换前的进度会保留为一份备份。建议先导出当前存档。</div><div class="wide-actions">${btn('导出当前存档','export-save','','subtle')}${btn('确认导入','import-confirm','','gold')}${btn('取消','settings','','subtle')}</div>`,'import-confirm');}catch(err){if(request===importRequest&&generation===modalGeneration)toast('导入失败：'+err.message);}finally{if(request===importRequest)input.value='';}});
function mobile(){return innerWidth<=768;}
function bounds(){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const r of state.regions){minX=Math.min(minX,r.cx-184);minY=Math.min(minY,r.cy-(r.type==='explore'?235:155));maxX=Math.max(maxX,r.cx+184);maxY=Math.max(maxY,r.cy+140);}const f=harborOrigin()?.r;if(f){minX=Math.min(minX,f.cx-278);maxX=Math.max(maxX,f.cx+240);maxY=Math.max(maxY,f.cy+282);}return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};}
function worldToScreen(x,y){return {x:x*camera.s+camera.x,y:y*camera.s+camera.y};}
function screenToWorld(x,y){return {x:(x-camera.x)/camera.s,y:(y-camera.y)/camera.s};}
function constrain(){const b=bounds(),pad=110;camera.x=Math.max(W-(b.maxX+pad)*camera.s,Math.min(-(b.minX-pad)*camera.s+W*.15,camera.x));camera.y=Math.max(H-90-(b.maxY+pad)*camera.s,Math.min(100-(b.minY-pad)*camera.s,camera.y));}
function cameraFloor(){const b=bounds();return Math.max(Number.EPSILON,Math.min(.22,(Math.max(50,W)-20)/(b.w+30),(Math.max(182,H)-132)/(b.h+20)));}
function focusPoint(x,y,s=camera.s){camera.s=Math.min(2.6,Math.max(cameraFloor(),s));camera.x=W*.5-x*camera.s;camera.y=H*.53-y*camera.s;constrain();}
function zoomAt(f,x,y){const p=screenToWorld(x,y);camera.s=Math.min(2.6,Math.max(cameraFloor(),camera.s*f));camera.x=x-p.x*camera.s;camera.y=y-p.y*camera.s;constrain();}
function overview(){const b=bounds(),top=mobile()?106:100,bottom=mobile()?26:28;camera.s=Math.min((W-20)/(b.w+30),(H-top-bottom)/(b.h+20));camera.s=Math.max(Number.EPSILON,camera.s);camera.x=(W-b.w*camera.s)/2-b.minX*camera.s;camera.y=top+(H-top-bottom-b.h*camera.s)/2-b.minY*camera.s;}
function initialCamera(){if(mobile())focusPoint(320,448,.95);else overview();}
function resize(){game.style.height='';const oldW=W,oldH=H,p=oldW?screenToWorld(W/2,H/2):null;W=game.clientWidth;H=game.clientHeight;DPR=1;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);if(!oldW)initialCamera();else if(p){camera.x=W/2-p.x*camera.s;camera.y=H/2-p.y*camera.s;constrain();}}
const ro=new ResizeObserver(resize);ro.observe(game);
function pointerPos(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{if(!started)return;e.preventDefault();const p=pointerPos(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);if(pointers.size===1){drag={start:p,last:p,moved:false};suppressTap=false;}else if(pointers.size===2){const [a,b]=[...pointers.values()],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale:camera.s,world:screenToWorld(cx,cy)};suppressTap=true;drag=null;}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=pointerPos(e);pointers.set(e.pointerId,p);if(pointers.size>=2&&pinch){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);camera.s=Math.max(cameraFloor(),Math.min(2.6,pinch.scale*distance/Math.max(pinch.distance,1)));camera.x=(a.x+b.x)/2-pinch.world.x*camera.s;camera.y=(a.y+b.y)/2-pinch.world.y*camera.s;constrain();return;}if(drag){const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(Math.hypot(dx,dy)>7)drag.moved=true;if(drag.moved){camera.x+=p.x-drag.last.x;camera.y+=p.y-drag.last.y;constrain();}drag.last=p;}});
function pointerUp(e,cancel=false){e.preventDefault();const p=pointerPos(e),tap=!cancel&&!suppressTap&&drag&&!drag.moved&&pointers.size===1;pointers.delete(e.pointerId);if(pointers.size===1){const a=[...pointers.values()][0];drag={start:a,last:a,moved:true};pinch=null;suppressTap=true;}else if(!pointers.size){drag=null;pinch=null;}if(tap)tapWorld(screenToWorld(p.x,p.y));}
canvas.addEventListener('pointerup',e=>pointerUp(e));canvas.addEventListener('pointercancel',e=>pointerUp(e,true));
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pointerPos(e);zoomAt(Math.exp(-e.deltaY*.0012),p.x,p.y);},{passive:false});
canvas.addEventListener('keydown',e=>{const dirs={ArrowLeft:[32,0],ArrowRight:[-32,0],ArrowUp:[0,32],ArrowDown:[0,-32]};if(dirs[e.key]){e.preventDefault();camera.x+=dirs[e.key][0];camera.y+=dirs[e.key][1];constrain();}if(e.key==='+'||e.key==='=')zoomAt(1.2,W/2,H/2);if(e.key==='-')zoomAt(1/1.2,W/2,H/2);});
function tapWorld(p){
 if(placement){if(placement.kind==='decoration'){placement.point=p;return;}let best=-1,dist=Infinity;placement.options.forEach((a,i)=>{const d=Math.abs(a.x-p.x)/100+Math.abs(a.y-p.y)/60;if(d<1.3&&d<dist){best=i;dist=d;}});if(best>=0){placement.index=best;toast('位置已选择，点击“在此建造”确认');}return;}
 const sign=hitLabel(p);if(sign){if(sign.id==='__frontier')return expansionPanel();state.selectedRegion=sign.id;regionPanel(sign.id);syncHud(true);return;}
 const clickedCrop=hitCrop(p);
 if(clickedCrop){const a=locateCell(clickedCrop);if(a){state.selectedRegion=a.r.id;selection=clickedCrop;if(ready(a.c.entity))harvest(clickedCrop);else cellPanel(clickedCrop);return;}}
 let best=null,dd=Infinity;for(const r of state.regions)for(const c of r.cells){const d=Math.abs(p.x-c.x)/(r.size*.49)+Math.abs(p.y-c.y)/(r.size*.245);if(d<1&&d<dd){best={r,c};dd=d;}}
 if(best){state.selectedRegion=best.r.id;selection=best.c.id;if(ready(best.c.entity)){harvest(best.c.id);return;}cellPanel(best.c.id);return;}
 const prop=hitProp(p);if(prop){state.selectedRegion=prop.regionId||state.selectedRegion;handle(prop.action,{});return;}
 const f=frontier();if(f&&Math.abs(p.x-f.x)/160+Math.abs(p.y-f.y)/80<1)return expansionPanel();
 if(Math.hypot(p.x-540,p.y-623)<28)return companionPanel();
 if(Math.hypot(p.x-390,p.y-310)<25)return tradePanel();
 selection=null;
}
let miniBounds=null;
mini.addEventListener('pointerdown',e=>{e.preventDefault();if(!miniBounds)return;const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*190,y=(e.clientY-r.top)/r.height*115,b=miniBounds;focusPoint((x-b.ox)/b.s+b.minX,(y-b.oy)/b.s+b.minY);});
// Pixel scene renderer. The source poster is ONLY used in the reference dialog.
// Each ground patch, fence, building, crop and animal is a separate world object.
function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function poly(c,ps,fill,stroke,width=1){c.beginPath();ps.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function sprite(k,x,y,w,h=w,anchor=.5,alpha=1){const a=art[k];if(!a?.width)return;const sc=Math.min(w/a.width,h/a.height),dw=Math.round(a.width*sc),dh=Math.round(a.height*sc);ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(a,Math.round(x-dw/2),Math.round(y-dh*anchor),dw,dh);ctx.restore();}
function animated(k,x,y,w,h,t,anchor=1){const a=art[k+'-idle'];if(!a?.width)return sprite(k,x,y,w,h,anchor);const fw=a.width/8,fh=a.height,f=state.motion?Math.floor(t*8)%8:0,sc=Math.min(w/fw,h/fh),dw=Math.round(fw*sc),dh=Math.round(fh*sc);ctx.drawImage(a,fw*f,0,fw,fh,Math.round(x-dw/2),Math.round(y-dh*anchor),dw,dh);}
function text(c,t,x,y,s=12,color='#fff',weight=700,align='center'){c.font=`${weight} ${s}px system-ui,"Microsoft YaHei",sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(t,Math.round(x),Math.round(y));}
function hash(n){const x=Math.sin(n*127.1+47.7)*43758.5453;return x-Math.floor(x);}
function rectangle(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function diamond(x,y,w,h,color,edge){poly(ctx,[[x,y-h],[x+w,y],[x,y+h],[x-w,y]],color,edge);}
function corridors(){return [[1,1],[2,2]].filter(([gx,gy])=>!state.regions.some(r=>r.gx===gx&&r.gy===gy)).map(([gx,gy])=>({gx,gy,cx:550+(gx-gy)*180,cy:190+(gx+gy)*90,type:'walkway',cells:[],districtId:'path'}));}
function adjacent(r,dx,dy){return [...state.regions,...corridors()].find(z=>z.gx===r.gx+dx&&z.gy===r.gy+dy);} 
const groundCache=new Map();
function groundArt(r){
 const nb=[adjacent(r,1,0),adjacent(r,0,1)],key=r.type+':'+nb.map(Boolean).join(':')+':'+(Math.abs(r.gx*7+r.gy*11)%5);
 if(groundCache.has(key))return groundCache.get(key);
 const cv=document.createElement('canvas');cv.width=368;cv.height=243;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;const x=184,y=91,w=180,h=90;
 diamondOn(c,x,y+33,w+5,h+3,'#235d924f');
 // Only exposed coast edges get an ice wall. Neighbouring land joins without doubled cliffs.
 if(!nb[1])cliffOn(c,[x-w,y],[x,y+h],1);
 if(!nb[0])cliffOn(c,[x,y+h],[x+w,y],0);
 poly(c,[[x,y-h],[x+w,y],[x,y+h],[x-w,y]],'#e6f6ff','#f6fcff',3);
 for(let i=0;i<250;i++){let a=hash(i+r.gx*9+200)*164,b=hash(i+r.gy*15+300)*164,xx=x+a-b,yy=y-82+(a+b)/2;const cols=['#ffffff','#eef9ff','#d4edf9','#c7e4f8','#deeffa'];c.fillStyle=cols[i%5];c.fillRect(Math.round(xx),Math.round(yy),2+i%6,1+i%2);}
 // Perimeter paths join the region entrances, leaving the centre for editable objects.
 for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
  const z=adjacent(r,dx,dy);if(!z)continue;const a=(dx-dy),b=(dx+dy);const sx=x+a*147,sy=y+b*73;
  poly(c,[[sx-a*10,sy-b*5-6],[sx+a*27,sy+b*13-6],[sx+a*27,sy+b*13+6],[sx-a*10,sy-b*5+6]],'#f5e6c7');
 }
 groundCache.set(key,cv);return cv;
}
function diamondOn(c,x,y,w,h,color){poly(c,[[x,y-h],[x+w,y],[x,y+h],[x-w,y]],color);}
function cliffOn(c,a,b,left){
 const deep=39;poly(c,[a,b,[b[0],b[1]+deep],[a[0],a[1]+deep-4]],left?'#64b9ea':'#348dcc');
 const n=17;
 for(let i=0;i<n;i++){const u=i/n,v=(i+1)/n,xx=a[0]+(b[0]-a[0])*u,yy=a[1]+(b[1]-a[1])*u,nx=a[0]+(b[0]-a[0])*v,ny=a[1]+(b[1]-a[1])*v,depth=25+Math.floor(hash(i+47)*14);
  poly(c,[[xx,yy],[nx,ny],[nx-1,ny+depth],[xx+1,yy+depth]],left?['#8fd5fb','#62b6eb','#afdffa','#58abe0'][i%4]:['#52ade6','#2677b5','#75caf3','#399bdb'][i%4]);
  c.fillStyle=left?'#d8f2ff':'#98deff';c.fillRect(Math.round(xx+1),Math.round(yy+3),3,Math.round(depth*.7));
  poly(c,[[xx,yy-2],[nx,ny-2],[nx,ny+5],[xx+3,yy+7],[xx,yy+4]],'#f7fcff');
 }
 c.strokeStyle='#b7e6fc';c.lineWidth=2;c.beginPath();c.moveTo(a[0],a[1]+37);c.lineTo(b[0],b[1]+38);c.stroke();
}
function iceIsland(r){ctx.drawImage(groundArt(r),Math.round(r.cx-184),Math.round(r.cy-91));}
function pixelLine(x1,y1,x2,y2,color,width=1){ctx.fillStyle=color;const dx=x2-x1,dy=y2-y1,n=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)));for(let i=0;i<=n;i+=2){const f=i/Math.max(1,n);ctx.fillRect(Math.round(x1+dx*f),Math.round(y1+dy*f),width,width);}}
function fence(a,b,snow=true){
 for(const h of (snow?[9,19]:[3,9])){pixelLine(a[0],a[1]-h,b[0],b[1]-h,'#614432',4);pixelLine(a[0],a[1]-h,b[0],b[1]-h,'#ca9558',2);}
 const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.round(len/28));
 for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,y=a[1]+(b[1]-a[1])*i/n;const ph=snow?28:14;rectangle(x-3,y-ph,6,ph+1,'#77503a');rectangle(x-2,y-ph+1,2,ph-4,'#dcaf71');rectangle(x+2,y-ph+2,2,ph,'#5c4133');rectangle(x-4,y-ph-2,8,4,snow?'#f5fbff':'#d9b27a');rectangle(x-2,y-ph-3,4,2,snow?'#fafdff':'#e9c68d');}
}
function regionEdges(r,front){
 const w=144,h=72,x=r.cx,y=r.cy+5;
 if(!r.cells.length)return;
 const segments=front?[[[x-w,y],[x,y+h],[0,1]],[[x,y+h],[x+w,y],[1,0]]]:[[[x-w,y],[x,y-h],[-1,0]],[[x,y-h],[x+w,y],[0,-1]]];
 for(const[a,b,dir]of segments){const n=adjacent(r,...dir);if(n&&n.districtId===r.districtId)continue;
 // An opening between every two sections makes the little districts accessible.
 const p=[a[0]+(b[0]-a[0])*.43,a[1]+(b[1]-a[1])*.43],q=[a[0]+(b[0]-a[0])*.57,a[1]+(b[1]-a[1])*.57];fence(a,p);fence(q,b);}
}
function pathPatch(r){const x=r.cx,y=r.cy;if(r.type!=='walkway')diamond(x,y,126,63,'#eddbc0');for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){if(r.type==='walkway'&&(a!==0&&b!==0))continue;if(r.type!=='walkway'&&(Math.abs(a)>2||Math.abs(b)>2))continue;const xx=x+(a-b)*23,yy=y+(a+b)*11.5;diamond(xx,yy,22,10,['#faeacb','#e2cfb1','#f4e1c3'][Math.abs(a+b)%3],'#fff1d4');}}
function groundCell(r,c,t){
 const kind=C.types[r.type].kind;
 if(kind==='fish'){
  diamond(c.x,c.y,44,22,'#235e89','#1c536f');diamond(c.x,c.y-1,41,20,'#338bb4','#88d3e8');
  for(let j=0;j<4;j++){const xx=c.x-24+Math.floor(hash(j+c.x)*43),yy=c.y-8+j*5;rectangle(xx+Math.floor(Math.sin(t+j)*2),yy,9,1,'#8dcbdf');}
 }else{
  if(['veg','orchard','flowers','special'].includes(r.type)){
   const k=r.type==='orchard'?'soil-orchard-r7':r.type==='flowers'?'soil-flowers-r10':r.type==='special'?'soil-special-r10':'soil-crops-r7',a=art[k],m=CA.assets[k];
   ctx.drawImage(a,Math.round(c.x-m.anchor[0]),Math.round(c.y-m.anchor[1]),m.width,m.height);
  }else{const k=kind==='animal'?'pasture':'soil',a=art[k];if(a)ctx.drawImage(a,Math.round(c.x-44),Math.round(c.y-23),88,58);}
 }
 if(selection===c.id){ctx.save();ctx.setLineDash([4,2]);diamond(c.x,c.y,46,23,undefined,'#fff3af');ctx.restore();}
 if(!c.entity){rectangle(c.x-4,c.y-1,8,2,kind==='fish'?'#bfe7f2':'#dcc195');rectangle(c.x-1,c.y-4,2,8,kind==='fish'?'#bfe7f2':'#dcc195');}
}
function entity(r,c,t){
 const e=c.entity;if(!e)return;const active=ready(e),progress=e.hungry?1:Math.max(0,Math.min(1,(now()-e.startedAt)/Math.max(1,e.endsAt-e.startedAt))),f=Math.floor(t*8);
 if(e.kind==='crop'){
  const d=C.crops[e.species],stage=active?3:e.hungry?2:progress<.18?0:progress<.46?1:progress<.77?2:3;
  const v=visualCrop(e);
  if(v){drawCrop(v,c,t);if(active&&CA.specials.includes(e.species))sceneLights.push({kind:'crystal',x:c.x,y:c.y-22});}
  else{
   const points=[[-17,-7],[17,-5],[0,10]];
   for(let i=0;i<points.length;i++){
    const[dx,dy]=points[i],yy=c.y+dy+3+(stage>0&&state.motion&&((f+i)%10===0)?-1:0);
    if(stage>1)diamond(c.x+dx,yy-2,10,4,'#3d472332');
    sprite(d.art+'_'+stage,c.x+dx,yy,33,42,1);
   }
  }
 }else if(e.kind==='animal'){
  const dx=state.motion?Math.round(Math.sin(Math.floor(t*6)/6+c.x)*3):0;diamond(c.x+dx,c.y+6,18,6,'#755f3938');animated(e.species,c.x+dx,c.y+10,e.species==='cow'?51:43,46,t+c.x/99);
 }else{
  const dx=state.motion?Math.round(Math.sin(Math.floor(t*8)/8+c.x)*12):0;
  animated(C.fish[e.species].icon,c.x+dx-9,c.y+2,24,18,t,0.5);animated(C.fish[e.species].icon,c.x-dx+10,c.y+6,20,16,t+.25,0.5);
 }
 // Readiness is a small pixel harvest sparkle, not a large sticker covering the plant.
 if(active){const x=c.x+34,y=c.y-21;rectangle(x-2,y-2,4,4,'#ffe9a1');rectangle(x-4,y,8,1,'#fff8d6');rectangle(x,y-4,1,8,'#fff8d6');}
 else if(e.hungry){rr(ctx,c.x+19,c.y-32,12,11,0,'#fff4d9','#8a6639');rectangle(c.x+23,c.y-29,4,4,'#b99760');}
}

function visualCrop(e){
 if(!e||e.kind!=='crop')return null;
 const type=CA.vegetables.includes(e.species)?'field':CA.orchard.includes(e.species)?'orchard':(CA.flowers.includes(e.species)||CA.specials.includes(e.species))?'garden':null;
 if(!type)return null;
 const p=Math.max(0,Math.min(1,(now()-e.startedAt)/Math.max(1,e.endsAt-e.startedAt)));
 let stage=ready(e)?4:e.hungry?1:p<.17?0:p<.40?1:p<.66?2:3;
 if(e.established&&!e.hungry&&!ready(e))stage=p<.23?1:p<.59?2:3;
 if(type==='orchard'&&ready(e)&&state.weather==='snow')stage=5;
 const key=e.species+'_'+type+'_'+stage,m=CA.assets[key];return {key,stage,type,...m};
}
function drawCrop(v,c,t){
 const a=art[v.key];if(!a)return;
 const left=Math.round(c.x-v.anchor[0]),top=Math.round(c.y-v.anchor[1]);
 // Only the upper foliage moves. Soil and roots never float or slide.
 const split=v.type==='garden'?78:v.type==='orchard'?Math.round(v.height*.58):Math.round(v.height*.47);
 const shift=state.motion&&v.stage>0?Math.round(Math.sin(t*1.7+c.x*.018)):0;
 ctx.drawImage(a,0,split,v.width,v.height-split,left,top+split,v.width,v.height-split);
 ctx.drawImage(a,0,0,v.width,split,left+shift,top,v.width,split);
 cropHits.push({id:c.id,key:v.key,left,top,width:v.width,height:v.height,split,shift});
}
function hitCrop(p){
 for(let i=cropHits.length-1;i>=0;i--){const h=cropHits[i];let y=Math.floor(p.y-h.top),x=Math.floor(p.x-h.left-(y<h.split?h.shift:0));
  if(x<0||y<0||x>=h.width||y>=h.height)continue;
  const mask=alphaMasks.get(h.key);if(mask&&mask[(y*h.width+x)*4+3]>180)return h.id;
 }
 return null;
}

function netFrame(c){const a=[c.x-44,c.y],b=[c.x,c.y+22],z=[c.x+44,c.y];for(let i=1;i<6;i++){const f=i/6;pixelLine(c.x-44+44*f,c.y-22*f,c.x+44*f,c.y+22-22*f,'#82c5d43d',1);pixelLine(c.x-44+44*f,c.y+22*f,c.x+44*f,c.y-22+22*f,'#82c5d43d',1);}fence(a,b,false);fence(b,z,false);}
function effectStrip(key,x,y,t,phase=0,alpha=1){
 const a=art[key],m=AM[key];if(!a||!m)return;const f=state.motion?(Math.floor(t*m.fps+phase)%m.frames):0;
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(a,f*m.width,0,m.width,m.height,Math.round(x-m.anchor[0]),Math.round(y-m.anchor[1]),m.width,m.height);ctx.restore();
}
function propPosition(key,x,y,o={},t=renderTime){
 const m=AM[key],scale=o.scale||1,bob=o.bob&&state.motion?Math.round(Math.sin(t*1.6)*1.4):0;
 return {left:Math.round(x-m.anchor[0]*scale),top:Math.round(y+ bob-m.anchor[1]*scale),width:Math.round(m.width*scale),height:Math.round(m.height*scale),x,y:y+bob,scale};
}
function cleanProp(key,x,y,o={},t=renderTime){
 const a=art[key],m=AM[key];if(!a||!m)return;
 const p=propPosition(key,x,y,o,t);
 if(art['emission-'+key])sceneLights.push({x,y:y-(key==='lamp'?34:25),kind:key==='lamp'?'lamp':'window',image:art['emission-'+key],left:p.left,top:p.top,width:p.width,height:p.height});
 if(o.shadow)diamond(x,y-5,o.shadow[0],o.shadow[1],'#547b9030');
 if(o.wake)effectStrip('wake-fx',x,y+2,t,0,.75);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(a,p.left,p.top,p.width,p.height);
 if(o.smoke&&m.smoke&&state.motion)effectStrip('smoke-fx',p.left+m.smoke[0]*p.scale,p.top+m.smoke[1]*p.scale-20,t,Math.floor(x)%8,.72);
 if(o.action)propHits.push({...p,key,id:o.id,action:o.action,regionId:o.regionId});
}
function propObjects(r){
 return (SC[r.type]||[]).map(o=>({y:r.cy+o.dy,fn:()=>cleanProp(o.asset,r.cx+o.dx,r.cy+o.dy,{...o,id:r.id+':'+o.id,regionId:r.id})}));
}
function buildingObjects(r){
 const x=r.cx,y=r.cy;
 if(r.type==='home')return [...propObjects(r),
  {y:y+54,fn:()=>campfire(x+39,y+49)},
  {y:y+51,fn:()=>animated('penguin',x-45,y+51,27,35,renderTime)},
  {y:y+56,fn:()=>sprite('npc',x+86,y+54,25,33,1)}];
 if(r.type==='workshop')return propObjects(r);
 if(r.type==='mine')return[{y:y+30,fn:()=>{sprite('mineshaft',x+10,y+38,169,164,1);sprite('crystal_3',x-65,y+20,40,47,1);sprite('ore',x+90,y+40,43,50,1);}}];
 return [{y:y+30,fn:()=>{sprite('mountain',x,y+35,200,220,1);sprite('pine',x-117,y+19,48,70,1);sprite('pine',x+117,y+25,45,68,1);}}];
}
function hitProp(p){
 // Last drawn (nearest) opaque pixel wins. Transparent padding is NEVER clickable.
 for(let i=propHits.length-1;i>=0;i--){const h=propHits[i],m=AM[h.key];
  const u=Math.floor((p.x-h.left)/h.width*m.width),v=Math.floor((p.y-h.top)/h.height*m.height);
  if(u<0||v<0||u>=m.width||v>=m.height)continue;
  const mask=alphaMasks.get(h.key);if(!mask||mask[(v*m.width+u)*4+3]<180)continue;
  return h;
 }
 return null;
}
function harborOrigin(){
 const rs=state.regions.filter(r=>r.type==='fishery');
 for(const r of rs)if(!adjacent(r,0,1))return {r,mirror:1};
 for(const r of rs)if(!adjacent(r,1,0))return {r,mirror:-1};
 return null;
}
function sceneryObjects(t){
 const h=harborOrigin();if(!h)return [];const {r,mirror}=h;
 const objects=SC.harbor.map(o=>({y:r.cy+o.dy,fn:()=>cleanProp(o.asset,r.cx+o.dx*mirror,r.cy+o.dy,{...o,regionId:r.id},t)}));
 objects.push({y:r.cy+226,fn:()=>{
  const x=r.cx-190*mirror+Math.round(Math.sin(t*.28)*5),y=r.cy+226+Math.round(Math.sin(t*.45)*2);
  sprite('whale',x,y,116,72,.5);for(let j=0;j<2;j++)pixelLine(x-45+j*7,y+24+j*5,x+15+j*5,y+35+j*5,'#a8ddf169',2);
 }});
 return objects;
}
let renderTime=0;
function campfire(x,y){diamond(x,y,17,7,'#98b3bb77');pixelLine(x-11,y-3,x+11,y+4,'#8f6240',4);pixelLine(x+10,y-3,x-8,y+4,'#bd8c50',4);const f=Math.floor(renderTime*8)%4;poly(ctx,[[x-8,y-3],[x-10,y-11],[x-4,y-17-f],[x-1,y-28+f],[x+3,y-19],[x+6,y-23+f],[x+9,y-12],[x+7,y-3]],'#e88831');poly(ctx,[[x-5,y-5],[x-2,y-17-f],[x+3,y-10],[x+5,y-4]],'#ffdd67');rectangle(x-1,y-9,3,5,'#fff4bb');}
function decoration(d,t){if(d.type==='pine'){sprite('pine',d.x,d.y,39,53,1);return;}if(d.type==='snowman'){const x=d.x,y=d.y;diamond(x,y,12,5,'#94b9d578');poly(ctx,[[x-9,y-2],[x-11,y-7],[x-10,y-17],[x-5,y-21],[x-6,y-30],[x-2,y-34],[x+5,y-34],[x+8,y-29],[x+7,y-21],[x+12,y-17],[x+13,y-8],[x+9,y-2]],'#e9f7ff','#7ba2c2');rectangle(x-6,y-23,14,4,'#ce826a');rectangle(x-7,y-37,17,3,'#345374');rectangle(x-2,y-42,10,5,'#234162');rectangle(x+2,y-30,2,2,'#294762');rectangle(x+6,y-27,5,2,'#e49748');return;}
 if(art.lamp){cleanProp('lamp',d.x,d.y,{scale:1},t);return;}
 const x=d.x,y=d.y;rectangle(x-2,y-32,4,33,'#775437');rectangle(x-3,y-32,2,30,'#c6985b');rectangle(x-6,y-45,12,14,'#805435');rectangle(x-4,y-42,8,8,'#ffda76');rectangle(x-3,y-41,2,6,'#fff3b3');poly(ctx,[[x-8,y-46],[x,y-53],[x+8,y-46]],'#315675');rectangle(x-4,y-47,9,2,'#eff9ff');}
const labelLayer=document.createElement('div');labelLayer.className='world-labels';game.appendChild(labelLayer);
let labelIds='';
function labelPoint(r){
 const offset={home:-133,workshop:-157,explore:-237,mine:-168,orchard:-143,veg:-103,flowers:-99,special:-105,ranch:-94,fishery:-83};
 return [r.label[0],r.cy+(offset[r.type]??-95)];
}
function intersects(a,b,pad=0){return a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;}
function labels(){
 labelHits.length=0;
 const f=placement?null:frontier(),entries=state.regions.map(r=>({id:r.id,type:r.type,point:labelPoint(r),title:C.types[r.type].name}));
 if(f)entries.push({id:'__frontier',type:'expand',point:[f.x,f.y+28],title:'待扩展区域'});
 const idkey=entries.map(r=>r.id+':'+r.type).join('|');
 if(idkey!==labelIds){labelIds=idkey;labelLayer.innerHTML=entries.map(r=>`<div class="world-label" data-region="${r.id}" aria-label="${esc(r.title)}"><img src="${AS[LA[r.type].asset]}" alt="${esc(r.title)}"></div>`).join('');}
 const base=game.getBoundingClientRect(),occupied=[];
 // The UI is fixed. Labels never cover resource counters, the mini-map or navigation.
 for(const el of $$('.hud>.brand,.hud>.profile,.hud>.resources,.hud>.header-tools,.mission,.weather-pill,.map-box,.camera-controls,.module-dock,.world-tip')){
  const b=el.getBoundingClientRect();if(b.width&&b.height)occupied.push({left:b.left-base.left-3,top:b.top-base.top-3,right:b.right-base.left+3,bottom:b.bottom-base.top+3});
 }
 const display=entries.map((r,i)=>({...r,i,selected:r.id===state.selectedRegion})).sort((a,b)=>Number(b.selected)-Number(a.selected)||a.i-b.i);
 for(const r of display){
  const e=labelLayer.children[r.i],m=LA[r.type],p=worldToScreen(...r.point),ww=m.width,hh=m.height;
  let box=null;
  if(!state.hideLabels)for(const [dx,dy]of [[0,0],[0,-12],[0,12],[-14,0],[14,0]]){
   const b={left:Math.round(p.x-ww/2+dx),top:Math.round(p.y-hh/2+dy)};b.right=b.left+ww;b.bottom=b.top+hh;
   if(b.left<7||b.right>W-7||b.top<57||b.bottom>H-24)continue;
   if(occupied.some(o=>intersects(b,o,3)))continue;box=b;break;
  }
  e.hidden=!box;if(!box)continue;
  e.style.width=ww+'px';e.style.height=hh+'px';e.style.left=box.left+'px';e.style.top=box.top+'px';e.classList.toggle('chosen',r.selected);
  occupied.push(box);labelHits.push({...box,id:r.id,type:r.type,asset:m.asset,title:r.title});
 }
}
function hitLabel(p){const q=worldToScreen(p.x,p.y);return labelHits.find(h=>q.x>=h.left&&q.x<=h.right&&q.y>=h.top&&q.y<=h.bottom);}
function frontier(){return candidates([...state.regions].reverse().find(r=>!r.initial)?.id||'special')[0];}
function drawFrontier(){if(placement)return;const p=frontier();if(!p)return;ctx.save();ctx.setLineDash([6,5]);diamond(p.x,p.y,165,82,'#a7cce514','#91c8da');ctx.setLineDash([]);text(ctx,'＋',p.x,p.y-12,20,'#d4edf3');ctx.restore();}
function drawPlacement(t){if(!placement)return;if(placement.kind==='decoration'){ctx.save();ctx.globalAlpha=.7;decoration({type:placement.type,...placement.point},t);ctx.restore();return;}
 placement.options.forEach((p,i)=>{const active=i===placement.index;ctx.save();ctx.setLineDash([5,5]);diamond(p.x,p.y,167,83,active?'#bde6f17a':'#7bb5d52a',active?'#ffefa7':'#d7f6ff');ctx.setLineDash([]);text(ctx,'＋',p.x,p.y-12,25,active?'#fff1ad':'#dff4ff');text(ctx,active?'选中 · 在此建造':'可扩展地块',p.x,p.y+20,13,'#fff7dc');ctx.restore();});}
let lastRenderTs=-Infinity;
function render(ts){if(disposed)return;if(ts-lastRenderTs<32){raf=requestAnimationFrame(render);return;}lastRenderTs=ts;propHits.length=0;cropHits.length=0;sceneLights.length=0;renderTime=state.motion?Math.floor(ts/125)/8:0;const t=renderTime;
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);ctx.fillStyle='#2a86b3';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(Math.round(camera.x),Math.round(camera.y));ctx.scale(camera.s,camera.s);
 const tl=screenToWorld(0,0),br=screenToWorld(W,H);
 ENV.drawOcean(ctx,{minX:tl.x-3,minY:tl.y-3,maxX:br.x+3,maxY:br.y+3},t,state.weather,[...state.regions,...corridors()]);
 const sorted=[...state.regions,...corridors()].sort((a,b)=>a.cy-b.cy||a.cx-b.cx);const objects=[];
 for(const r of sorted){const p=worldToScreen(r.cx,r.cy);if(p.x<-250*camera.s||p.x>W+250*camera.s||p.y<-220*camera.s||p.y>H+250*camera.s)continue;iceIsland(r);if(!r.cells.length)pathPatch(r);regionEdges(r,false);
 for(const c of r.cells){groundCell(r,c,t);objects.push({y:c.y,fn:()=>entity(r,c,t)});if(C.types[r.type].kind==='fish')objects.push({y:c.y+23,fn:()=>netFrame(c)});}
 if(!r.cells.length&&r.type!=='walkway')objects.push(...buildingObjects(r));
 if(r.type==='ranch')objects.push(...propObjects(r));
 if(r.type==='walkway'){objects.push({y:r.cy-2,fn:()=>{sprite('pine',r.cx-57,r.cy-2,52,73,1);sprite('pine',r.cx-33,r.cy+15,33,46,1);}});objects.push({y:r.cy+20,fn:()=>{sprite('barrel',r.cx+52,r.cy+8,25,28,1);sprite('tulip',r.cx+52,r.cy-12,24,28,1);sprite('barrel',r.cx+72,r.cy+20,22,25,1);sprite('daisy',r.cx+72,r.cy+2,24,28,1);}});}
 objects.push({y:r.cy+84,fn:()=>regionEdges(r,true)});
 // Snowy trees and lanterns decorate the snowy margins, never occupy operating slots.
 for(const [dx,dy]of [[-150,-6],[139,2],[-15,76]]){if(r.type==='fishery'&&dx===-150)continue;objects.push({y:r.cy+dy,fn:()=>sprite('pine',r.cx+dx,r.cy+dy,dx===-15?28:41,dx===-15?43:63,1)});}
 objects.push({y:r.cy+55,fn:()=>decoration({type:'lamp',x:r.cx+136,y:r.cy+4},t)});
 }
 objects.push(...sceneryObjects(t));

 for(const d of state.decorations)objects.push({y:d.y,fn:()=>decoration(d,t)});
 if(state.companion.active){const r=region();objects.push({y:r.cy+46,fn:()=>animated('penguin',r.cx+117,r.cy+46,30,40,t)});}
 objects.sort((a,b)=>a.y-b.y);objects.forEach(o=>o.fn());
 for(let i=FX.length-1;i>=0;i--){const f=FX[i],age=ts-f.t;if(age>f.life){FX.splice(i,1);continue;}const a=age/1000;ctx.globalAlpha=1-age/f.life;rectangle(f.x+f.vx*a,f.y+f.vy*a+a*a*10,3,3,'#fff0a7');}ctx.globalAlpha=1;
 drawFrontier();drawPlacement(t);ctx.restore();
 ENV.drawWeather(ctx,W,H,t,state.weather,sceneLights,camera,state.motion);
 labels();metrics.frames++;if(metrics.frames%6===0)drawMini();syncHud();raf=requestAnimationFrame(render);
}
function drawMini(){const b=bounds(),s=Math.min(182/b.w,106/b.h),ox=(190-b.w*s)/2,oy=(115-b.h*s)/2;miniBounds={...b,s,ox,oy};mc.clearRect(0,0,190,115);mc.fillStyle='#206185';mc.fillRect(0,0,190,115);mc.save();mc.translate(ox-b.minX*s,oy-b.minY*s);mc.scale(s,s);for(const r of state.regions){diamondOn(mc,r.cx,r.cy+12,171,87,'#639cc5');diamondOn(mc,r.cx,r.cy,172,86,'#e4f6ff');diamondOn(mc,r.cx,r.cy,98,49,C.types[r.type].kind==='fish'?'#3f95b3':C.types[r.type].color);mc.fillStyle=r.id===state.selectedRegion?'#ffdf90':'#f9fcff';mc.fillRect(r.cx-7,r.cy-7,14,14);}mc.lineWidth=1.5/s;mc.strokeStyle='#fff1b0';mc.strokeRect(-camera.x/camera.s,(-camera.y+55)/camera.s,W/camera.s,(H-145)/camera.s);mc.restore();}

let timer=setInterval(()=>{if(disposed||!started)return;if(document.hidden)return;recoverEnergy();updateCountdowns();if(state.companion.active&&now()-lastAuto>3000){lastAuto=now();let done=false;for(const r of state.regions){for(const c of r.cells){if(c.entity?.kind==='crop'&&ready(c.entity)){harvest(c.id,true);done=true;break;}}if(done)break;}if(done){commit('companion-harvest');if(['region','farm-status'].includes(modalView))reOpen();}}if(now()-lastSave>12000)persist();},250);
document.addEventListener('visibilitychange',()=>{if(document.hidden){awaySince=now();persist();}else{recoverEnergy();syncHud(true);reOpen();if(awaySince&&now()-awaySince>60000){const n=state.regions.flatMap(r=>r.cells).filter(c=>ready(c.entity)).length;toast('欢迎回来 · '+n+' 处收成可领取');}awaySince=0;}});window.addEventListener('pagehide',persist);
function features(){const fs=[['plant','feature-plant','种植系统','播种 → 生长 → 成熟 → 收获','蔬菜、花卉、果园与特色作物，分区经营。'],['ranch','feature-ranch','养殖系统','迎接毛茸茸的新邻居','收集鸡蛋、牛奶、羊毛，投喂后继续生产。'],['fishery','feature-fish','水产系统','冰湖之下，也有丰收','独立投放、喂养与捕捞，自由扩展鱼塘。'],['workshop','feature-work','加工系统','把收成变成更好的礼物','真实消耗材料，计时生产，完成后收取。'],['weather','feature-weather','天气系统','同一座岛，六种光景','晴雪、飘雪、风雪、极光、月夜与晨曦。']];$('#features').innerHTML=fs.map(([a,k,t,h,p])=>`<button class="feature" data-action="${a}"><span class="panel-title">${t}</span>${im(k,'',t)}<b>${h}</b><small>${p}</small></button>`).join('');}
async function boot(){
 if(document.fonts?.ready)await document.fonts.ready;
 const offlineElapsed=now()-(state.savedAt||now());recoverEnergy();visibleNav();features();$$('[data-art]').forEach(e=>{e.src=AS[e.dataset.art];});syncHud(true);
 try{await Promise.all(Object.entries(AS).filter(([k])=>k.startsWith('r14-')).map(([k,url])=>new Promise((resolve,reject)=>{const a=new Image();a.onload=()=>{art[k]=a;metrics.assets++;if((AM[k]&&AM[k].kind==='prop')||CA.assets[k]){const cv=document.createElement('canvas');cv.width=a.width;cv.height=a.height;const ac=cv.getContext('2d');ac.drawImage(a,0,0);alphaMasks.set(k,ac.getImageData(0,0,a.width,a.height).data);}resolve();};a.onerror=()=>reject(Error('图片加载失败：'+k));a.src=url;})));started=true;$('#loading').hidden=true;resize();initialCamera();drawMini();persist();if(offlineElapsed>=60000){const n=state.regions.flatMap(r=>r.cells).filter(c=>ready(c.entity)).length,j=workshopJobs().filter(j=>j&&j.endsAt<=now()).length;toast('欢迎回来 · '+n+' 处收成、'+j+' 份加工可领取');}raf=requestAnimationFrame(render);}catch(e){metrics.errors.push(String(e));console.error(e);$('#loading b').textContent='素材未能完整载入';$('#loading span').textContent='请重新打开完整的单文件 HTML，而不是只打开未带素材的主页面。';}
}
window.__ICE_DEMO__=Object.freeze({artRevision:10,gameplayRevision:13,labels:()=>labelHits.map(h=>({...h})),environment:()=>({version:ENV.version,weather:state.weather,animated:state.motion,lightCount:sceneLights.length}),cropVisual:id=>{const e=locateCell(id)?.c.entity;return e?visualCrop(e):null;},cropHitAt:(x,y)=>hitCrop(screenToWorld(x-canvas.getBoundingClientRect().left,y-canvas.getBoundingClientRect().top)),cropDraws:()=>cropHits.map(h=>({...h})),propScreen:id=>{const h=propHits.find(h=>h.id===id);if(!h)return null;const m=AM[h.key],mask=alphaMasks.get(h.key);let u=m.width/2|0,v=m.height*.60|0;for(let j=0;j<m.width;j++){const xx=(u+j)%m.width;if(mask[(v*m.width+xx)*4+3]>180){u=xx;break;}}const p=worldToScreen(h.left+u*h.width/m.width,h.top+v*h.height/m.height),r=canvas.getBoundingClientRect();return {x:p.x+r.left,y:p.y+r.top};},props:()=>propHits.map(h=>({...h})),snapshot:()=>JSON.parse(JSON.stringify(state)),camera:()=>({...camera,width:W,height:H}),cellScreen:id=>{const a=locateCell(id);if(!a)return null;const r=canvas.getBoundingClientRect();let q={x:a.c.x,y:a.c.y-6};const occupied=hitCrop(q);if(occupied&&occupied!==id){const h=cropHits.find(h=>h.id===id);if(h){let found=false;for(let y=12;y<h.height-15&&!found;y+=2)for(let x=10;x<h.width-10&&!found;x+=2){const z={x:h.left+x+(y<h.split?h.shift:0),y:h.top+y},p=worldToScreen(z.x,z.y);if(p.x<16||p.x>W-66||p.y<160||p.y>H-110)continue;if(hitCrop(z)===id){q=z;found=true;}}}}const p=worldToScreen(q.x,q.y);return {x:p.x+r.left,y:p.y+r.top};},regionScreen:id=>{const h=labelHits.find(h=>h.id===id),r=region(id),p=h?{x:(h.left+h.right)/2,y:(h.top+h.bottom)/2}:worldToScreen(...labelPoint(r)),b=canvas.getBoundingClientRect();return {x:p.x+b.left,y:p.y+b.top};},placement:()=>placement?JSON.parse(JSON.stringify(placement)):null,metrics:()=>({...metrics,actions:[...metrics.actions],errors:[...metrics.errors]}),status:()=>({started,storageAvailable,saveProtected:protectedSave!==null,modal:modalView}),validateSave:input=>{try{validState(JSON.parse(input));return true;}catch{return false;}}});
/* R14: All scene objects below are freshly generated raster assets.
   The screenshot is never a world texture. Saved grid and economy stay in v3. */
const r14Hits=[],r14CellDraws=new Map();
let r14ViewCache=null,r14ViewSignature='',r14SelectedTab=2;
const r14Fixed={home:[246,335],flowers:[655,519],veg:[436,793],ranch:[160,792],orchard:[333,665],fishery:[255,991],special:[1070,1190],workshop:[-330,430],mine:[-440,1060],explore:[1110,260]};
function r14Origin(){const o=state.cartographerOrigin;if(o&&Number.isSafeInteger(o.gx)&&Number.isSafeInteger(o.gy)&&Math.abs(o.gx)<10001&&Math.abs(o.gy)<10001)return o;const first=state.regions.find(r=>!r.initial);if(first)return first;const home=C.initial.find(r=>r.id==='special');return {gx:home.gx+1,gy:home.gy};}
function r14GridPoint(q){const o=r14Origin();return {x:625+((q.gx-q.gy)-(o.gx-o.gy))*320,y:1130+((q.gx+q.gy)-(o.gx+o.gy))*180};}
function r14Map(){const o=r14Origin(),sig=o.gx+':'+o.gy+'|'+state.regions.map(r=>r.id+':'+r.gx+':'+r.gy).join('|');if(sig===r14ViewSignature&&r14ViewCache)return r14ViewCache;const map=new Map();for(const r of state.regions){const p=r.initial?r14Fixed[r.id]:null;map.set(r.id,p?{x:p[0],y:p[1]}:r14GridPoint(r));}r14ViewSignature=sig;r14ViewCache=map;return map;}
function r14Point(r){return r14Map().get(r.id)||{x:625,y:1130};}
function r14Candidate(q){return r14GridPoint(q);}
function beginPlacement(type,anchorId){if(!state.cartographerOrigin&&!state.regions.some(r=>!r.initial)){const q=candidates(anchorId)[0];if(q)state.cartographerOrigin={gx:q.gx,gy:q.gy};}return r14LegacyBeginPlacement(type,anchorId);}
function r14Cell(r,c){const i=r.cells.indexOf(c),col=i%3,row=Math.floor(i/3),p=r14Point(r);if(r.initial){if(r.id==='veg')return{x:431+(col-row)*43,y:742+(col+row)*27,w:112,h:116};if(r.id==='ranch')return{x:122+col*54-row*17,y:801+row*36,w:76,h:80};if(r.id==='orchard'){const ps=[[382,681,166,169],[292,625,65,77],[270,699,76,102],[321,713,66,78],[275,738,68,78],[314,665,66,81],[248,656,72,82],[310,759,64,71],[269,773,68,77]];const[a,b,w,h]=ps[i];return{x:a,y:b,w,h};}if(r.id==='flowers'){const ps=[[515,448],[542,478],[572,512],[748,577],[690,609],[646,588],[604,561],[520,522],[791,483]],a=ps[i];return{x:a[0],y:a[1],w:76,h:94};}if(r.id==='fishery')return{x:192+col*58-row*22,y:958+row*39,w:64,h:52};}
 return{x:p.x+(col-row)*49,y:p.y-20+(col+row-2)*25,w:C.types[r.type].kind==='animal'?77:110,h:C.types[r.type].kind==='animal'?85:112};}
function r14Key(spec,stage=2){return 'r14-crop-'+(spec==='crystal'?'crystalGrass':spec)+'-'+stage;}
function r14Stage(e){if(!e)return 0;if(e.hungry)return 1;const p=(now()-e.startedAt)/Math.max(1,e.endsAt-e.startedAt);return ready(e)?2:p<.34?0:p<.72?1:2;}
function r14Sprite(key,x,y,w,h=w,anchorX=.5,anchorY=1,hit=null,alpha=1){const a=art[key];if(!a?.width)return null;const sc=Math.min(w/a.width,h/a.height),dw=a.width*sc,dh=a.height*sc,left=x-dw*anchorX,top=y-dh*anchorY;ctx.save();ctx.globalAlpha=alpha;if(key.startsWith('r14-farmer')&&state.coat)ctx.filter='hue-rotate('+state.coat*36+'deg)';ctx.drawImage(a,left,top,dw,dh);ctx.restore();const rec={key,left,top,width:dw,height:dh,...hit};if(hit)r14Hits.push(rec);return rec;}
function r14Box(key,x,y,w,h,alpha=1){const a=art[key];if(!a)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(a,x,y,w,h);ctx.restore();}
function r14Anim(name,x,y,w,h,t,ax=.5,ay=1,hit=null,offset=0){const fps={sheep:3,farmer:4,whale:5,flag:6,smoke:3,fish:4,ripple:4}[name]||4;const z=state.motion?(t*fps+offset)%4:0,f=Math.floor(z),n=(f+1)%4,k=z-f;const rec=r14Sprite('r14-'+name+'-'+f,x,y,w,h,ax,ay,hit,1-k);if(k>0)r14Sprite('r14-'+name+'-'+n,x,y,w,h,ax,ay,null,k);return rec;}
function r14Text(t,x,y,size,color='#fff5d4',align='left'){ctx.fillStyle=color;ctx.font=`700 ${size}px Cartographer,"Noto Serif CJK SC",serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(t),x,y);}
function r14Label(label,x,y,w=147,h=45,action='region',id='home'){r14Box('r14-name-plaque',x-w/2,y-h/2,w,h);r14Text(label,x,y+1,28,'#fff5d9','center');r14Hits.push({left:x-w/2,top:y-h/2,width:w,height:h,action,id,label:true});}
function r14Island(x,y,w,h,n=1){r14Box('r14-buildable-island-0'+n,x,y,w,h);}
function r14Fence(x,y,w,kind='nw'){r14Sprite('r14-fence-'+kind,x,y,w,w*.74,.5,1);}
function r14Entity(r,c,t){const p=r14Cell(r,c),e=c.entity;let key,rec;if(!e){if(C.types[r.type].kind==='fish'){rec={key:'r14-ripple-0',left:p.x-30,top:p.y-22,width:60,height:44,action:'cell',id:c.id,regionId:r.id,label:true};r14Hits.push(rec);r14Anim('ripple',p.x,p.y,46,24,t,.5,.5,null,.5);}else if(C.types[r.type].kind==='animal'){rec={left:p.x-30,top:p.y-35,width:60,height:45,action:'cell',id:c.id,regionId:r.id,label:true};r14Hits.push(rec);}else{key='r14-empty-field';rec=r14Sprite(key,p.x,p.y,p.w,p.h,.5,.92,{action:'cell',id:c.id,regionId:r.id});}}else if(e.kind==='crop'){key=r14Key(e.species,r14Stage(e));rec=r14Sprite(key,p.x,p.y,p.w,p.h,.5,.9166667,{action:'cell',id:c.id,regionId:r.id});}else if(e.kind==='animal'){key='r14-'+e.species;if(e.species==='sheep')rec=r14Anim('sheep',p.x,p.y,p.w,p.h,t,.5,.9166667,{action:'cell',id:c.id,regionId:r.id},r.cells.indexOf(c)*.4);else rec=r14Sprite(key,p.x,p.y,p.w,p.h,.5,.96,{action:'cell',id:c.id,regionId:r.id});}else{key=e.species==='salmon'||e.species==='tuna'?'r14-fish-0':'r14-'+e.species;if(key==='r14-fish-0')rec=r14Anim('fish',p.x,p.y,p.w,p.h,t,.5,.5,{action:'cell',id:c.id,regionId:r.id},r.cells.indexOf(c)*.37);else rec=r14Sprite(key,p.x,p.y,p.w,p.h,.5,.7,{action:'cell',id:c.id,regionId:r.id},.85);}
 if(rec){r14CellDraws.set(c.id,rec);cropHits.push({...rec,id:c.id,split:rec.height,shift:0});}
}
function r14Generic(r,t){const p=r14Point(r),kind=C.types[r.type].kind;r14Island(p.x-200,p.y-132,400,276,1+Math.abs(r.gx+r.gy)%4);r14Sprite('r14-snowy-pine',p.x-120,p.y-30,71,114);r14Sprite('r14-ornate-lamp',p.x+151,p.y+60,28,81);if(kind==='building'){r14Sprite(r.type==='mine'?'r14-ice-rocks':r.type==='explore'?'r14-ice-rocks':'r14-chalet',p.x,p.y+35,225,215,.5,1,{action:r.type,id:r.id});if(r.type==='explore')r14Anim('flag',p.x+60,p.y+38,79,100,t,.34,.9166667);}else r.cells.slice().sort((a,b)=>r14Cell(r,a).y-r14Cell(r,b).y).forEach(c=>r14Entity(r,c,t));r14Label(C.types[r.type].name,p.x,p.y+125,160,42,'region',r.id);}
function r14Scene(t){
 // Deep ocean background and separate floating floes, never a screenshot plate.
 r14Box('r14-arctic-ocean-background',0,90,853,1370);ctx.save();ctx.fillStyle='#063753';ctx.globalAlpha=.39;ctx.fillRect(0,90,853,1370);ctx.restore();
 r14Island(480,81,193,160,3);r14Sprite('r14-ice-floe',40,177,72,67);r14Sprite('r14-ice-floe',313,173,39,42);r14Sprite('r14-ice-floe',804,714,180,120);
 // Major independently composed ice platforms.
 r14Box('r14-home-island',16,201,510,278);r14Box('r14-greenhouse-island',430,344,421,307);r14Box('r14-farm-island',0,574,706,417);
 // Boardwalks sit between platforms and cast their own illustrated shadows.
 r14Box('r14-bridge-nw',347,307,225,157);r14Box('r14-bridge-ne',389,505,193,117);r14Box('r14-bridge-nw',148,503,158,118);r14Box('r14-bridge-segment',459,614,232,160);r14Sprite('r14-ice-steps',707,856,87,111);
 // Walkable paving is also generated raster art.
 for(const [x,y,w]of [[214,329,98],[273,363,107],[306,393,85],[247,754,79],[288,783,80],[522,861,72],[590,548,78],[647,574,80],[714,590,70]])r14Sprite('r14-stone-path',x,y,w,w*.6);
 const objects=[];const put=(y,fn)=>objects.push({y,fn});
 for(const [x,y,w,h]of [[70,294,64,106],[117,257,84,136],[322,263,63,111],[376,305,76,130],[439,300,65,112],[478,329,52,84]])put(y,()=>r14Sprite('r14-snowy-pine',x,y,w,h));
 put(351,()=>{r14Sprite('r14-chalet',251,357,272,222,.5,1,{action:'home',id:'home',regionId:'home'});r14Anim('smoke',205,181,66,100,t,.5,1);});
 for(const[x,y]of [[138,333],[183,363],[338,367],[390,346],[119,314]])put(y,()=>r14Sprite('r14-flower-planter',x,y,48,54));
 put(348,()=>r14Sprite('r14-snowman',458,344,45,59));
 for(const[x,y]of [[102,352],[333,377],[538,331]])put(y,()=>r14Sprite('r14-ornate-lamp',x,y,30,70));
 for(const[x,y]of [[114,352],[168,376],[389,341],[440,366]])put(y,()=>r14Fence(x,y,80));
 put(561,()=>r14Sprite('r14-greenhouse',677,548,230,243,.5,1,{action:'region',id:'flowers',regionId:'flowers'}));
 put(415,()=>r14Sprite('r14-fruit-tree',591,425,123,153,.5,1,{action:'region',id:'orchard'}));
 for(const[x,y,w,h]of[[769,423,76,134],[814,459,57,98]])put(y,()=>r14Sprite('r14-snowy-pine',x,y,w,h));
 for(const[x,y]of[[520,466],[555,554],[747,597],[804,527]])put(y,()=>r14Sprite('r14-flower-planter',x,y,75,80));
 put(606,()=>r14Sprite('r14-ice-steps',789,639,75,106));
 // Warm working farm. Each cell is backed by the existing saved entity.
 put(756,()=>r14Sprite('r14-animal-shed',135,775,158,130,.5,1,{action:'region',id:'ranch',regionId:'ranch'}));
 for(const[x,y,w,h]of[[88,770,75,141],[183,684,55,98],[236,646,69,116],[360,632,84,157]])put(y,()=>r14Sprite('r14-snowy-pine',x,y,w,h));
 for(const id of ['flowers','orchard','veg','ranch']){const r=state.regions.find(r=>r.id===id);for(const c of r.cells)put(r14Cell(r,c).y,()=>r14Entity(r,c,t));}
 put(841,()=>r14Anim('farmer',359,758,72,97,t,.5,.9166667,{action:'home',id:'home'}));
 for(const[x,y,w,kind]of[[107,826,88,'nw'],[179,858,86,'nw'],[552,839,82,'ne'],[592,799,81,'ne'],[745,587,81,'ne'],[691,619,80,'nw'],[636,595,80,'nw'],[574,565,80,'nw']])put(y,()=>r14Fence(x,y,w,kind));
 for(const[x,y]of[[156,861],[478,850],[591,674],[655,744]])put(y,()=>r14Sprite('r14-ornate-lamp',x,y,26,74));
 put(557,()=>r14Sprite('r14-sailing-boat',114,570,176,231,.5,1,{action:'port',id:'fishery',regionId:'fishery'}));
 put(1038,()=>{r14Box('r14-fish-enclosure',58,891,390,218);const r=state.regions.find(r=>r.id==='fishery');for(const c of r.cells)r14Entity(r,c,t);});
 put(1083,()=>r14Sprite('r14-rowboat',365,1095,117,87,.5,1,{action:'port',id:'fishery'}));
 put(967,()=>r14Sprite('r14-seagull',93,928,38,29));
 put(1189,()=>r14Anim('whale',133+Math.sin(t*.18)*8,1189,279,209,t,.5,.5,null));
 if(state.companion.active)put(826,()=>r14Sprite('r14-penguin',371+Math.sin(t*1.3)*2,829,47,64,.5,1,{action:'companion',id:'companion'}));objects.sort((a,b)=>a.y-b.y);objects.forEach(o=>o.fn());
 if(!state.hideLabels)r14Label('家园',275,388,150,48,'region','home');
 // The existing frontier is shown as a real reusable island plus animated flag.
 if(!state.regions.some(r=>!r.initial)&&!placement){r14Box('r14-expansion-island',425,964,428,365);r14Sprite('r14-snowy-pine',566,1192,127,180);r14Sprite('r14-snowy-pine',738,1194,48,87);r14Sprite('r14-ice-rocks',485,1140,57,57);r14Sprite('r14-ice-rocks',664,1244,59,61);r14Anim('flag',664,1148,133,166,t,.34,.9166667,{action:'expand',id:'__frontier'});r14Label('新冰原',753,1031,150,47,'expand','__frontier');for(let i=0;i<8;i++)r14Sprite('r14-gold-glimmer',566+i*6,910+i*19,16,16,.5,.5,null,.68+.25*Math.sin(t*3-i));}
 // All additional real regions use the same generated terrain and real saved cells.
 for(const r of state.regions.filter(r=>!['home','flowers','veg','ranch','orchard','fishery'].includes(r.id)))r14Generic(r,t);
 for(const d of state.decorations){const nr=state.regions.find(r=>r.id===d.visualRegionId)||state.regions.reduce((a,r)=>Math.hypot(d.x-r.cx,d.y-r.cy)<Math.hypot(d.x-a.cx,d.y-a.cy)?r:a,state.regions[0]),p=r14Point(nr);r14Sprite('r14-'+({pine:'snowy-pine',lamp:'ornate-lamp',snowman:'snowman'}[d.type]),p.x+(d.x-nr.cx),p.y+(d.y-nr.cy),d.type==='pine'?79:48,110);}
 for(const[x,y]of[[50,560],[398,1028],[731,1166],[316,488]])r14Anim('ripple',x,y,80,34,t,.5,.5,null,x/45);
 if(state.weather!=='clear'){ctx.save();ctx.globalAlpha=state.weather==='night'?.26:state.weather==='blizzard'?.2:.08;ctx.fillStyle=state.weather==='dawn'?'#ffc483':state.weather==='aurora'?'#27665f':'#04182f';ctx.fillRect(-2000,-2000,6000,6000);ctx.restore();if(['snow','blizzard'].includes(state.weather))for(let i=0;i<38;i++){const x=(i*173+t*13)%900,y=(i*101+t*(state.weather==='blizzard'?77:32))%1300;r14Sprite('r14-snow-glimmer',x,y,9,9,.5,.5,null,.6);}}
 if(placement?.kind==='region'){for(const[q,i]of placement.options.entries()){const p=r14Candidate(i);ctx.save();ctx.globalAlpha=q===placement.index?.8:.28;if(q===placement.index){ctx.shadowColor='#ffdf86';ctx.shadowBlur=20;}r14Island(p.x-175,p.y-120,350,270,4);ctx.restore();r14Anim('flag',p.x,p.y+15,100,127,t,.34,.9166667);r14Label(q===placement.index?'在此建造':'可开垦',p.x,p.y+94,143,43,'placement',String(q));}}
 if(placement?.kind==='decoration'){const nr=state.regions.find(r=>r.id===placement.visualRegionId)||region(),p=r14Point(nr);r14Sprite('r14-'+({pine:'snowy-pine',lamp:'ornate-lamp',snowman:'snowman'}[placement.type]),p.x+placement.point.x-nr.cx,p.y+placement.point.y-nr.cy,74,107,.5,1,null,.7);}
}
function r14Chrome(){r14Box('r14-header-strip',-4,-4,861,103);r14Sprite('r14-game-crest',61,88,93,89,.5,1);ctx.save();ctx.shadowColor='#227ca4';ctx.shadowBlur=3;r14Text('冰原家园',108,55,47,'#f0faff');ctx.restore();r14Sprite('r14-snowflake-emblem',309,38,26,27,.5,.5);r14Box('r14-name-plaque',462,28,194,57);r14Sprite('r14-currency-coin',493,79,51,50);r14Text(fmt(state.coins),552,57,29,'#fff2c1');r14Box('r14-name-plaque',663,28,170,57);r14Sprite('r14-currency-diamond',699,79,50,54);r14Text(fmt(state.gems),746,57,29,'#fff2c1');
 r14Sprite('r14-compass-rose',764,264,164,166,.5,1);if(!storageAvailable||protectedSave!==null){r14Box('r14-name-plaque',18,105,212,39);r14Text(protectedSave!==null?'原存档已保护':'尚未保存，请备份',124,125,18,'#ffe2a0','center');}r14Text('N',764,127,20,'#f2dba1','center');r14Text('S',764,239,19,'#f2dba1','center');r14Text('W',711,184,18,'#f2dba1','center');r14Text('E',819,184,18,'#f2dba1','center');
 r14Box('r14-expansion-panel',4,1392,845,296);r14Sprite('r14-expansion-adventure',178,1668,326,312,.5,1);r14Text('下一站，新冰原',352,1453,44,'#092f50');r14Text('让家园，再长大一点。',354,1505,28,'#123959');r14Sprite('r14-currency-coin',380,1570,44,45);r14Text(fmt(450+state.stats.expansions*150),412,1549,29,'#092f50');r14Box('r14-action-button',349,1572,465,93);r14Text('开拓冰原',582,1619,41,'#57360c','center');
 r14Box('r14-footer-strip',-4,1689,861,158);const names=['家园','种植','探索','仓库'],keys=['nav-chalet','nav-garden','nav-explore','nav-backpack'];for(let i=0;i<4;i++){r14Sprite('r14-'+keys[i],107+i*213,1794,156,101,.5,1);r14Text(names[i],107+i*213,1815,28,i===r14SelectedTab?'#f8dc7d':'#e2f2fc','center');}r14Sprite('r14-gold-glimmer',532,1840,165,10,.5,.5,null,.8);}
function r14Dimensions(){const s=Math.min(W/853,H/1844);return{s,x:(W-853*s)/2,y:(H-1844*s)/2};}
function bounds(){const vs=[...r14Map().values(),...(placement?.kind==='region'?placement.options.map(r14Candidate):[])];let minX=0,minY=70,maxX=853,maxY=1360;for(const p of vs){minX=Math.min(minX,p.x-225);maxX=Math.max(maxX,p.x+225);minY=Math.min(minY,p.y-245);maxY=Math.max(maxY,p.y+170);}return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};}
function cameraFloor(){const b=bounds();return Math.max(.00001,Math.min((W-16)/(b.w+50),(H*.67)/(b.h+60),r14Dimensions().s*.28)*.5);}
function constrain(){const b=bounds(),s=r14Dimensions().s;camera.x=Math.max(W-(b.maxX+200)*camera.s,Math.min(-(b.minX-200)*camera.s,camera.x));camera.y=Math.max(H*.72-(b.maxY+150)*camera.s,Math.min(97*s-(b.minY-100)*camera.s,camera.y));}
function initialCamera(){const d=r14Dimensions();camera.s=d.s;camera.x=d.x;camera.y=d.y;}
function overview(){const b=bounds(),d=r14Dimensions();camera.s=Math.min((W-16)/(b.w+50),(H*.67)/(b.h+60));camera.x=(W-b.w*camera.s)/2-b.minX*camera.s;camera.y=104*d.s+(H*.66-b.h*camera.s)/2-b.minY*camera.s;}
function focusPoint(x,y,s=1){let p;const r=state.regions.find(r=>r.cx===x&&r.cy===y);if(r)p=r14Point(r);else {const q=placement?.kind==='region'?placement.options.find(q=>q.x===x&&q.y===y):null;p=q?r14Candidate(q):{x,y};}const d=r14Dimensions();camera.s=Math.min(d.s*2.2,Math.max(cameraFloor(),s*d.s));camera.x=W*.5-p.x*camera.s;camera.y=H*.43-p.y*camera.s;constrain();}
function resize(){W=game.clientWidth;H=game.clientHeight;DPR=1;canvas.width=W;canvas.height=H;initialCamera();}
function labels(){labelLayer.hidden=true;labelHits.length=0;for(const h of r14Hits.filter(h=>h.label&&h.action!=='cell')){const p=worldToScreen(h.left,h.top);labelHits.push({...h,left:p.x,top:p.y,right:p.x+h.width*camera.s,bottom:p.y+h.height*camera.s});}}
function drawMini(){/* Navigation is a real readable region list behind the compass. */}
function r14Hit(p){const d=r14Dimensions(),sc=worldToScreen(p.x,p.y);if(sc.x<d.x||sc.x>d.x+853*d.s||sc.y<d.y+97*d.s||sc.y>d.y+1384*d.s)return null;if(sc.x>d.x+680*d.s&&sc.y<d.y+285*d.s)return null;for(let i=r14Hits.length-1;i>=0;i--){const h=r14Hits[i];if(p.x<h.left||p.y<h.top||p.x>h.left+h.width||p.y>h.top+h.height)continue;if(!h.key||h.label)return h;let mask=alphaMasks.get(h.key),a=art[h.key];if(!mask&&a){const c=document.createElement('canvas');c.width=a.width;c.height=a.height;const ac=c.getContext('2d');ac.drawImage(a,0,0);mask=ac.getImageData(0,0,a.width,a.height).data;alphaMasks.set(h.key,mask);}if(!mask)return h;const x=Math.floor((p.x-h.left)*a.width/h.width),y=Math.floor((p.y-h.top)*a.height/h.height);if(mask[(y*a.width+x)*4+3]>40)return h;}return null;}
function hitCrop(p){const h=r14Hit(p);return h?.action==='cell'?h.id:null;}
function tapWorld(p){const h=r14Hit(p);if(placement){if(placement.kind==='decoration'){const matches=state.regions.filter(r=>{const v=r14Point(r);return Math.abs(p.x-v.x)/174+Math.abs(p.y-v.y)/87<.91;});if(!matches.length){toast('请放在已开垦的雪地上');return;}const r=matches.reduce((a,b)=>{const av=r14Point(a),bv=r14Point(b);return Math.hypot(p.x-av.x,p.y-av.y)<Math.hypot(p.x-bv.x,p.y-bv.y)?a:b;}),v=r14Point(r);placement.visualRegionId=r.id;placement.point={x:r.cx+p.x-v.x,y:r.cy+p.y-v.y};return;}if(h?.action==='placement'){placement.index=Number(h.id);toast('位置已选择，点击“在此建造”确认');}return;}if(!h)return;try{if(h.action==='cell'){const a=locateCell(h.id);if(a){state.selectedRegion=a.r.id;selection=h.id;return ready(a.c.entity)?harvest(h.id):cellPanel(h.id);}}if(h.action==='region'){state.selectedRegion=h.id;syncHud(true);return regionPanel(h.id);}if(h.action==='expand')return expansionPanel();handle(h.action,{id:h.id});}catch(e){metrics.errors.push(String(e));console.error(e);}}
function pop(c,message){const a=locateCell(c.id),q=a?r14Cell(a.r,a.c):c,p=worldToScreen(q.x,q.y-20),el=document.createElement('span');el.className='floating-reward';el.textContent=message;el.style.left=p.x+'px';el.style.top=p.y+'px';$('#eventFlashes').appendChild(el);setTimeout(()=>el.remove(),1100);sound('harvest');}
function render(ts){if(disposed)return;if(ts-lastRenderTs<32){raf=requestAnimationFrame(render);return;}lastRenderTs=ts;r14Hits.length=0;r14CellDraws.clear();cropHits.length=0;propHits.length=0;sceneLights.length=0;renderTime=state.motion?ts/1000:0;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;ctx.clearRect(0,0,W,H);ctx.fillStyle='#06283c';ctx.fillRect(0,0,W,H);const d=r14Dimensions();ctx.save();ctx.beginPath();ctx.rect(d.x,97*d.s+d.y,853*d.s,1300*d.s);ctx.clip();ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.s,camera.s);r14Scene(renderTime);ctx.restore();ctx.restore();ctx.save();ctx.translate(d.x,d.y);ctx.scale(d.s,d.s);r14Chrome();ctx.restore();labels();metrics.frames++;syncHud();raf=requestAnimationFrame(render);}
function screenshot(){const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='ice-homestead-cartographer-r14.png';a.click();toast('已保存当前冰原画面');}
function r14ScreenCell(id){const a=locateCell(id);if(!a)return null;const q=r14Cell(a.r,a.c),rec=r14CellDraws.get(id);let x=q.x,y=q.y-25;if(rec){let best=null,score=Infinity;for(let yy=rec.top+5;yy<rec.top+rec.height-5;yy+=4)for(let xx=rec.left+5;xx<rec.left+rec.width-5;xx+=4){if(r14Hit({x:xx,y:yy})?.id!==id)continue;const d=Math.hypot(xx-q.x,yy-(q.y-25));if(d<score){score=d;best={x:xx,y:yy};}}if(best){x=best.x;y=best.y;}}const p=worldToScreen(x,y),b=canvas.getBoundingClientRect();return{x:p.x+b.left,y:p.y+b.top};}
function handle(action,d){if(action==='daily'){daily();return homePanel();}if(action==='claim-mail'){if(!state.mailClaimed){state.mailClaimed=true;gain({wheat:6,blueberry:6,feed:6});commit('mail');}return homePanel();}if(action==='claim-task'){claimTask(d.id);return homePanel();}if(action==='cartographer-home'){r14SelectedTab=0;close();initialCamera();return;}if(action==='plant')r14SelectedTab=1;if(action==='expand')r14SelectedTab=2;if(action==='bag')r14SelectedTab=3;return r14LegacyHandle(action,d);}
function cropReviewPanel(){const all=Object.keys(C.crops);open('作物 · 三阶段独立素材',`<p>每个品种的萌芽、生长和成熟素材均为重新生成的独立图片。未从设计图中提取生产素材。</p><div class="crop-review">${all.map(k=>`<section><h3>${C.crops[k].name}</h3><div class="crop-stage-row">${[0,1,2].map(i=>`<figure>${im(r14Key(k,i))}<figcaption>${['萌芽','生长','成熟'][i]}</figcaption></figure>`).join('')}</div></section>`).join('')}</div>`,'crop-review');}
function gardenReview(){return cropReviewPanel();}
function artReviewPanel(){const keys=['chalet','greenhouse','animal-shed','sailing-boat','rowboat','bridge-ne','bridge-nw','fishing-dock','snowy-pine','ornate-lamp','fruit-tree','flower-planter'];open('独立插画与逐帧动画',`<p>建筑、地形、作物、动物和 UI 图标均重新生成。以下是游戏实际加载的透明素材。</p><div class="asset-inspector">${keys.map(k=>`<figure class="art-item">${im('r14-'+k)}<figcaption>${k} · ${art['r14-'+k]?.width} × ${art['r14-'+k]?.height}</figcaption></figure>`).join('')}</div><div class="crop-review">${['sheep','farmer','whale','flag','smoke','fish','ripple'].map(k=>`<section><h3>${{sheep:'羊',farmer:'农夫',whale:'鲸',flag:'旗帜',smoke:'烟雾',fish:'游鱼',ripple:'水波'}[k]} · 4 帧</h3><div class="crop-stage-row">${[0,1,2,3].map(i=>`<figure>${im('r14-'+k+'-'+i)}<figcaption>第 ${i+1} 帧</figcaption></figure>`).join('')}</div></section>`).join('')}</div>`,'art-review');}

const oldReadOnlyApi=window.__ICE_DEMO__;
window.__ICE_DEMO__=Object.freeze({...oldReadOnlyApi,artRevision:14,gameplayRevision:13,cellScreen:r14ScreenCell,regionScreen:id=>{const r=region(id),v=r14Point(r),p=worldToScreen(v.x,v.y),b=canvas.getBoundingClientRect();return{x:p.x+b.left,y:p.y+b.top};},cropHitAt:(x,y)=>hitCrop(screenToWorld(x-canvas.getBoundingClientRect().left,y-canvas.getBoundingClientRect().top)),cropDraws:()=>[...r14CellDraws.entries()].map(([id,h])=>({id,...h})),props:()=>r14Hits.filter(h=>h.action!=='cell').map(h=>({...h})),animation:()=>({time:renderTime,enabled:state.motion,sequences:['sheep','farmer','whale','flag','smoke','fish','ripple'],framesPerSequence:4}),visualMap:()=>[...r14Map().entries()].map(([id,p])=>({id,...p})),propScreen:id=>{const h=r14Hits.find(h=>h.id===id&&h.action!=='cell');if(!h)return null;let best=null;for(let y=h.top+5;y<h.top+h.height-5&&!best;y+=5)for(let x=h.left+5;x<h.left+h.width-5&&!best;x+=5)if(r14Hit({x,y})===h)best={x,y};if(!best)return null;const p=worldToScreen(best.x,best.y),b=canvas.getBoundingClientRect();return{x:p.x+b.left,y:p.y+b.top};},assetCoverage:()=>({newAssets:Object.keys(window.ICE_NEW_ART).length,cropSpecies:20,growthStages:3,referenceUsedAsScene:false})});

function moduleHub(){const links=[['home','nav-chalet','家园资料'],['plant','nav-garden','种植'],['ranch','sheep-0','牧场'],['fishery','salmon','水产'],['workshop','animal-shed','工坊'],['bag','nav-backpack','仓库'],['expand','nav-explore','扩建'],['map','compass-rose','区域导航'],['companion','penguin','伙伴'],['weather','snow-glimmer','天气'],['mine','ore-crystal','矿场'],['explore','nav-explore','探险'],['trade','feed-sack','交易'],['settings','compass-rose','存档与设置'],['guide','nav-explore','经营说明']];open('冰原家园',`${(!storageAvailable||protectedSave!==null)?'<div class="farm-note">'+(protectedSave!==null?'原存档未能识别，已保留且停止覆盖。请先在存档中导出备份。':'浏览器没有保存本次进度，请在存档中导出 JSON 备份。')+'</div>':''}<div class="sheet-grid">${links.map(([a,k,t])=>`<button class="item-card" data-action="${a}">${im('r14-'+k)}<b>${t}</b></button>`).join('')}</div>`,'module-hub');}

function beginDecoration(type){r14LegacyBeginDecoration(type);placement.visualRegionId=region().id;}
function saveIndicator(message,warning=false){$('#saveLabel').textContent=message;$('#saveBadge').textContent=warning?'未保存':'已存';const live=$('#saveWarning');if(live)live.textContent=warning?message:'';}

function homePanel(){r14LegacyHomePanel();const claimable=C.tasks.filter(t=>!state.claims.includes(t.id)&&state.stats[t.stat]>=t.goal);const extra=`<div class="panel" style="margin-top:12px"><b>家园补给</b><p>领取农场的补给与已完成的经营奖励。</p><div class="wide-actions">${btn('领取今日补给','daily','','subtle')}${!state.mailClaimed?btn('领取新手物资','claim-mail','','subtle'):''}${claimable.map(t=>btn(t.title+' · '+t.coins+' 金币','claim-task',`data-id="${t.id}"`,'gold')).join('')}</div></div>`;$('#sheetBody').innerHTML+=extra;}

boot();
})();

