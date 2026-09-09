/* VIVOX · Painel admin — envio de material, publicação no portfólio e gestão */
(function(){
  "use strict";
  const VX = window.VX, $ = VX.$, sb = VX.sb, BUCKET = VX.BUCKET;
  const ADMIN_USER = "VIVOX";
  const ADMIN_HASH = "dfcce3872a8fe394f4d91a7c4f016765e04a4ab1b4d054d90fe686fced31705d";
  const A4_ASPECT = 297/210;

  // PDF.js com worker local (same-origin) — cross-origin trava a thread principal
  if(typeof pdfjsLib!=="undefined") pdfjsLib.GlobalWorkerOptions.workerSrc="/pdf.worker.min.js";

  const loader=$("loader"), loaderSub=$("loaderSub"), progressBar=$("progressBar");
  let pendingFile=null, items=[], counts={};

  async function sha256(str){
    const buf=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  // ================= login =================
  $("loginForm").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const u=$("user").value.trim(), p=$("pass").value;
    const ok = u.toUpperCase()===ADMIN_USER && (await sha256(p))===ADMIN_HASH;
    if(!ok){ $("loginErr").textContent="Usuário ou senha inválidos."; return; }
    sessionStorage.setItem("vivox_admin","1"); enter();
  });
  $("logoutBtn").addEventListener("click",()=>{ sessionStorage.removeItem("vivox_admin"); location.reload(); });
  $("refreshBtn").addEventListener("click",load);
  function enter(){ $("loginWrap").style.display="none"; $("dash").classList.add("show"); load(); }

  // ================= listar =================
  async function load(){
    $("cards").innerHTML='<div class="loading">Carregando…</div>';
    try{
      const [mks, cms] = await Promise.all([ VX.listMockups(), sb.from("comments").select("mockup_id") ]);
      if(cms.error) throw cms.error;
      counts={}; (cms.data||[]).forEach(c=>counts[c.mockup_id]=(counts[c.mockup_id]||0)+1);
      items=mks; render(); checkMigration();
    }catch(err){ console.error(err); $("cards").innerHTML='<div class="empty">Erro ao carregar — '+VX.esc(err.message||String(err))+'</div>'; }
  }

  // se a coluna is_public não existir, o PostgREST simplesmente não devolve o campo
  function checkMigration(){
    const missing = items.length>0 && items.every(m=>m.is_public===undefined);
    $("migBanner").hidden = !missing;
    document.querySelectorAll(".pub-toggle").forEach(l=>l.classList.toggle("is-blocked",missing));
  }
  (function wireMigration(){
    const ref=(VX.cfg.SUPABASE_URL.match(/https:\/\/([^.]+)\./)||[])[1]||"";
    const link=$("migLink"); if(link) link.href="https://supabase.com/dashboard/project/"+ref+"/sql/new";
    $("migCopy").addEventListener("click",async()=>{
      const sql=$("migSql").textContent;
      try{ await navigator.clipboard.writeText(sql); VX.toast("SQL copiado — cole no SQL Editor e clique em Run."); }
      catch(e){ prompt("Copie o SQL:", sql); }
    });
    $("migRecheck").addEventListener("click",load);
  })();

  function render(){
    $("stMockups").textContent=items.length;
    $("stPublic").textContent=items.filter(m=>m.is_public===true).length;
    $("stComments").textContent=Object.values(counts).reduce((a,b)=>a+b,0);

    if(!items.length){ $("cards").innerHTML='<div class="empty">Nenhum material enviado ainda.</div>'; return; }
    $("cards").innerHTML="";
    items.forEach(m=>{
      const nc=counts[m.id]||0, pub=m.is_public===true;
      const link=location.origin+"/m/"+encodeURIComponent(m.id);
      const card=document.createElement("div"); card.className="card card--adm";
      card.innerHTML=`
        <div class="adm-thumb" style="background-image:url('${VX.pageUrl(m.id,0)}')"></div>
        <div class="meta">
          <div class="name"><span class="pf-type pf-type--${m.type}">${VX.TYPE_LABEL[m.type]}</span> <span class="material-name">${VX.esc((m.name||m.id).replace(/\.pdf$/i,""))}</span></div>
          <div class="sub">
            <span class="pill"><b>${m.num_pages||0}</b> páginas</span>
            <span class="pill"><b>${nc}</b> comentário${nc===1?"":"s"}</span>
            <span class="pill">Criado: <b>${VX.fmtDate(m.created_at)}</b></span>
          </div>
          <label class="pub-toggle"><input type="checkbox" ${pub?"checked":""} data-act="pub"> <span>Mostrar no portfólio</span></label>
          <form class="rename-form" hidden novalidate>
            <div class="field"><label>Nome exibido<input name="materialName" type="text" maxlength="120" required autocomplete="off" /></label></div>
            <p class="rename-help">Este nome aparece na página inicial e ao abrir o material.</p>
            <p class="rename-error" role="alert"></p>
            <div class="rename-actions"><button class="btn btn-gold" type="submit">Salvar nome</button><button class="btn" type="button" data-act="cancel-rename">Cancelar</button></div>
          </form>
        </div>
        <div class="acts">
          <a class="btn" href="/m/${encodeURIComponent(m.id)}" target="_blank" rel="noopener">Abrir</a>
          <a class="btn" href="/m/${encodeURIComponent(m.id)}?comment=1" target="_blank" rel="noopener">Comentar</a>
          <button class="btn" data-act="copy">Copiar link</button>
          <button class="btn" data-act="rename" aria-expanded="false">Renomear</button>
          <button class="btn btn-danger" data-act="del">Excluir</button>
        </div>`;
      card.querySelector('[data-act="copy"]').addEventListener("click",async()=>{
        try{ await navigator.clipboard.writeText(link); VX.toast("Link copiado: /m/"+m.id); }
        catch(e){ prompt("Copie o link:",link); }
      });
      card.querySelector('[data-act="del"]').addEventListener("click",()=>del(m));
      card.querySelector('[data-act="pub"]').addEventListener("change",(e)=>togglePublic(m,e.target));
      wireRename(card,m);
      $("cards").appendChild(card);
    });
  }

  function wireRename(card,m){
    const button=card.querySelector('[data-act="rename"]'), form=card.querySelector(".rename-form");
    const input=form.elements.materialName, error=form.querySelector(".rename-error"), save=form.querySelector('[type="submit"]');
    const hintId="rename-help-"+m.id, errorId="rename-error-"+m.id;
    form.id="rename-"+m.id;
    form.querySelector(".rename-help").id=hintId; error.id=errorId;
    input.setAttribute("aria-describedby",hintId+" "+errorId);
    button.setAttribute("aria-controls",form.id);
    let saving=false;
    function close(){
      if(saving) return;
      form.hidden=true; button.setAttribute("aria-expanded","false"); button.focus();
    }
    button.addEventListener("click",()=>{
      if(saving) return;
      if(!form.hidden){ close(); return; }
      input.value=(m.name||m.id).replace(/\.pdf$/i,"");
      error.textContent=""; input.removeAttribute("aria-invalid");
      form.hidden=false; button.setAttribute("aria-expanded","true"); input.focus(); input.select();
    });
    form.querySelector('[data-act="cancel-rename"]').addEventListener("click",close);
    form.addEventListener("keydown",event=>{ if(event.key==="Escape"){event.preventDefault();close();} });
    input.addEventListener("input",()=>{error.textContent="";input.removeAttribute("aria-invalid");});
    form.addEventListener("submit",async event=>{
      event.preventDefault(); if(saving) return;
      let name;
      try{ name=VX.normalizeMaterialName(input.value); }
      catch(err){error.textContent=err.message;input.setAttribute("aria-invalid","true");input.focus();return;}
      if(name===m.name){close();return;}
      saving=true; error.textContent=""; form.setAttribute("aria-busy","true"); save.textContent="Salvando…";
      const controls=[...form.querySelectorAll("input,button")];
      controls.forEach(control=>control.disabled=true);
      let saved=false;
      try{
        const updated=await VX.renameMockup(m.id,name);
        m.name=updated.name;
        card.querySelector(".material-name").textContent=updated.name.replace(/\.pdf$/i,"");
        VX.notifyMaterialsChanged(m.id); VX.toast("Nome atualizado."); saved=true;
      }catch(err){
        console.error(err); error.textContent="Não foi possível salvar o nome. Tente novamente.";
      }finally{
        saving=false; form.removeAttribute("aria-busy"); save.textContent="Salvar nome";
        controls.forEach(control=>control.disabled=false);
        if(saved) close(); else input.focus();
      }
    });
  }

  async function togglePublic(m, input){
    const val=input.checked;
    try{
      const { error } = await sb.from("mockups").update({ is_public: val }).eq("id", m.id);
      if(error) throw error;
      m.is_public=val; render();
      VX.notifyMaterialsChanged(m.id);
      VX.toast(val ? "Publicado no portfólio." : "Removido do portfólio.");
    }catch(err){
      input.checked=!val;
      console.error(err);
      VX.toast("Não consegui publicar. Falta rodar a migração da coluna is_public no Supabase.", true);
    }
  }

  async function removeFolder(prefix){
    const { data } = await sb.storage.from(BUCKET).list(prefix,{limit:1000});
    if(data && data.length) await sb.storage.from(BUCKET).remove(data.map(o=>`${prefix}/${o.name}`));
  }
  async function del(m){
    if(!confirm(`Excluir "${m.name||m.id}" e todos os seus comentários e arquivos? Não dá para desfazer.`)) return;
    try{
      await removeFolder(`${m.id}/pages`); await removeFolder(`${m.id}/photos`);
      const { error } = await sb.from("mockups").delete().eq("id", m.id);
      if(error) throw error;
      VX.notifyMaterialsChanged(m.id);
      VX.toast("Material excluído."); load();
    }catch(err){ console.error(err); VX.toast("Erro ao excluir — "+(err.message||err), true); }
  }

  // ================= upload =================
  $("uploadBtn").addEventListener("click",()=>$("fileInput").click());
  $("fileInput").addEventListener("change",(e)=>{
    const f=e.target.files&&e.target.files[0]; if(f) askType(f); e.target.value="";
  });
  function askType(file){
    if(file.type!=="application/pdf" && !/\.pdf$/i.test(file.name)){ VX.toast("Envie um arquivo PDF."); return; }
    pendingFile=file; $("typeFileName").textContent=file.name;
    $("typeModal").classList.add("show"); $("typeBackdrop").classList.add("show");
  }
  function closeType(){ $("typeModal").classList.remove("show"); $("typeBackdrop").classList.remove("show"); }
  $("typeClose").addEventListener("click",closeType);
  $("typeBackdrop").addEventListener("click",closeType);
  document.querySelectorAll(".type-opt").forEach(b=>b.addEventListener("click",()=>{
    const t=b.dataset.type, f=pendingFile; closeType(); if(f) startUpload(f,t);
  }));

  async function renderPdf(buf){
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const num = pdf.numPages, images=[];
    for(let i=1;i<=num;i++){
      const page=await pdf.getPage(i);
      const base=page.getViewport({scale:1});
      const scale=Math.min(3, Math.max(1, 1400/base.width));
      const vp=page.getViewport({scale});
      const c=document.createElement("canvas");
      c.width=Math.floor(vp.width); c.height=Math.floor(vp.height);
      const ctx=c.getContext("2d",{alpha:false}); ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height);
      await page.render({canvasContext:ctx, viewport:vp}).promise;
      images.push(c.toDataURL("image/jpeg",0.82));
      progressBar.style.width=Math.round((i/num)*100)+"%";
      loaderSub.textContent=`Renderizando página ${i} de ${num}…`;
      c.width=c.height=0;
    }
    const aspect=await imgAspect(images[0]);
    return { images, aspect };
  }
  function imgAspect(src){ return new Promise(r=>{ const im=new Image();
    im.onload=()=>r(im.naturalHeight/im.naturalWidth); im.onerror=()=>r(60/49); im.src=src; }); }
  function dataURLtoBlob(d){
    const mime=(d.slice(0,d.indexOf(",")).match(/data:(.*?);/)||[])[1]||"image/jpeg";
    const bin=atob(d.slice(d.indexOf(",")+1)); const u8=new Uint8Array(bin.length);
    for(let k=0;k<bin.length;k++)u8[k]=bin.charCodeAt(k);
    return new Blob([u8],{type:mime});
  }
  async function uploadPages(slug, images){
    try{ const { data:old } = await sb.storage.from(BUCKET).list(slug+"/pages");
      if(old&&old.length) await sb.storage.from(BUCKET).remove(old.map(o=>`${slug}/pages/${o.name}`)); }catch(e){}
    for(let i=0;i<images.length;i++){
      const { error } = await sb.storage.from(BUCKET).upload(`${slug}/pages/${i}.jpg`, dataURLtoBlob(images[i]),
        { contentType:"image/jpeg", upsert:true });
      if(error) throw error;
      progressBar.style.width=Math.round(((i+1)/images.length)*100)+"%";
      loaderSub.textContent=`Enviando página ${i+1} de ${images.length}…`;
    }
  }

  async function startUpload(file, type){
    type = (type==="mockup"||type==="folder") ? type : "revista";
    loader.classList.add("show"); progressBar.style.width="0%"; loaderSub.textContent="Lendo o PDF…";
    let out;
    try{ out = await renderPdf(await file.arrayBuffer()); }
    catch(err){ console.error(err); loader.classList.remove("show");
      VX.toast("Não foi possível ler este PDF — "+(err.message||err), true); return; }

    if(type==="mockup" && Math.abs(out.aspect - A4_ASPECT) > 0.03){
      loader.classList.remove("show");
      VX.toast("Mockups precisam ser A4 retrato (210×297). Envie como Revista ou ajuste o arquivo.", true); return;
    }
    if(type==="folder" && out.images.length!==2){
      loader.classList.remove("show");
      VX.toast("Folder precisa de um PDF com exatamente 2 páginas (frente e verso). Este tem "+out.images.length+".", true); return;
    }

    const slug=VX.makeSlug(file.name);
    loaderSub.textContent="Enviando para a nuvem…"; progressBar.style.width="0%";
    try{
      const existing=await VX.getMockup(slug);
      await uploadPages(slug, out.images);
      const row={ num_pages:out.images.length, aspect:out.aspect, type, expires_at:null };
      // Ao substituir o PDF, preserva o nome editado e o estado de publicação.
      const query=existing ? sb.from("mockups").update(row).eq("id",slug)
        : sb.from("mockups").insert({id:slug,name:file.name,...row});
      const { error } = await query.select("id").single();
      if(error) throw error;
      loader.classList.remove("show");
      VX.toast("Material enviado: "+slug);
      VX.notifyMaterialsChanged(slug);
      load();
    }catch(err){ console.error(err); loader.classList.remove("show");
      VX.toast("Erro ao salvar — "+(err.message||err), true); }
  }

  if(sessionStorage.getItem("vivox_admin")==="1") enter();
})();
