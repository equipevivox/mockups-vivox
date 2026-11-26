// Executar manualmente com Playwright instalado: node tests/landing.browser.cjs
// O grid é servido por rotas interceptadas e o banco é simulado; /api/lp roda em processo e
// busca a LP real (LP_URL, padrão: LP do Dr. João), então o teste precisa de internet.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const LP=process.env.LP_URL||'https://lp-drjoaomardio.vivoxmarketing.com.br/';
const SHOTS=process.env.SHOTS_DIR||'';

const realFetch=global.fetch;
global.fetch=(url,opts)=>String(url).includes('/landing.json')
  ? Promise.resolve(new Response(JSON.stringify({url:LP}),{headers:{'content-type':'application/json'}}))
  : realFetch(url,opts);
const proxy=require(path.join(root,'api','lp.js'));

// Executa a função da Vercel em processo e devolve a resposta ao navegador.
function runProxy(requestUrl){
  return new Promise((resolve,reject)=>{
    const headers={},res={statusCode:200,setHeader:(k,v)=>{headers[k.toLowerCase()]=v;},end:(body)=>resolve({status:res.statusCode,headers,body:Buffer.isBuffer(body)?body:Buffer.from(body||'')})};
    const u=new URL(requestUrl);
    proxy({url:u.pathname+u.search,headers:{host:u.host,'x-forwarded-proto':'http'}},res).catch(reject);
  });
}

const PAGES=[{path:'/',title:'Home'},{path:'/hemorroidas/',title:'Hemorroidas'},{path:'/cisto-pilonidal/',title:'Cisto pilonidal'}];
const mock=`\nwindow.testCalls=[];Object.assign(VX,{
  getMockup:async()=>({id:'LP_TESTE',name:'LP de teste',type:'landing',aspect:0.625,num_pages:${PAGES.length}}),
  landingConfig:async()=>({url:${JSON.stringify(LP)},pages:${JSON.stringify(PAGES)}}),
  listComments:async()=>(window.testComments=window.testComments||[{id:'c1',author:'Ana',body:'Trocar a foto do topo',page_index:0,x:0.5,y:300,resolved:false,photos:[]},
    {id:'c2',author:'Bia',body:'Área no celular',page_index:1,x:0.1,y:500,w:0.5,h:0.02,resolved:false,photos:[]}]).slice(),
  addComment:async c=>{testCalls.push(['comment',c]);window.testComments.push({...c,id:'n'+testCalls.length,resolved:false,created_at:new Date().toISOString()});return {positioned:true};},
  addReply:async()=>{},setResolved:async()=>{},uploadPhoto:async()=>'',removePhotos:async()=>{}
});`;

async function openGrid(browser,viewport,errors){
      const page=await browser.newPage({viewport});
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.hostname!=='vivox.test') return route.continue();
        if(url.pathname==='/api/lp'){ const r=await runProxy(url.href); return route.fulfill({status:r.status,headers:r.headers,body:r.body}); }
        const file=path.join(root,url.pathname);
        if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) return route.fulfill({status:404,body:''});
        let body=fs.readFileSync(file);
        if(url.pathname==='/common.js') body=body.toString()+mock;
        const ext=path.extname(file);
        return route.fulfill({body,contentType:{'.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[ext]||'application/javascript'});
      });
      await page.goto('http://vivox.test/lp.html?m=LP_TESTE');
      await page.waitForFunction(()=>!document.querySelector('#loader').classList.contains('show'),null,{timeout:30000});
      return page;
}

// Escreve e envia o comentário aberto no balão.
async function send(page,text){
  if(await page.locator('.bubble .b-author[type="text"]').count()) await page.locator('.bubble .b-author').fill('Teste');
  await page.locator('.bubble .b-text').fill(text);
  const n=await page.evaluate(()=>testCalls.length);
  await page.locator('.bubble .b-send').click();
  await page.waitForFunction(n=>window.testCalls.length===n+1,n);
  return (await page.evaluate(()=>testCalls[testCalls.length-1][1]));
}
const metaOf=c=>(c.photos.find(p=>p&&typeof p==='object'&&p.vx_lp)||{}).vx_lp;

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const errors=[];
      const page=await openGrid(browser,viewport,errors);
      assert.equal(await page.locator('.lp-page').count(),PAGES.length);
      await page.waitForSelector('.pin[data-tid="c1"]',{state:'attached'});
      const lpFrame=async()=>(await page.$('#lpFrame')).contentFrame();
      const frame=await lpFrame();
      assert.ok(frame,'iframe da LP');
      await frame.waitForFunction(()=>document.documentElement.scrollHeight>3000,null,{timeout:20000});
      if(SHOTS) await page.screenshot({path:path.join(SHOTS,`lp-${viewport.width}-top.jpg`),quality:60});

      // A roda do mouse no modo comentário rola o site, e a camada de pins acompanha.
      await page.locator('#cmtTool').click();
      assert.equal(await page.locator('#lpCatch').isVisible(),true);
      const box=await page.locator('#lpCatch').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.mouse.wheel(0,1200);
      await page.waitForFunction(()=>/translateY\(-[1-9]/.test(document.querySelector('#lpDoc').style.transform));
      const scrolled=await frame.evaluate(()=>scrollY);
      assert.ok(scrolled>200,'rolou o site: '+scrolled);

      // Clique cria um comentário na posição do documento (y em px, somando a rolagem).
      await page.mouse.click(box.x+box.width*0.25,box.y+40);
      await page.locator('.b-author').fill('Teste');
      await page.locator('.b-text').fill('Ajustar este título');
      await page.locator('.b-send').click();
      await page.waitForFunction(()=>window.testCalls.length===1);
      const [,c]=(await page.evaluate(()=>testCalls))[0];
      const mobileLayout=viewport.width<500;
      assert.equal(c.page_index,0);
      assert.ok(Math.abs(c.x-0.25)<0.02,'x relativo '+c.x);
      const scale=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#viewer')).getPropertyValue('--lp-inv')));
      assert.ok(Math.abs(c.y-(scrolled+40*scale))<6,`y no documento ${c.y} ≈ ${scrolled}+${40*scale}`);

      // Link interno dentro da LP volta para o grid e troca a página da lista.
      await frame.evaluate(()=>document.querySelector('a[href="/hemorroidas/"]').click());
      await page.waitForFunction(()=>document.querySelectorAll('.lp-page')[1].classList.contains('is-on'),null,{timeout:20000});
      await page.waitForFunction(()=>!!document.querySelector('#lpFrame').src.includes('%2Fhemorroidas%2F'));

      // Celular: largura real de 390 px, pins do celular (page_index ímpar).
      await page.locator('.lp-seg-btn[data-device="mobile"]').click();
      await page.locator('.lp-page').first().click();
      await page.waitForSelector('.pin[data-tid="c2"]',{state:'attached'});
      assert.equal(await page.locator('.pin[data-tid="c1"]').count(),0);
      await page.waitForTimeout(800);
      const fw=await (await lpFrame()).evaluate(()=>innerWidth);
      assert.equal(fw,390);
      await page.waitForTimeout(1500);
      if(SHOTS) await page.screenshot({path:path.join(SHOTS,`lp-${viewport.width}-mobile.jpg`),quality:60});

      // Visão geral com um quadro por página.
      await page.locator('#overviewBtn').click();
      assert.equal(await page.locator('.lp-frame-card').count(),PAGES.length);
      if(SHOTS){ await page.waitForTimeout(4000); await page.screenshot({path:path.join(SHOTS,`lp-${viewport.width}-overview.jpg`),quality:60}); }
      await page.locator('.lp-frame-card').nth(2).click();
      await page.waitForFunction(()=>document.querySelectorAll('.lp-page')[2].classList.contains('is-on'));

      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,scrolled,comment:{x:+c.x.toFixed(3),y:c.y},mobileLayout,ok:true}));
      await page.close();
    }

    // ---- Âncoras: o comentário acompanha o componente (popup e carrossel) ----
    {
      const errors=[];
      const page=await openGrid(browser,{width:1440,height:1000},errors);
      const frame=await (await page.$('#lpFrame')).contentFrame();
      await frame.waitForFunction(()=>document.documentElement.scrollHeight>3000,null,{timeout:20000});
      const scale=1/await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#viewer')).getPropertyValue('--lp-inv')));
      const toGrid=async p=>{ const b=await page.locator('#lpDoc').boundingBox(); const c=await page.locator('#lpDevice').boundingBox(); return {x:c.x+p.x*scale,y:c.y+p.y*scale}; };
      const floatPin=id=>page.evaluate(id=>{const p=document.querySelector(`#lpFloat .pin[data-tid="${id}"]`);if(!p)return null;const h=!!p.closest('[hidden]')||p.hidden;const r=p.getBoundingClientRect();return {hidden:h,x:r.left+r.width/2,y:r.top+r.height/2};},id);

      // 1) Popup: abre o certificado pela própria LP e comenta dentro dele.
      await frame.evaluate(()=>{const b=document.querySelector('button[aria-controls="certificate-dialog"]');b.scrollIntoView({block:'center'});b.click();});
      await frame.waitForFunction(()=>document.getElementById('certificate-dialog').open);
      await page.waitForTimeout(600);
      const inDlg=await frame.evaluate(()=>{const d=document.getElementById('certificate-dialog');const e=d.querySelector('img')||d;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
      await page.locator('#cmtTool').click();
      const g=await toGrid(inDlg);
      await page.mouse.move(g.x,g.y); await page.waitForTimeout(250);
      const label=await frame.evaluate(()=>{const o=[...document.documentElement.children].find(e=>e.getAttribute&&e.getAttribute('aria-hidden')==='true'&&e.style.zIndex==='2147483647');return o&&o.style.display!=='none'?o.textContent:'';});
      assert.match(label,/^Popup/,'destaque do componente: '+label);
      await page.mouse.click(g.x,g.y);
      await page.waitForSelector('.bubble .lp-ctx');
      assert.match(await page.locator('.bubble .lp-ctx').textContent(),/Popup/);
      const pc=await send(page,'No certificado');
      const pm=metaOf(pc);
      assert.equal(pm.ctx,'popup'); assert.ok(pm.opener,'guarda o botão que abriu o popup');
      assert.equal(pc.w,undefined,'não usa as colunas w/h');
      const pid='n'+(await page.evaluate(()=>testCalls.length));
      await page.waitForFunction(id=>{const p=document.querySelector(`#lpFloat .pin[data-tid="${id}"]`);return p&&!p.hidden;},pid,{timeout:5000});
      if(SHOTS) await page.screenshot({path:path.join(SHOTS,'anchor-popup.jpg'),quality:60});
      // fechar o popup esconde o pin
      await frame.evaluate(()=>document.getElementById('certificate-dialog').close());
      await page.waitForFunction(id=>document.querySelector(`#lpFloat .pin[data-tid="${id}"]`).hidden,pid,{timeout:5000});
      // ir até o comentário reabre o popup pelo mesmo botão
      await page.locator('#listBtn').click();
      await page.locator('.cmt-card',{hasText:'No certificado'}).click();
      await frame.waitForFunction(()=>document.getElementById('certificate-dialog').open,null,{timeout:8000});
      await page.waitForFunction(id=>!document.querySelector(`#lpFloat .pin[data-tid="${id}"]`).hidden,pid,{timeout:5000});
      await page.waitForSelector('.bubble-thread .lp-ctx');
      await page.keyboard.press('Escape');
      await frame.evaluate(()=>document.getElementById('certificate-dialog').close());

      // 1b) Popup compartilhado: o "+" de cada card abre o mesmo #atuacao-modal com outro conteúdo.
      await frame.evaluate(()=>{const b=document.querySelectorAll('#atuacao-track .apple-card-plus')[1];b.scrollIntoView({block:'center',inline:'center'});b.click();});
      await frame.waitForFunction(()=>{const m=document.getElementById('atuacao-modal');return m&&(m.open||getComputedStyle(m).display!=='none');},null,{timeout:5000});
      await page.waitForTimeout(700);
      const inModal=await frame.evaluate(()=>{const m=document.getElementById('atuacao-modal');const e=m.querySelector('h2,h3,[class*=title]')||m;const r=e.getBoundingClientRect();return {x:r.left+Math.min(40,r.width/2),y:r.top+r.height/2,title:e.textContent.trim().slice(0,40)};});
      await page.locator('#cmtTool').click();
      const g3=await toGrid(inModal); await page.mouse.click(g3.x,g3.y);
      await page.waitForSelector('.bubble .lp-ctx');
      const mc=await send(page,'No detalhe do card'); const mm=metaOf(mc);
      assert.equal(mm.ctx,'popup'); assert.ok(mm.opener,'opener do +');
      const mid='n'+(await page.evaluate(()=>testCalls.length));
      await frame.evaluate(()=>{const m=document.getElementById('atuacao-modal');if(m.close)m.close();m.querySelector('[aria-label*=echar],button')?.click();});
      await page.waitForFunction(id=>document.querySelector(`#lpFloat .pin[data-tid="${id}"]`).hidden,mid,{timeout:5000});
      // abrir OUTRO card antes: ir ao comentário deve reabrir pelo "+" certo
      await page.locator('#listBtn').click();
      await page.locator('.cmt-card',{hasText:'No detalhe do card'}).click();
      await page.waitForFunction(id=>!document.querySelector(`#lpFloat .pin[data-tid="${id}"]`).hidden,mid,{timeout:8000});
      const reopened=await frame.evaluate(()=>{const m=document.getElementById('atuacao-modal');return (m.querySelector('h2,h3,[class*=title]')||m).textContent.trim().slice(0,40);});
      assert.equal(reopened,inModal.title,'reabriu o detalhe do mesmo card');
      if(SHOTS) await page.screenshot({path:path.join(SHOTS,'anchor-modal.jpg'),quality:60});
      await page.keyboard.press('Escape');
      await frame.evaluate(()=>{const m=document.getElementById('atuacao-modal');if(m.close)m.close();m.querySelector('[aria-label*=echar],button')?.click();});
      await page.waitForTimeout(400);

      // 2) Carrossel: comenta num card de "Áreas de atuação" e rola o carrossel.
      await frame.evaluate(()=>document.getElementById('atuacao').scrollIntoView({block:'start'}));
      await page.waitForTimeout(700);
      const card=await frame.evaluate(()=>{const cs=[...document.querySelectorAll('#atuacao-track .apple-card')];const v=cs.filter(c=>{const r=c.getBoundingClientRect();return r.left>40&&r.right<innerWidth-40&&r.top>0;}).pop();const r=v.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*0.4};});
      await page.locator('#cmtTool').click();
      const g2=await toGrid(card);
      await page.mouse.click(g2.x,g2.y);
      await page.waitForSelector('.bubble .lp-ctx');
      const cc=await send(page,'No card');
      assert.equal(metaOf(cc).ctx,'carousel');
      const cid='n'+(await page.evaluate(()=>testCalls.length));
      await page.waitForFunction(id=>{const p=document.querySelector(`#lpFloat .pin[data-tid="${id}"]`);return p&&!p.hidden;},cid,{timeout:5000});
      const before=await floatPin(cid);
      // um card para o lado: o card comentado continua visível e o pin anda junto
      await frame.evaluate(()=>{const t=document.getElementById('atuacao-track');const c=t.querySelector('.apple-card');t.scrollBy({left:c.getBoundingClientRect().width+16,behavior:'instant'});});
      await page.waitForTimeout(1200);
      const after=await floatPin(cid);
      assert.ok(!after.hidden && before.x-after.x>100,`o pin acompanha o card: ${before.x} → ${after.x} ${after.hidden}`);
      assert.match(metaOf(cc).ctxItem||'',/\S/,'nome do card');
      await frame.evaluate(()=>{const t=document.getElementById('atuacao-track');t.scrollTo({left:t.scrollWidth,behavior:'instant'});});
      await page.waitForTimeout(900);
      const gone=await floatPin(cid);
      if(SHOTS) await page.screenshot({path:path.join(SHOTS,'anchor-carousel-away.jpg'),quality:60});
      // ir até o comentário traz o card de volta
      await page.locator('#listBtn').click();
      await page.locator('.cmt-card',{hasText:'No card'}).click();
      await page.waitForFunction(id=>!document.querySelector(`#lpFloat .pin[data-tid="${id}"]`).hidden,cid,{timeout:8000});
      await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
      if(SHOTS) await page.screenshot({path:path.join(SHOTS,'anchor-carousel.jpg'),quality:60});

      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({ancoras:'ok',popup:{opener:pm.opener,ctxName:pm.ctxName,label:pm.label},carrossel:{card:metaOf(cc).ctxItem,nome:metaOf(cc).ctxName,antes:Math.round(before.x),depois:Math.round(after.x),noFim:gone.hidden?'oculto':'visível'}}));
      await page.close();
    }
  }finally{ await browser.close(); }
})().catch(err=>{ console.error(err); process.exit(1); });
