import assert from "node:assert/strict";
import {test} from "node:test";
import {build} from "esbuild";

const {outputFiles} = await build({entryPoints:["src/lib/storage/index.ts"],bundle:true,format:"cjs",write:false});
const key = "qah:project:p:decisions:decisions.json";
function open(data, workspace) {
  const module={exports:{}};
  const locks={request:(_,action)=>action()};
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  new Function("module","localStorage","window","indexedDB","navigator","globalThis",outputFiles[0].text)(module,storage,{showDirectoryPicker:async()=>workspace},undefined,{locks},{navigator:{locks}});
  return module.exports;
}
function entry(id) {
  return {id:("00000000-0000-4000-8000-"+String(id).padStart(12,"0")),timestamp:"2025-01-01T00:00:00Z",context:"test",question:"?",selected:"yes",options:["yes"],rationale:"",rejectedRationale:[],locked:false,aiAssisted:false,extra:{source:"legacy"}};
}
for(const format of ["array","string"])test("append and reload "+format,async()=>{
  const first=entry(1),raw=JSON.stringify([first]);
  const data=new Map([[key,format==="array"?raw:JSON.stringify(raw)]]);
  const api=open(data);
  assert.deepEqual(await api.readDecisions("p"),[first]);
  for(const id of [2,3,3]) await api.appendDecision("p",entry(id));
  for(const reader of [api,open(data)])assert.deepEqual(await reader.readDecisions("p"),[1,2,3].map(entry));
  assert.deepEqual(await api.readDecisions("other"),[]);
  assert.deepEqual(JSON.parse(await api.readFile("p","decisions","decisions.json")),[1,2,3].map(entry));
});
test("invalid input is reported and original bytes survive",async()=>{
  for(const raw of ["","bad","null","{}",JSON.stringify("bad"),JSON.stringify([entry(1),{}])]){
    const data=new Map([[key,raw]]),api=open(data);
    await assert.rejects(api.readDecisions("p"),/decision log/i);
    await assert.rejects(api.appendDecision("p",entry(2)),/decision log/i);
    assert.equal(data.get(key),raw);
  }
});
test("reconnect reconciles workspace and offline writes, rejects damaged or conflicting copies", async()=>{
  let disk=JSON.stringify([entry(1),entry(2)]);
  const dir={getDirectoryHandle:async()=>dir,getFileHandle:async()=>({
    getFile:async()=>({text:async()=>disk}),
    createWritable:async()=>({write:async text=>{disk=text},close:async()=>{}})
  })};
  const data=new Map([[key,JSON.stringify([entry(1)])]]);
  const local=open(data);
  await local.appendDecision("p",entry(3));
  const connected=open(data,dir);
  await connected.selectWorkspaceDirectory();
  assert.deepEqual(await connected.readDecisions("p"),[1,3,2].map(entry));
  await connected.appendDecision("p",entry(4));
  await connected.appendDecision("p",entry(4));
  assert.deepEqual(JSON.parse(disk),[1,3,2,4].map(entry));
  assert.deepEqual(await open(data).readDecisions("p"),JSON.parse(disk));
  const original=data.get(key);
  for(const bad of ["bad",JSON.stringify([{...entry(1),context:"conflict"}])]){
    disk=bad;
    await assert.rejects(connected.appendDecision("p",entry(5)));
    assert.equal(disk,bad);assert.equal(data.get(key),original);
  }
});
