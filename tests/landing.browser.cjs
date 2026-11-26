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
  listComments:async()=>window.testComments||[{id:'c1',author:'Ana',body:'Trocar a foto do topo',page_index:0,x:0.5,y:300,resolved:false,photos:[]},
    {id:'c2',author:'Bia',body:'Área no celular',page_index:1,x:0.1,y:500,w:0.5,h:0.02,resolved:false,photos:[]}],
  addComment:async c=>{testCalls.push(['comment',c]);return {positioned:true};},
  addReply:async()=>{},setResolved:async()=>{},uploadPhoto:async()=>'',removePhotos:async()=>{}
});`;

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
  }finally{ await browser.close(); }
})().catch(err=>{ console.error(err); process.exit(1); });
