import { build } from "esbuild";
import assert from "node:assert/strict";
import { test } from "node:test";
const {outputFiles} = await build({entryPoints:["src/lib/planner.ts"],bundle:true,format:"cjs",write:false});
function open(data) {
  const mod = {exports:{}};
  new Function("module","localStorage",outputFiles[0].text)(mod,{
    getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)
  });
  return mod.exports;
}
test("legacy tasks keep identity, metadata and manual completion across subtask edits",()=>{
  const old={id:"old",title:"Edit",notes:"assembly",dueDate:"2026-11-20",status:"doing",createdAt:"a",updatedAt:"b"};
  const data=new Map([["qah:planner",JSON.stringify([old])]]);
  const api=open(data);
  const task=()=>open(data).listPlannerItems()[0];
  const change=c=>api.changeSubtask("old",c);
  assert.equal(api.subtaskPercent(task()),undefined);
  for(const title of ["A","B","C"])change({kind:"add",title});
  const ids=task().subtasks.map(c=>c.id);
  assert.equal(new Set(ids).size,3);
  change({kind:"rename",id:ids[0],title:"Revised"});
  assert.equal(task().subtasks[0].title,"Revised");
  change({kind:"check",id:ids[0],done:true});
  assert.equal(api.subtaskPercent(task()),33);
  for(const id of ids.slice(1))change({kind:"check",id,done:true});
  assert.equal(api.subtaskPercent(task()),100);
  for(const key of ["id","title","notes","dueDate","status","createdAt"])assert.equal(task()[key],old[key]);
  api.updatePlannerItem("old",{status:"done"});
  change({kind:"check",id:ids[0],done:false});
  for(const id of ids)change({kind:"remove",id});
  assert.equal(api.subtaskPercent(task()),undefined);
  assert.equal(task().status,"done");
});
test("subtask mutations target only the requested scope and reject invalid edits",()=>{
  const data=new Map(); const api=open(data);
  const parent=api.createPlannerItem({title:"A"},"a");
  const raw=data.get("qah:planner:project:a");
  for(const scope of ["b",undefined])assert.throws(()=>api.changeSubtask(parent.id,{kind:"add",title:"wrong"},scope));
  assert.throws(()=>api.changeSubtask(parent.id,{kind:"add",title:" "},"a"));
  assert.equal(data.get("qah:planner:project:a"),raw);
  api.changeSubtask(parent.id,{kind:"add",title:"local"},"a");
  assert.equal(api.listPlannerItems("a")[0].subtasks.length,1);
  assert.deepEqual(api.listPlannerItems(),[]);
});
