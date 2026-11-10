const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(reduce=false){
  const animations=[];
  const pages=Array.from({length:3},(_,i)=>({dataset:{page:String(i)},classList:{toggle(key,value){this[key]=value;}},setAttribute(key,value){this[key]=value;},animate(frames,options){const animation={frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;}}));
  const state={total:3,slidePage:1,slideAnimation:null};
  const ctx={state,flipEl:{querySelectorAll:()=>pages},isFolder:()=>false,isPresentation:()=>true,closeBubble(){},syncPage(p){ctx.number=p;},window:{matchMedia:()=>({matches:reduce})}};
  const source=fs.readFileSync(path.join(__dirname,'../viewer.js'),'utf8');
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function goTo(n,'),source.indexOf('  function fNext()')),ctx);
  return {ctx,pages,state,animations};
}
test('cliques rápidos deixam somente o slide atual visível e sincronizado',()=>{
  const {ctx,pages,state,animations}=setup();
  ctx.goTo(2);ctx.goTo(3);ctx.goTo(2);
  assert.equal(state.slidePage,2);assert.equal(ctx.number,2);
  assert.equal(pages.filter(p=>p.classList['is-current']).length,1);
  assert.equal(pages[1].inert,false);assert.equal(pages[0].inert,true);
  assert.ok(animations[0].cancelled && animations[1].cancelled);
  assert.equal(animations[0].frames[0].transform,'translateX(36px)');
  assert.equal(animations[2].frames[0].transform,'translateX(-36px)');
  assert.equal(animations[2].options.duration,320);
});
test('limites, redimensionamento e movimento reduzido não iniciam transições',()=>{
  const {ctx,animations,state}=setup(true);
  ctx.goTo(99);assert.equal(state.slidePage,3);ctx.goTo(-1);assert.equal(state.slidePage,1);
  assert.equal(animations.length,0);
  const normal=setup();normal.ctx.goTo(2,false);normal.ctx.goTo(2);
  assert.equal(normal.animations.length,0);
});
