const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('normaliza apresentação e preserva os tipos anteriores',()=>{
  const context={window:{VIVOX_CFG:{},supabase:{createClient:()=>({})}}};
  vm.runInNewContext(read('common.js'),context);
  const vx=context.window.VX;
  for(const t of ['apresentacao','mockup','folder','revista']) assert.equal(vx.normType(t),t);
  assert.equal(vx.normType('desconhecido'),'revista');
  assert.equal(vx.TYPE_LABEL.apresentacao,'Apresentação');
});

async function render(type,width,height){
  const source=read('admin.js');
  const fn=source.slice(source.indexOf('  async function renderPdf('),source.indexOf('  function imgAspect('));
  const sizes=[];
  const pdf={numPages:1,getPage:async()=>({
    getViewport:({scale})=>({width:width*scale,height:height*scale}),render:()=>({promise:Promise.resolve()})
  })};
  const context={pdfjsLib:{getDocument:()=>({promise:Promise.resolve(pdf)})},document:{createElement:()=>({getContext:()=>({fillRect(){}}),toDataURL(){sizes.push([this.width,this.height]);return 'imagem';}})},
  progressBar:{style:{}},loaderSub:{},imgAspect:async()=>height/width};
  vm.createContext(context);vm.runInContext(fn,context);
  await context.renderPdf(new ArrayBuffer(0),type);
  return sizes[0];
}

test('renderiza slides em 1920px inclusive PDFs menores e maiores',async()=>{
  for(const w of [320,960,1920,3840]) assert.deepEqual(await render('apresentacao',w,w*9/16),[1920,1080]);
});
test('aceita tolerância 16:9 e rejeita retrato e outras proporções',async()=>{
  for(const aspect of [0.54,0.5625,0.59]) await render('apresentacao',1920,1920*aspect);
  for(const aspect of [0.5,0.6,0.75,1.4142]) await assert.rejects(render('apresentacao',1920,1920*aspect),/16:9/);
});
test('preserva a escala dos tipos anteriores',async()=>{
  for(const type of ['revista','mockup','folder']){
    assert.deepEqual(await render(type,1000,1000),[1400,1400]);
    assert.deepEqual(await render(type,320,320),[960,960]);
  }
});
