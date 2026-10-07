/* Reusable region archetypes, NOT expansion coordinates.
 * x/y are offsets from a generated region; footprints are ground-space diamonds.
 * Anchors are recorded separately in assets/refined-manifest.json.
 */
window.ICE_SCENERY = {
  revision: 4,
  home: [
    {id:'home-cabin',asset:'hut',dx:-112,dy:-9,scale:.9,shadow:[28,10],action:'home'},
    {id:'home-greenhouse',asset:'greenhouse',dx:102,dy:-17,scale:.85,shadow:[43,12],action:'home'},
    {id:'home-main',asset:'cottage',dx:-13,dy:29,scale:1,shadow:[65,18],smoke:true,action:'home'}
  ],
  workshop: [
    {id:'work-store',asset:'storehouse',dx:-105,dy:-15,scale:1,shadow:[34,10],action:'workshop'},
    {id:'work-forge',asset:'workshop',dx:28,dy:32,scale:1,shadow:[62,16],smoke:true,action:'workshop'},
    {id:'work-crates',asset:'wood',dx:-44,dy:47,scale:.8,shadow:[15,5],action:'bag'},
    {id:'work-hay',asset:'hay',dx:119,dy:31,scale:.7,shadow:[15,5],action:'workshop'}
  ],
  ranch: [
    {id:'ranch-barn',asset:'barn',dx:-2,dy:-55,scale:.65,shadow:[25,7],action:'ranch'}
  ],
  // Harbour is attached to an exposed coast, recomputed after every expansion.
  harbor: [
    {id:'port-pier',asset:'dock-long',dx:-48,dy:166,scale:1,action:'port'},
    {id:'port-crane',asset:'crane',dx:-93,dy:169,scale:.70,action:'port'},
    {id:'port-boat',asset:'boat',dx:14,dy:235,scale:1,bob:true,wake:true,action:'port'},
    {id:'port-rowboat',asset:'rowboat',dx:117,dy:195,scale:.78,bob:true,action:'port'},
    {id:'port-light',asset:'lighthouse',dx:-208,dy:58,scale:1,action:'port'}
  ]
};

