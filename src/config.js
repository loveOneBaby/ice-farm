/* Design-authored starting composition only. New regions are generated from free neighbors. */
window.ICE_CONFIG = {
  version: 3, saveKey: 'ice-homestead-pixel-v3',
  crops: {
    carrot:{name:'胡萝卜',family:'veg',art:'carrot',icon:'carrot',seconds:8,cost:18,yield:3,sell:12},
    cabbage:{name:'卷心菜',family:'veg',art:'cabbage',icon:'cabbage',seconds:12,cost:24,yield:4,sell:13},
    pumpkin:{name:'南瓜',family:'veg',art:'pumpkin',icon:'pumpkin',seconds:16,cost:32,yield:3,sell:22},
    pea:{name:'雪甜豌豆',family:'veg',art:'pea',icon:'pea',seconds:15,cost:28,yield:4,sell:17},
    spinach:{name:'嫩叶菠菜',family:'veg',art:'spinach',icon:'spinach',seconds:9,cost:20,yield:4,sell:12},
    wheat:{name:'小麦',family:'veg',art:'wheat',icon:'wheat',seconds:10,cost:16,yield:4,sell:9},
    lotus:{name:'雪莲',family:'flowers',art:'lotus',icon:'lotus_4',seconds:10,cost:26,yield:3,sell:18},
    tulip:{name:'雪绒郁金香',family:'flowers',art:'tulip',icon:'tulip',seconds:14,cost:30,yield:3,sell:22},
    daisy:{name:'雪原雏菊',family:'flowers',art:'daisy',icon:'daisy',seconds:12,cost:28,yield:3,sell:19},
    hydrangea:{name:'冰蓝绣球',family:'flowers',art:'hydrangea',icon:'hydrangea',seconds:16,cost:35,yield:3,sell:25},
    iceRose:{name:'冰玫瑰',family:'flowers',art:'iceRose',icon:'iceRose',seconds:18,cost:40,yield:3,sell:28},
    crystalBloom:{name:'水晶花',family:'special',art:'crystalBloom',icon:'crystalBloom',seconds:18,cost:44,yield:3,sell:29},
    frostHerb:{name:'寒冰香草',family:'special',art:'frostHerb',icon:'frostHerb',seconds:13,cost:32,yield:3,sell:23},
    auroraOrchid:{name:'极光之兰',family:'special',art:'auroraOrchid',icon:'auroraOrchid',seconds:20,cost:50,yield:3,sell:34},
    pear:{name:'雪梨',family:'orchard',art:'pear',icon:'pear',seconds:17,cost:42,yield:5,sell:22,perennial:true},
    blueberry:{name:'蓝莓',family:'orchard',art:'blueberry',icon:'blueberry',seconds:11,cost:24,yield:4,sell:14,perennial:true},
    strawberry:{name:'草莓',family:'orchard',art:'strawberry',icon:'strawberry',seconds:14,cost:30,yield:4,sell:18,perennial:true},
    apple:{name:'冰糖苹果',family:'orchard',art:'apple',icon:'apple',seconds:18,cost:40,yield:5,sell:21,perennial:true},
    crystal:{name:'冰晶草',family:'special',art:'crystal',icon:'crystal_4',seconds:16,cost:40,yield:2,sell:35},
    snowberry:{name:'极光莓',family:'special',art:'snowberry',icon:'snowberry',seconds:20,cost:48,yield:3,sell:30,perennial:true}
  },
  animals:{
    chicken:{name:'雪羽鸡',icon:'chicken',cost:100,seconds:10,product:'egg',yield:2},
    cow:{name:'奶牛',icon:'cow',cost:220,seconds:14,product:'milk',yield:2},
    sheep:{name:'绵羊',icon:'sheep',cost:180,seconds:12,product:'wool',yield:2},
    rabbit:{name:'雪兔',icon:'rabbit',cost:140,seconds:9,product:'fluff',yield:2}
  },
  fish:{
    salmon:{name:'冰原鲑鱼',icon:'salmon',cost:45,seconds:10,product:'salmon',yield:3},
    tuna:{name:'蓝鳍鱼',icon:'tuna',cost:65,seconds:15,product:'tuna',yield:3},
    crab:{name:'雪蟹',icon:'crab',cost:55,seconds:12,product:'crab',yield:3},
    kelp:{name:'海带',icon:'kelp',cost:20,seconds:8,product:'kelp',yield:4}
  },
  items:{
    fertilizer:{name:'有机肥料',icon:'bag_radish',sell:10},
    feed:{name:'饲料',icon:'bag_radish',sell:10},egg:{name:'鸡蛋',icon:'egg',sell:22},milk:{name:'牛奶',icon:'milk',sell:30},wool:{name:'羊毛',icon:'wool',sell:28},fluff:{name:'兔绒',icon:'rabbit',sell:26},
    jam:{name:'莓果酱',icon:'bag_berry',sell:100},bread:{name:'暖炉面包',icon:'wheat',sell:85},bouquet:{name:'雪境花束',icon:'lotus_4',sell:140},ore:{name:'寒铁矿',icon:'gem',sell:30},wood:{name:'木材',icon:'wood',sell:15},
    salmon:{name:'冰原鲑鱼',icon:'salmon',sell:25},tuna:{name:'蓝鳍鱼',icon:'tuna',sell:38},crab:{name:'雪蟹',icon:'crab',sell:32},kelp:{name:'海带',icon:'kelp',sell:12}
  },
  recipes:{
    fertilizer:{name:'有机肥料',icon:'bag_radish',need:{kelp:2},out:{fertilizer:4},seconds:6},
    feed:{name:'营养饲料',icon:'bag_radish',need:{wheat:2},out:{feed:4},seconds:6},
    jam:{name:'冰霜莓果酱',icon:'bag_berry',need:{blueberry:3},out:{jam:1},seconds:8},
    bread:{name:'暖炉面包',icon:'wheat',need:{wheat:3,milk:1},out:{bread:2},seconds:10},
    bouquet:{name:'雪境花束',icon:'lotus_4',need:{lotus:3,tulip:2},out:{bouquet:1},seconds:12}
  },
  types:{
    veg:{name:'蔬菜区',icon:'carrot',color:'#387c4e',desc:'胡萝卜、卷心菜、南瓜、豌豆、菠菜与小麦',kind:'crop'},
    flowers:{name:'花卉区',icon:'daisy',color:'#bc4d88',desc:'雪莲、郁金香、雏菊、绣球和冰玫瑰',kind:'crop'},
    orchard:{name:'果园区',icon:'strawberry',color:'#b95441',desc:'苹果、雪梨、蓝莓、草莓；采摘后保留植株',kind:'crop'},
    ranch:{name:'养殖区',icon:'nav-ranch',color:'#6a4935',desc:'鸡、牛、羊、兔',kind:'animal'},
    fishery:{name:'水产区',icon:'nav-fish',color:'#266f9b',desc:'鱼、蟹、海带分池养成',kind:'fish'},
    special:{name:'特色作物区',icon:'crystal_4',color:'#665379',desc:'冰晶草、水晶花、寒冰香草、极光兰与浆果',kind:'crop'},
    home:{name:'居住区',icon:'nav-build',color:'#705141',desc:'家园升级与伙伴',kind:'building'},
    workshop:{name:'加工区',icon:'nav-work',color:'#705141',desc:'将收成加工成商品',kind:'building'},
    mine:{name:'矿场',icon:'gem',color:'#705141',desc:'采集矿石与木材',kind:'building'},
    explore:{name:'雪山探险',icon:'nav-explore',color:'#326382',desc:'探索神秘的冰雪遗迹',kind:'building'}
  },
  // Chunk coordinates are data. Every new chunk uses the same renderer and slot generator.
  grid: {originX:550, originY:190, stepX:180, stepY:90, radiusX:174, radiusY:87},
  initial: [
    ['explore','explore',0,0], ['home','home',0,1], ['workshop','workshop',1,0],
    ['mine','mine',1,-1], ['veg','veg',0,2], ['flowers','flowers',1,2],
    ['orchard','orchard',2,1], ['ranch','ranch',3,1], ['fishery','fishery',1,3],
    ['special','special',3,2]
  ].map(([id,type,gx,gy])=>{
    const cx=550+(gx-gy)*180,cy=190+(gx+gy)*90;
    const rows=['fishery','ranch'].includes(type)?2:3;
    const cells=['home','workshop','mine','explore'].includes(type)?[]:Array.from({length:rows*3},(_,i)=>{
      const a=i%3-1,b=Math.floor(i/3)-(rows-1)/2;
      return [cx+(a-b)*49,cy+(a+b)*24.5+5];
    });
    return {id,type,gx,gy,cx,cy,label:[cx,cy-84],size:92,cells};
  }),
  tasks:[
    {id:'harvest',title:'第一篮收成',desc:'收获 3 块成熟农田',stat:'harvests',goal:3,coins:180},
    {id:'expand',title:'让家园长大',desc:'扩建 1 个新区域',stat:'expansions',goal:1,coins:300},
    {id:'ranch',title:'欢迎新伙伴',desc:'购入 1 只动物',stat:'animalsBought',goal:1,coins:150},
    {id:'fish',title:'冰湖的馈赠',desc:'完成 1 次捕捞',stat:'fishHarvests',goal:1,coins:150},
    {id:'craft',title:'暖炉开工',desc:'完成 1 次加工并收取',stat:'crafted',goal:1,coins:200}
  ]
};

