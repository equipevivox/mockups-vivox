// Executar manualmente com Playwright instalado; todas as requisições são interceptadas.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const type=process.env.VIVOX_TEST_TYPE||'apresentacao';
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.hostname!=='vivox.test') return route.fulfill({body:url.href.includes('supabase')?'window.supabase={createClient:()=>({})};':'',contentType:'application/javascript'});
        if(url.pathname==='/slide.svg' || url.pathname.startsWith('/public/')) return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#876224"/><text x="100" y="200" font-size="90" fill="white">SLIDE 16:9</text></svg>'});
        let file=path.join(root,url.pathname);
        if(!fs.existsSync(file)) return route.fulfill({status:404,body:''});
        let body=fs.readFileSync(file);
        if(url.pathname==='/viewer.js' && type==='apresentacao')body='window.turnCalls=0;jQuery.fn.turn=function(){window.turnCalls++;throw new Error("turn.js não deve ser chamado em apresentação");};\n'+body;
        if(url.pathname==='/common.js') body=body.toString()+`\nwindow.testCalls=[];Object.assign(VX,{
          getMockup:async()=>({id:'TESTE',name:'Apresentação simulada',type:'${type}',aspect:0.5625,num_pages:3}),
          publicUrl:p=>'http://vivox.test/public/'+p,
          pageUrl:()=>'/slide.svg',listComments:async()=>[{id:'c1',author:'Teste',body:'Comentário simulado',page_index:0,x:0.5,y:0.5,w:0.2,h:0.2,resolved:false,photos:[1,'javascript:alert(1)','x" onerror="window.xss=1','https://evil.test/foto','http://vivox.test/public/foto.svg']},{id:'r1',parent_id:'c1',author:'Resposta',body:'Foto',photos:[{},'data:image/png,x','http://vivox.test/public/resposta.svg']}],
          addComment:async c=>{if(window.failComment)throw {code:'PGRST204',message:"Could not find the 'w' column"};testCalls.push(['comment',c]);return {positioned:true};},addReply:async(id,c)=>{if(window.failReply)throw window.failReply;testCalls.push(['reply',c]);},setResolved:async()=>{testCalls.push(['resolved']);},uploadPhoto:async()=>{testCalls.push(['photo']);return 'http://vivox.test/public/upload.svg';},removePhotos:async urls=>{testCalls.push(['cleanup',urls]);}
        });`;
        return route.fulfill({body,contentType:url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.svg')?'image/svg+xml':'application/javascript'});
      });
      await page.goto('http://vivox.test/viewer.html?m=TESTE');
      await page.waitForFunction(()=>!document.querySelector('#loader').classList.contains('show'));
      if(type==='folder'){
        await page.locator('#fsBtn').click();await page.waitForTimeout(300);
        assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'viewer');
        await page.evaluate(()=>document.exitFullscreen());
        console.log(JSON.stringify({viewport,type,fullscreen:'OK'}));await page.close();continue;
      }
      await page.waitForSelector('.pg .pin');
      assert.equal(await page.locator('#folderControls').isVisible(),false);
      const dims=await page.evaluate(()=>{
        const p=document.querySelector('.pg').getBoundingClientRect(),a=document.querySelector('#flipArea').getBoundingClientRect();
        return {w:p.width,h:p.height,aw:a.width,ah:a.height,display:document.querySelector('#flipbook').classList.contains('slide-deck')?'single':jQuery('#flipbook').turn('display')};
      });
      assert.equal(dims.display,type==='revista' && viewport.width>760?'double':'single');assert.ok(Math.abs(dims.h/dims.w-9/16)<0.01);assert.ok(dims.w<=dims.aw && dims.h<=dims.ah);
      await page.locator('.pin').click();assert.equal(await page.locator('#bubble').isVisible(),true);
      if(viewport.width===390){
        await page.keyboard.press('Escape');
        const pin=await page.locator('.pin').boundingBox(),cdp=await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pin.x+pin.width/2,y:pin.y+pin.height/2}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.equal(await page.locator('#bubble').isVisible(),true);
      }
      assert.equal(await page.locator('.b-photos img').count(),2);
      assert.equal(await page.evaluate(()=>!!window.xss),false);
      await page.evaluate(()=>{window.open=(...args)=>{window.openArgs=args;};});
      await page.locator('.b-photos img').first().click();
      assert.equal(await page.evaluate(()=>window.openArgs[2]),'noopener,noreferrer');
      assert.equal(await page.locator('.comment-region').evaluate(el=>el.classList.contains('is-active')),true);
      await page.locator('.b-author').fill('Teste');
      await page.locator('.th-text').fill('Resposta simulada');
      await page.locator('#bubble input[type=file]').setInputFiles({name:'resposta.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')});
      await page.locator('.th-send').click();
      await page.waitForFunction(()=>testCalls.some(c=>c[0]==='reply'));
      assert.equal(await page.evaluate(()=>testCalls.find(c=>c[0]==='reply')[1].photos.length),1);
      await page.locator('.th-done').click();
      await page.waitForFunction(()=>testCalls.some(c=>c[0]==='resolved'));
      await page.locator('#hideBtn').click();assert.equal(await page.locator('.pin').isVisible(),false);
      await page.locator('#hideBtn').click();
      await page.locator('#listBtn').click();
      await page.locator('.drw-filters [data-f="entregues"]').click();
      assert.equal(await page.locator('.drw-filters [data-f="entregues"]').getAttribute('class'),'pf-chip is-on');
      await page.keyboard.press('Escape');
      await page.locator('#cmtTool').click();
      await page.locator('.pg[data-page="0"]').click({position:{x:100,y:80}});
      await page.locator('.b-text').fill('Novo pin com foto');
      await page.locator('#bubble input[type=file]').setInputFiles({name:'teste.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')});
      await page.locator('.b-send').click();
      await page.waitForFunction(()=>testCalls.some(c=>c[0]==='comment'));
      assert.equal(await page.evaluate(()=>testCalls.find(c=>c[0]==='comment')[1].photos.length),1);
      assert.equal(await page.evaluate(()=>Object.hasOwn(testCalls.find(c=>c[0]==='comment')[1],'w')),false);
      await page.locator('#cmtTool').click();
      const surface=await page.locator('.pg[data-page="0"]').boundingBox();
      await page.mouse.move(surface.x+60,surface.y+40);await page.mouse.down();
      await page.mouse.move(surface.x+180,surface.y+120,{steps:8});await page.mouse.up();
      await page.locator('.b-text').fill('Área simulada');
      assert.equal(await page.locator('.area-draft').count(),1);
      await page.locator('.b-send').click();
      await page.waitForFunction(()=>testCalls.filter(c=>c[0]==='comment').length===2);
      const area=await page.evaluate(()=>testCalls.filter(c=>c[0]==='comment')[1][1]);
      assert.ok(Math.abs(area.w-120/surface.width)<0.01 && Math.abs(area.h-80/surface.height)<0.01,JSON.stringify({area,surface}));
      if(viewport.width===390){
        await page.locator('#cmtTool').click();
        const cdp=await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:surface.x+50,y:surface.y+30}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:surface.x+160,y:surface.y+100}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.locator('.b-text').fill('Área por toque');
        await page.locator('.b-text').evaluate(el=>{
          const data=new DataTransfer();data.setData('text/plain','Texto colado');data.items.add(new File(['imagem'],'colada.png',{type:'image/png'}));
          el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
        });
        assert.ok((await page.locator('.b-text').inputValue()).includes('Texto colado'));
        await page.locator('.bubble-box').evaluate(el=>{
          const data=new DataTransfer();for(let i=0;i<6;i++)data.items.add(new File(['imagem'],'solta'+i+'.png',{type:'image/png'}));
          el.dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));
        });
        assert.equal(await page.locator('.b-thumbs .th').count(),5);
        await page.locator('.b-thumbs .th button').first().click();
        assert.equal(await page.locator('.b-thumbs .th').count(),4);
        await page.locator('.b-send').click();
        await page.waitForFunction(()=>testCalls.filter(c=>c[0]==='comment').length===3);
        const touch=await page.evaluate(()=>testCalls.filter(c=>c[0]==='comment')[2][1]);
        assert.ok(touch.w>0 && touch.h>0);assert.equal(touch.photos.length,4);
      }
      await page.locator('#nextBtn').click();await page.waitForTimeout(1100);
      assert.equal(await page.locator('#pageInput').inputValue(),'2');
      await page.locator('#cmtTool').click();assert.equal(await page.evaluate(()=>document.querySelector('#flipbook').classList.contains('slide-deck')?document.body.classList.contains('cmt-mode'):jQuery('#flipbook').turn('disabled')),true);
      if(type==='apresentacao'){
      await page.locator('#fsBtn').click();await page.waitForTimeout(500);
      assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'viewer');
      await page.evaluate(()=>document.exitFullscreen());await page.waitForTimeout(400);
      assert.equal(await page.locator('#pageInput').inputValue(),'2');
      await page.keyboard.press('Escape');
      await page.evaluate(()=>{document.querySelector('#nextBtn').click();document.querySelector('#prevBtn').click();document.querySelector('#nextBtn').click();});
      assert.equal(await page.locator('#pageInput').inputValue(),'3');
      assert.equal(await page.locator('.slide-deck>.is-current').count(),1);
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#flipbook>.pg').evaluateAll(els=>els.filter(el=>getComputedStyle(el).visibility==='visible').length),1);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('#prevBtn').click();
      assert.equal(await page.locator('.pg.is-current').evaluate(el=>el.getAnimations().length),0);
      await page.emulateMedia({reducedMotion:'no-preference'});
      if(viewport.width===390){
        const r=await page.locator('.pg.is-current').boundingBox();
        const cdp=await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width-60,y:r.y+80}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+60,y:r.y+85}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.equal(await page.locator('#pageInput').inputValue(),'3');
      }
      assert.equal(await page.evaluate(()=>window.turnCalls),0);
      await page.locator('#pageInput').fill('3');await page.locator('#pageInput').dispatchEvent('change');
      await page.locator('#listBtn').click();
      await page.locator('.drw-filters [data-f="abertos"]').click();
      await page.locator('.cmt-card').first().click();
      await page.waitForTimeout(500);
      assert.equal(await page.locator('#pageInput').inputValue(),'1');
      assert.equal(await page.locator('#bubble').isVisible(),true);
      await page.keyboard.press('Escape');
      await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#pageInput').inputValue(),'2');
      await page.setViewportSize({width:viewport.width+10,height:viewport.height-20});await page.waitForTimeout(300);
      assert.equal(await page.locator('#pageInput').inputValue(),'2');
      assert.equal(await page.locator('.pg.is-current').count(),1);
      }else assert.equal(await page.locator('#fsBtn').isVisible(),true);
      await page.keyboard.press('Escape');
      await page.locator('#firstBtn').click();await page.waitForTimeout(1100);
      await page.locator('.pin').click();
      await page.locator('.th-text').fill('Rascunho preservado');
      await page.locator('#fsBtn').evaluate(el=>el.click());await page.waitForTimeout(350);
      assert.equal(await page.locator('.th-text').inputValue(),'Rascunho preservado');
      await page.evaluate(()=>document.exitFullscreen());await page.waitForTimeout(350);
      assert.equal(await page.locator('.th-text').inputValue(),'Rascunho preservado');
      await page.locator('#bubble input[type=file]').setInputFiles({name:'resposta.png',mimeType:'image/png',buffer:Buffer.from('teste')});
      await page.evaluate(()=>{window.failReply={code:'NETWORK',message:'Falha de rede simulada'};});
      await page.locator('.th-send').click();
      await page.waitForFunction(()=>testCalls.some(c=>c[0]==='cleanup'));
      assert.equal(await page.locator('.th-text').inputValue(),'Rascunho preservado');
      assert.equal(await page.locator('.b-thumbs .th').count(),1);
      assert.ok((await page.locator('#toast').textContent()).includes('Falha de rede simulada'));
      await page.evaluate(()=>{window.failReply={code:'PGRST204',message:"Could not find the 'parent_id' column"};});
      await page.locator('.th-send').click();
      await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('parent_id'));
      const currentUrl=page.url();
      await page.locator('body').evaluate(el=>{
        const data=new DataTransfer();data.items.add(new File(['imagem'],'fora.png',{type:'image/png'}));
        const event=new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true});el.dispatchEvent(event);window.dropBlocked=event.defaultPrevented;
      });
      assert.equal(await page.evaluate(()=>window.dropBlocked),true);assert.equal(page.url(),currentUrl);
      await page.keyboard.press('Escape');
      await page.locator('#cmtTool').click();
      const rect=await page.locator('.pg[data-page="0"]').boundingBox();
      await page.mouse.move(rect.x+50,rect.y+30);await page.mouse.down();await page.mouse.move(rect.x+150,rect.y+90,{steps:5});await page.mouse.up();
      await page.locator('.b-text').fill('Área ainda não migrada');
      await page.locator('#bubble input[type=file]').setInputFiles({name:'area.png',mimeType:'image/png',buffer:Buffer.from('teste')});
      const cleanups=await page.evaluate(()=>testCalls.filter(c=>c[0]==='cleanup').length);
      await page.evaluate(()=>{window.failComment=true;});await page.locator('.b-send').click();
      await page.waitForFunction(n=>testCalls.filter(c=>c[0]==='cleanup').length>n,cleanups);
      assert.equal(await page.locator('.b-text').inputValue(),'Área ainda não migrada');
      assert.equal(await page.locator('.b-thumbs .th').count(),1);
      assert.ok((await page.locator('#toast').textContent()).includes('ainda não estão disponíveis'));
      assert.deepEqual(errors,[]);
      await page.screenshot({path:path.join(os.tmpdir(),`vivox-${type}-${viewport.width}.png`)});
      console.log(JSON.stringify({viewport,dims,errors,resultado:'OK'}));await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
