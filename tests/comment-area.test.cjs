const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(hostname,results=[]){
  const calls=[];
  const sb={from:()=>({insert:async row=>{calls.push(row);return results.shift()||{error:null};}})};
  const ctx={window:{location:{hostname},VIVOX_CFG:{},supabase:{createClient:()=>sb}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../common.js'),'utf8'),ctx);
  return {vx:ctx.window.VX,calls};
}
test('links locais e públicos codificam slug e preservam modo comentário',()=>{
  for(const host of ['localhost','127.0.0.1','[::1]']){
    const {vx}=setup(host);
    assert.equal(vx.viewerUrl('A B&'),'/viewer.html?m=A%20B%26');
    assert.equal(vx.viewerUrl('A B&',true),'/viewer.html?m=A%20B%26&comment=1');
  }
  const {vx}=setup('grid.vivoxmarketing.com.br');
  assert.equal(vx.viewerUrl('A B&',true),'/m/A%20B%26?comment=1');
});
test('envia dimensões somente quando fornecidas e mantém comentários legados',async()=>{
  const {vx,calls}=setup('localhost');
  await vx.addComment({body:'ponto',x:0.2,y:0.3});
  await vx.addComment({body:'área',x:0.2,y:0.3,w:0.4,h:0.1});
  await vx.addComment({body:'legado'});
  assert.equal(Object.hasOwn(calls[0],'w'),false);
  assert.equal(calls[1].w,0.4);assert.equal(calls[1].h,0.1);
  assert.equal(Object.hasOwn(calls[2],'x'),false);
});
test('erro de migração não descarta silenciosamente a área',async()=>{
  const error=new Error('Coluna w ausente');
  const {vx,calls}=setup('localhost',[{error}]);
  await assert.rejects(vx.addComment({x:0.1,y:0.1,w:0.2,h:0.2}),error);
  assert.equal(calls.length,1);
});
test('respostas preservam imagens e identificação da thread',async()=>{
  const {vx,calls}=setup('localhost');
  await vx.addReply('thread',{body:'foto',photos:['/foto.jpg']});
  assert.equal(calls[0].parent_id,'thread');assert.equal(calls[0].photos[0],'/foto.jpg');
});
