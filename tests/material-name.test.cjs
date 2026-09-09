/* Executar: node --test tests/material-name.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../common.js"),"utf8");

function setup(result){
  const calls=[];
  const query={
    update(value){calls.push(["update",value]);return this;},
    eq(column,value){calls.push(["eq",column,value]);return this;},
    select(columns){calls.push(["select",columns]);return this;},
    async single(){return result;}
  };
  const sb={from(table){calls.push(["from",table]);return query;}};
  const context={window:{VIVOX_CFG:{},supabase:{createClient:()=>sb}}};
  vm.runInNewContext(source,context);
  return {vx:context.window.VX,calls};
}

test("renomeia apenas o campo de exibição, preservando o identificador",async()=>{
  const saved={id:"MATERIAL_ORIGINAL",name:"Edição <2026> & marca"};
  const {vx,calls}=setup({data:saved,error:null});
  assert.equal(await vx.renameMockup(saved.id,"  Edição <2026>  & marca.pdf  "),saved);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[
    ["from","mockups"],["update",{name:saved.name}],
    ["eq","id",saved.id],["select","id,name"]
  ]);
  assert.equal(vx.esc(saved.name),"Edição &lt;2026&gt; &amp; marca");
});

test("nomes vazios e longos não chegam ao banco",async()=>{
  const {vx,calls}=setup({});
  for(const name of ["", " \n ", ".pdf", "a".repeat(121)]){
    await assert.rejects(vx.renameMockup("MATERIAL",name));
  }
  assert.equal(calls.length,0);
  assert.equal(vx.normalizeMaterialName("a".repeat(120)).length,120);
});

test("erro do banco não é tratado como sucesso",async()=>{
  const failure=new Error("Falha de rede");
  const {vx}=setup({data:null,error:failure});
  await assert.rejects(vx.renameMockup("MATERIAL","Nome"),failure);
});

test("exige confirmação da linha correta após a gravação",async()=>{
  for(const data of [null,{id:"OUTRO",name:"Nome"}]){
    const {vx}=setup({data,error:null});
    await assert.rejects(vx.renameMockup("MATERIAL","Nome"),/não foi encontrado/);
  }
});
