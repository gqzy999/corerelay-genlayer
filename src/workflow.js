export const CHAIN_ID = 61999;
export const isAddress = value => /^0x[\da-f]{40}$/i.test(value || '');
export const isHash = value => /^0x[\da-f]{64}$/i.test(value || '');
const same = (a,b) => typeof a==='string' && typeof b==='string' && a.toLowerCase()===b.toLowerCase();
export function validatePolicy(value) {
  const url = new URL(value);
  const pages = ['https://www.iodp.org/resources/access-data-and-samples','https://iodp.tamu.edu/curation/policy.html','https://www.iodp.tamu.edu/curation/policy.html','https://www.iodp.tamu.edu/publications/obligations.html'];
  if (url.protocol!=='https:' || (!pages.includes(url.href) && url.hostname!=='publications.iodp.org') || url.username || url.password || url.port || url.href.length>500) throw Error('Use a supported official IODP policy page.');
  return url.href;
}
export function permissions(record, account, curator, current, loaded) {
  const matches = loaded && same(current?.a,loaded.a) && current?.k===loaded.k;
  const requester = matches && same(account,record.requester);
  const operator = matches && same(account,curator);
  return {assess:!!requester&&record.state==='REGISTERED',
    decide:!!operator&&['WITHIN_SCOPE','CURATOR_REVIEW'].includes(record.state),
    close:!!operator&&record.state==='AUTHORIZED'};
}
export function classifyReceipt(receipt) {
  const rawState=String(receipt?.statusName??receipt?.status??'').toUpperCase();
  // Legacy Studio SDK may return numeric status 7 for the FINALIZED state.
  // The explorer exposes the same receipt as FINALIZED; normalize before classifying execution.
  const state=rawState==='7'?'FINALIZED':rawState;
  const leader=receipt?.consensus_data?.leader_receipt;
  const receipts=Array.isArray(leader)?leader:[leader];
  const item=receipts.filter(r=>r && r.result?.payload!=='idle' && r.genvm_result?.error_code!=='CONSENSUS_VALIDATOR_QUORUM_REACHED').at(-1);
  let execution=String(receipt?.txExecutionResultName??receipt?.tx_execution_result??item?.execution_result??'').toUpperCase();
  // Legacy Studio exposes SUCCESS plus a decoded return payload, rather than the newer enum.
  if(execution==='SUCCESS' && item?.result?.status==='return')execution='FINISHED_WITH_RETURN';
  if(state==='FINALIZED'&&execution==='FINISHED_WITH_RETURN')return {kind:'success',state,execution};
  if(state==='FINALIZED'&&['FINISHED_WITH_ERROR','ROLLBACK','CONTRACT_ERROR','ERROR','INTERNAL_ERROR','FINISHED_WITH_ROLLBACK','VM_ERROR'].includes(execution))return {kind:'failure',state,execution};
  // Undetermined/rejected/canceled may be appealed or retried by the protocol. Keep the pointer.
  return {kind:'unresolved',state,execution};
}
export class TransactionJournal {
  constructor(storage) {this.storage=storage;this.memory=null;}
  pending() {
    if(this.memory)return this.memory;
    const raw=this.storage.getItem('corerelay-pending');
    if(!raw)return null;
    let data;
    try {data=JSON.parse(raw);}catch{throw Error('Saved transaction data is damaged. Preserve it and verify the transaction before submitting again.');}
    if(!isHash(data?.hash)||!isAddress(data?.address)||!data.key||data.network!==CHAIN_ID)throw Error('Saved transaction data needs inspection before another write.');
    return data;
  }
  ensureWritable() {
    if(this.pending())throw Error('Resume the existing transaction before submitting another operation.');
    try {this.storage.setItem('corerelay-storage-check','1');this.storage.removeItem('corerelay-storage-check');}
    catch{throw Error('Browser storage is unavailable. Enable it before submitting a transaction.');}
  }
  remember(data) {
    this.memory={...data,network:CHAIN_ID};
    try{this.storage.setItem('corerelay-pending',JSON.stringify(this.memory));return true;}
    catch{return false;}
  }
  finish(receipt) {
    const result=classifyReceipt(receipt);
    if(result.kind==='unresolved')return result;
    const p=this.pending();
    // Preserve the last terminal receipt before releasing the duplicate-submission guard.
    this.storage.setItem('corerelay-last-transaction',JSON.stringify({pending:p,result,receipt},(_,v)=>typeof v==='bigint'?v.toString():v));
    this.storage.removeItem('corerelay-pending');this.memory=null;
    return result;
  }
}
export function userError(error) {
  const code=error?.code??error?.cause?.code;
  if(code===4001||/user rejected|user denied/i.test(error?.message||''))return 'Wallet signature declined. No transaction hash was returned.';
  if(code===4902)return 'Studionet is not configured in this wallet. Add network 61999 and reconnect.';
  return error?.shortMessage||error?.message||String(error);
}
