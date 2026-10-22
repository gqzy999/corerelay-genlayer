import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TransactionJournal,classifyReceipt,permissions,validatePolicy,userError} from '../src/workflow.js';
const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),hash='0x'+'c'.repeat(64);
const pointer={hash,address:a,key:'sample-1',method:'register'};
const receipt=(status,execution)=>({statusName:status,txExecutionResultName:execution});
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('accepted does not imply finalized success',()=>assert.equal(classifyReceipt(receipt('ACCEPTED','FINISHED_WITH_RETURN')).kind,'unresolved'));
test('missing execution evidence stays unresolved',()=>assert.equal(classifyReceipt(receipt('FINALIZED',undefined)).kind,'unresolved'));
test('Studio receipt array execution is recognized',()=>assert.equal(classifyReceipt({status:'FINALIZED',consensus_data:{leader_receipt:[{execution_result:'FINISHED_WITH_RETURN'}]}}).kind,'success'));
test('legacy Studio numeric status 7 finalizes a completed return',()=>assert.equal(classifyReceipt({status:7,txExecutionResultName:'FINISHED_WITH_RETURN'}).kind,'success'));
test('finalized rollback releases pending and retains receipt',()=>{const s=storage(),j=new TransactionJournal(s);j.remember(pointer);assert.equal(j.finish(receipt('FINALIZED','ROLLBACK')).kind,'failure');assert.equal(j.pending(),null);assert.ok(s.getItem('corerelay-last-transaction'));});
test('reload resumes same hash and blocks another write',()=>{const s=storage();new TransactionJournal(s).remember(pointer);const j=new TransactionJournal(s);assert.equal(j.pending().hash,hash);assert.throws(()=>j.ensureWritable());});
test('timeout or unknown execution preserves pending',()=>{const j=new TransactionJournal(storage());j.remember(pointer);j.finish(receipt('FINALIZED','UNKNOWN'));assert.equal(j.pending().hash,hash);});
test('success saves receipt then clears guard',()=>{const j=new TransactionJournal(storage());j.remember(pointer);assert.equal(j.finish(receipt('FINALIZED','FINISHED_WITH_RETURN')).kind,'success');assert.doesNotThrow(()=>j.ensureWritable());});
test('damaged pointer blocks writes rather than losing identity',()=>{const s=storage();s.setItem('corerelay-pending','{');assert.throws(()=>new TransactionJournal(s).ensureWritable(),/damaged/);});
test('storage unavailable blocks submission',()=>{const s=storage();s.setItem=()=>{throw Error('quota');};assert.throws(()=>new TransactionJournal(s).ensureWritable(),/storage/);});
test('post-submit storage failure still retains hash in memory',()=>{const s=storage(),j=new TransactionJournal(s);s.setItem=()=>{throw Error('quota');};assert.equal(j.remember(pointer),false);assert.equal(j.pending().hash,hash);});
test('failed receipt persistence never releases pending guard',()=>{const s=storage(),j=new TransactionJournal(s);j.remember(pointer);s.setItem=()=>{throw Error('quota');};assert.throws(()=>j.finish(receipt('FINALIZED','FINISHED_WITH_RETURN')));assert.equal(j.pending().hash,hash);});
test('unknown network pointer blocks writes',()=>{const s=storage();s.setItem('corerelay-pending',JSON.stringify({...pointer,network:1}));assert.throws(()=>new TransactionJournal(s).ensureWritable());});
test('requester may assess, unrelated account may not',()=>{const r={state:'REGISTERED',requester:a};const ctx={a,key:'unused',k:'x'};assert.equal(permissions(r,a,b,ctx,ctx).assess,true);assert.equal(permissions(r,b,b,ctx,ctx).assess,false);});
test('editing request or address invalidates role actions',()=>{const ctx={a,k:'x'};assert.equal(permissions({state:'AUTHORIZED'},a,a,{a:b,k:'x'},ctx).close,false);assert.equal(permissions({state:'AUTHORIZED'},a,a,{a,k:'y'},ctx).close,false);});
test('only curator can authorize and cannot override BLOCKED',()=>{const ctx={a,k:'x'};assert.equal(permissions({state:'CURATOR_REVIEW'},a,a,ctx,ctx).decide,true);assert.equal(permissions({state:'BLOCKED'},a,a,ctx,ctx).decide,false);});
test('policy URL rejects spoofed domains and credentials',()=>{for(const u of ['http://publications.iodp.org/x','https://publications.iodp.org.evil/x','https://evil@publications.iodp.org/x','https://publications.iodp.org:4430/x'])assert.throws(()=>validatePolicy(u));});
test('valid expedition URL accepted',()=>assert.equal(validatePolicy('https://publications.iodp.org/a'),'https://publications.iodp.org/a'));
test('wallet rejection explained',()=>assert.match(userError({code:4001}),/declined/));

test('live Studio SUCCESS requires a decoded return payload',()=>{
  const tx={statusName:'FINALIZED',consensus_data:{leader_receipt:[{execution_result:'SUCCESS',result:{status:'return'}}]}};
  assert.equal(classifyReceipt(tx).kind,'success');
  tx.consensus_data.leader_receipt.push({execution_result:'ERROR',result:{status:'contract_error',payload:'idle'},genvm_result:{error_code:'CONSENSUS_VALIDATOR_QUORUM_REACHED'}});
  assert.equal(classifyReceipt(tx).kind,'success');
  tx.consensus_data.leader_receipt[0].result={status:'error'};
  assert.equal(classifyReceipt(tx).kind,'unresolved');
});
