/* Executar: node --test tests/landing.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const {injectReview,discoverPages,publicHttpUrl}=require("../api/lp.js")._test;

function vx(){
  const context={window:{VIVOX_CFG:{SUPABASE_URL:"https://x.supabase.co",BUCKET:"mockups"},supabase:{createClient:()=>({})},location:{hostname:"grid.vivoxmarketing.com.br"}},URL};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../common.js"),"utf8"),context);
  return context.window.VX;
}

test("landing pages abrem em /lp/SLUG; os demais tipos continuam em /m/SLUG",()=>{
  const VX=vx();
  assert.equal(VX.viewerUrl("LP_TESTE",false,"landing"),"/lp/LP_TESTE");
  assert.equal(VX.viewerUrl("LP_TESTE",true,"landing"),"/lp/LP_TESTE?comment=1");
  assert.equal(VX.viewerUrl("REVISTA",true),"/m/REVISTA?comment=1");
  assert.equal(VX.normType("landing"),"landing");
  assert.equal(VX.TYPE_LABEL.landing,"Landing Page");
});

test("endereço e páginas são normalizados antes de salvar",()=>{
  const VX=vx();
  assert.equal(VX.normalizeLandingUrl("lp-exemplo.com.br/qualquer"),"https://lp-exemplo.com.br/");
  assert.throws(()=>VX.normalizeLandingUrl("javascript:alert(1)"));
  assert.throws(()=>VX.normalizeLandingUrl("localhost"));
  const pages=VX.normalizeLandingPages([{path:"/",title:""},{path:"hemorroidas/",title:"  Hemorroidas  "},{path:"/hemorroidas/?x=1#a",title:"Duplicada"},{path:"",title:"vazia"}]);
  assert.deepEqual(JSON.parse(JSON.stringify(pages)),[{path:"/",title:"Home"},{path:"/hemorroidas/",title:"Hemorroidas"}]);
});

test("o proxy injeta <base> e o script de revisão, removendo <base> e CSP em meta",()=>{
  const html='<!DOCTYPE html><html><head><meta charset="utf-8"><base href="/x/"><meta http-equiv="Content-Security-Policy" content="default-src none"></head><body></body></html>';
  const out=injectReview(html,"https://lp.exemplo.com.br/servicos/","https://grid.exemplo/lp-review.js?m=LP");
  assert.match(out,/<head><base href="https:\/\/lp\.exemplo\.com\.br\/servicos\/"><script src="https:\/\/grid\.exemplo\/lp-review\.js\?m=LP"><\/script>/);
  assert.equal((out.match(/<base/g)||[]).length,1);
  assert.doesNotMatch(out,/Content-Security-Policy/i);
});

test("descoberta lista somente páginas internas, sem âncoras nem arquivos",()=>{
  const html=`<title>Dr. Exemplo | Clínica</title>
    <a href="/#faq">FAQ</a><a href="/servicos/">Serviços</a><a href="https://lp.exemplo.com.br/contato/">Contato</a>
    <a href="/servicos/#x">Repetida</a><a href="/arquivo.pdf">PDF</a><a href="https://wa.me/55">WhatsApp</a>`;
  const r=discoverPages(html,"https://lp.exemplo.com.br/");
  assert.equal(r.title,"Dr. Exemplo | Clínica");
  assert.deepEqual(r.pages.map(p=>p.path),["/","/servicos/","/contato/"]);
});

test("o proxy recusa endereços internos",()=>{
  for(const u of ["http://localhost/","http://127.0.0.1/","http://10.0.0.1/","https://intranet/","file:///etc/passwd","https://a:b@site.com.br/"])
    assert.equal(publicHttpUrl(u),null,u);
  assert.ok(publicHttpUrl("https://lp-drjoaomardio.vivoxmarketing.com.br/"));
});
