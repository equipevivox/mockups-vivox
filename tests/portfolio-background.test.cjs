/* Executar: node --test tests/*.test.cjs */
const test=require("node:test"), assert=require("node:assert/strict");
const vm=require("node:vm"), fs=require("node:fs"), path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../portfolio-background.js"),"utf8");

class Element {
  constructor(){
    this.children=[];this.dataset={};this.parentElement=null;
    const values=new Map(), classes=new Set();
    this.style={setProperty:(k,v)=>values.set(k,v),getPropertyValue:k=>values.get(k)||"",
      removeProperty:k=>{values.delete(k);delete this.style[k];}};
    this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};
  }
  get firstChild(){return this.children[0]||null;}
  appendChild(el){el.remove();this.children.push(el);el.parentElement=this;return el;}
  replaceChildren(...els){this.children.forEach(el=>el.parentElement=null);this.children=[];els.forEach(el=>this.appendChild(el));}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(el=>el!==this);this.parentElement=null;}
}

function setup({nested=false}={}){
  const root=new Element(), matrix=new Element(), body=new Element(), content=new Element();
  const documentEvents={}, windowEvents={}, mediaEvents={}, timers=new Map(), frames=new Map(), images=[];
  let id=0,time=0;
  const documentScroll={scrollTop:0,scrollHeight:1800,clientHeight:1000};
  const innerScroll=Object.assign(new Element(),{scrollTop:0,scrollHeight:1400,clientHeight:600,overflowY:"auto"});
  innerScroll.parentElement=body;content.parentElement=nested?innerScroll:body;
  const reduced={matches:false,addEventListener:(_,fn)=>mediaEvents.reduced=fn};
  const mobile={matches:false,addEventListener:(_,fn)=>mediaEvents.mobile=fn};
  const document={body,documentElement:documentScroll,scrollingElement:documentScroll,hidden:false,
    getElementById:k=>k==="pfBackdrop"?root:matrix,querySelector:()=>content,
    createElement:()=>new Element(),addEventListener:(event,fn)=>documentEvents[event]=fn};
  const window={VX:{},matchMedia:q=>q.includes("reduce")?reduced:mobile,addEventListener:(event,fn)=>windowEvents[event]=fn};
  const context={document,window,URL,location:{href:"https://local.invalid/"},
    Image:class extends Element{constructor(){super();images.push(this);}},
    getComputedStyle:el=>({overflowY:el.overflowY||"visible"}),ResizeObserver:class{observe(){}},
    setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
  vm.runInNewContext(source,context);
  return {matrix,document,images,reduced,mobile,documentEvents,windowEvents,mediaEvents,frames,
    scroll:nested?innerScroll:documentScroll,
    set:items=>window.VX.portfolioBackground.setMaterials(items,m=>`https://assets.invalid/${m.id}.jpg?cacheNonce=${m.cover_version}`),
    covers:()=>matrix.children.flatMap(c=>c.children),
    flush(){for(let i=0;frames.size && i<600;i++){time+=16;const next=[...frames.values()];frames.clear();next.forEach(fn=>fn(time));}assert.equal(frames.size,0,"A animação deve terminar");}
  };
}
const material=(id,version="v1")=>({id,cover_version:version,is_public:true,num_pages:2});

test("novas capas preservam os espaços das existentes sem duplicar nem inserir privados",()=>{
  const s=setup(), originals=[material("a"),material("b")];s.set(originals);
  const before=s.covers().map(el=>({el,parent:el.parentElement,row:el.style.getPropertyValue("--cover-row")}));
  s.set([...originals,...Array.from({length:20},(_,i)=>material("novo"+i)),{...material("privado"),is_public:false},{...material("vazio"),num_pages:0},originals[0]]);
  assert.equal(s.covers().length,22);
  before.forEach(({el,parent,row})=>{assert.equal(el.parentElement,parent);assert.equal(el.style.getPropertyValue("--cover-row"),row);});
  s.set([originals[1]]);assert.equal(s.covers().length,1);assert.equal(s.covers()[0],before.find(x=>x.el.dataset.materialId==="b").el);
});

test("substitui a capa somente pela resposta da versão mais recente",()=>{
  const s=setup();s.set([material("a")]);s.images[0].onload();
  s.set([material("a","v2")]);const stale=s.images[1].onload;
  s.set([material("a","v3")]);stale();
  assert.equal(s.covers()[0].firstChild,s.images[0],"Mantém a imagem até a nova carregar");
  s.images[2].onload();assert.equal(s.covers()[0].firstChild,s.images[2]);
  s.set([material("a","v3")]);assert.equal(s.images.length,3,"Sem downloads em consultas inalteradas");
});

test("falha deixa o espaço vazio e tenta novamente com outra chave de cache",()=>{
  const s=setup();s.set([material("a")]);s.images[0].onerror();
  assert.equal(s.covers()[0].firstChild,null);
  s.set([material("a")]);assert.notEqual(s.images[0].src,s.images[1].src);
  assert.equal(s.images[1].loading,"eager","O carregamento não depende de uma posição transformada visível");
  s.images[1].onload();assert.equal(s.covers()[0].classList.contains("is-loaded"),true);
});

test("o fim de uma página curta completa a perspectiva com colunas em sentidos opostos",()=>{
  const s=setup();s.scroll.scrollHeight=1100;s.scroll.scrollTop=100;s.documentEvents.scroll();s.flush();
  assert.match(s.matrix.style.transform,/translate3d\(0,0,0px\).*rotateY\(-8deg\)/);
  assert.ok(Math.abs(parseFloat(s.matrix.children[0].style.getPropertyValue("--column-y"))+55)<.001);
  assert.ok(parseFloat(s.matrix.children[1].style.getPropertyValue("--column-y"))>0);
});

test("acompanha o contêiner que realmente rola e reage à inversão",()=>{
  const s=setup({nested:true});s.scroll.scrollTop=800;s.documentEvents.scroll();s.flush();
  assert.match(s.matrix.style.transform,/rotateY\(-8deg\)/);
  s.scroll.scrollTop=0;s.documentEvents.scroll();s.flush();
  assert.match(s.matrix.style.transform,/rotateY\(-45deg\)/);
  assert.equal(parseFloat(s.matrix.children[0].style.getPropertyValue("--column-y")),0);
});

test("movimento reduzido e saída da página interrompem a animação",()=>{
  const s=setup();s.scroll.scrollTop=400;s.documentEvents.scroll();assert.ok(s.frames.size>0);
  s.reduced.matches=true;s.mediaEvents.reduced();assert.equal(s.frames.size,0);
  assert.equal(s.matrix.style.transform,undefined);
  s.reduced.matches=false;s.mediaEvents.reduced();s.scroll.scrollTop=600;s.documentEvents.scroll();
  s.windowEvents.pagehide();assert.equal(s.frames.size,0);
});
