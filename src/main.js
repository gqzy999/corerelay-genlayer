import {TransactionJournal, permissions, validatePolicy, userError, isAddress} from './workflow.js';
import deployment from './deployment.json';
import './style.css';
const $=id=>document.getElementById(id);
let client, reader, account, curator, record={}, loaded=null, busy=false;
const journal=new TransactionJournal(localStorage);
const sdk=()=>Promise.all([import('genlayer-js'),import('genlayer-js/chains')]);
async function readClient(){if(!reader){const [{createClient},{studionet}]=await sdk();reader=createClient({chain:studionet});}return reader;}
function settings(){try{return JSON.parse(localStorage.getItem('corerelay-settings'))||{};}catch{return {};}}
document.querySelector('#app').innerHTML=`
<aside><a class="brand" href="#">◒ <b>CoreRelay</b></a><div class="aside-label">RESEARCH OPERATIONS</div><a class="active" href="#desk">◈ &nbsp; Sample desk</a><a href="#policy">≋ &nbsp; Policy sources</a><div class="aside-bottom">A smaller footprint.<br>A clearer chain of care.<span>POWERED BY GENLAYER</span></div></aside>
<main><header><span>WORKSPACE <b>/ Sample stewardship</b></span><button id="connect">Connect wallet ↗</button></header>
<section class="hero"><div><span class="eyebrow">FROM REPOSITORY TO RESEARCH</span><h1>Every sample.<br>Within its scope.</h1><p>Check a research plan against published sample policies.<br>Keep the evidence, curator decision, and return in one record.</p><a href="#desk" class="textlink">Start a scope check ↓</a> <button type="button" id="verified" class="subtle">Read finalized example ↗</button></div><div class="core-art" aria-label="Illustrated geological core layers"><div class="core"><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="art-label">01 — PRESERVE THE RECORD</span><div class="measure">│<br>│<br>│<br>│<br>│</div></div></section>
<div class="ribbon"><span><b>01</b> Register intent</span><span><b>02</b> Assess four gates</span><span><b>03</b> Curator decision</span><span><b>04</b> Close the loop</span></div>
<section id="desk"><div class="section-title"><div><span class="eyebrow">SAMPLE DESK</span><h2>A plan before a procedure.</h2></div><span class="pill" id="network">Studionet · 61999</span></div>
<div class="desk-grid"><form id="request"><div class="panel-title"><h3>Research request</h3><button type="button" id="example" class="subtle">Load example</button></div><label>Deployed contract address<input id="address" placeholder="0x…" required pattern="0x[a-fA-F0-9]{40}"></label><div class="two"><label>Request ID<input id="key" maxlength="64" required placeholder="CR-2026-001"></label><label>Sample reference<input id="sample" maxlength="200" required placeholder="Expedition / core / interval"></label></div><label>Official policy URL<input type="url" id="source" required value="https://www.iodp.org/resources/access-data-and-samples"></label><label>Research plan<textarea id="plan" maxlength="4000" required rows="6" placeholder="Describe purpose, method, destructive amount, onward transfer, and residue/reporting plan."></textarea></label><div class="actions"><button type="submit">Register request ↗</button><button type="button" id="read" class="secondary">Read record</button></div><p class="fine">Public records: use sample references, never personal or confidential research data.</p></form>
<div class="panel results"><div class="panel-title"><h3>Scope record</h3><span class="pill" id="state">Not loaded</span></div><p id="record-label" class="fine"></p><div class="gates" id="gates"><p class="empty">A clear trail starts with a request.<br><small>Register or read a request to see its policy gates.</small></p></div><div class="actions"><button id="assess" disabled>Assess policy</button><button id="export" disabled class="secondary">Export JSON ↓</button></div><details id="record-details"><summary>Registered plan & history</summary><div id="history"></div></details><details><summary>Curator controls</summary><p class="fine">Only the deployment curator can authorize or close a request. A scope check never grants institutional permission.</p><label for="note">Decision or return evidence</label><textarea id="note" maxlength="1000" placeholder="Decision rationale or return/report evidence reference"></textarea><div class="actions"><button id="approve" disabled class="secondary">Authorize</button><button id="decline" disabled class="secondary">Decline</button><button id="close" disabled class="secondary">Close</button></div></details><div class="tx"><b id="tx-title">Ready</b><p id="status" role="status" aria-live="polite">No transaction submitted.</p><a id="txlink" target="_blank" rel="noreferrer" hidden>View transaction ↗</a><button id="resume" class="subtle" hidden>Resume tracking</button></div></div></div></section>
<section id="policy" class="policy"><div><span class="eyebrow">EVIDENCE, NOT ASSUMPTIONS</span><h2>Four questions.<br>One accountable record.</h2><p>Public expedition policies provide context. A curator still makes the sample-specific decision.</p><a href="https://www.iodp.org/resources/access-data-and-samples" target="_blank" rel="noreferrer">Explore IODP sample policies ↗</a></div><ol><li><b>Purpose</b><span>Does the intended study match the permitted scope?</span></li><li><b>Destructive analysis</b><span>Is consumption explicitly covered or awaiting approval?</span></li><li><b>Onward transfer</b><span>Can material move to another researcher or lab?</span></li><li><b>Return & reporting</b><span>What happens to residues and research outputs?</span></li></ol></section><footer>CoreRelay <span><a href="https://github.com/gqzy999/corerelay-genlayer" target="_blank" rel="noreferrer">Source</a> · <a href="https://explorer-studio.genlayer.com/tx/0xef2f9cedd21fcd0bf1fbe522932e7c6b95a62cc3ec476b6fe3e9835bc4235a34" target="_blank" rel="noreferrer">Deployment</a> · Independent research workflow · No IODP affiliation · <span id="deployment-label">No deployment configured</span></span></footer></main>`;
$('address').value=settings().address||deployment.contractAddress||'';
if(deployment.contractAddress)$('deployment-label').textContent='Test deployment · Studionet';
if($('address').value.toLowerCase()===deployment.contractAddress?.toLowerCase())$('key').value=deployment.exampleRequest||'';
function status(title,msg){$('tx-title').textContent=title;$('status').textContent=msg;}
function current(){return {a:$('address').value.trim(),k:$('key').value.trim()};}
function config(){const {a,k}=current();if(!isAddress(a))throw Error('Enter a deployed contract address.');if(!k||k.length>64)throw Error('Enter a request ID (1–64 characters).');try{localStorage.setItem('corerelay-settings',JSON.stringify({address:a}));}catch{}return {a,k};}
function updateActions(){const p=permissions(record,account,curator,current(),loaded);$('assess').disabled=!p.assess;$('approve').disabled=!p.decide;$('decline').disabled=!p.decide;$('close').disabled=!p.close;}
function render(){
  $('state').textContent=record.state||'Not found';
  $('record-label').textContent=record.state?`${loaded.k} · ${record.sample}`:'No request found at this contract and ID.';
  const gates=$('gates');gates.replaceChildren();
  for(const name of ['purpose','destructive','transfer','return']){
    const data=record.assessment?.[name],div=document.createElement('div');div.className='gate';
    const title=document.createElement('b');title.textContent=name==='return'?'Return & reporting':name[0].toUpperCase()+name.slice(1);
    const state=document.createElement('span');state.className='gate-status '+(['ALLOW','DENY','REVIEW'].includes(data?.status)?data.status:'');state.textContent=data?.status||'Awaiting assessment';
    const q=document.createElement('p');q.textContent=data?.quote||'No policy evidence recorded.';div.append(title,state,q);gates.append(div);
  }
  const hash=document.createElement('small');hash.className='hash';hash.textContent=record.policy_hash?'Policy SHA-256: '+record.policy_hash:'Policy not yet assessed';gates.append(hash);
  const history=$('history');history.replaceChildren();
  if(record.state){
    const plan=document.createElement('p');plan.textContent=record.plan;history.append(plan);
    const source=document.createElement('a');source.textContent='Read the registered policy ↗';source.target='_blank';source.rel='noreferrer';
    try{source.href=validatePolicy(record.source_url);history.append(source);}catch{}
    for(const event of record.history||[]){const row=document.createElement('p');row.className='history-row';row.textContent=[event.state,event.actor,event.note].filter(Boolean).join(' · ');history.append(row);}
  }
  $('export').disabled=!record.state;updateActions();
}
async function read(){
  const ctx=config(),c=await readClient();
  const [data,operator]=await Promise.all([c.readContract({address:ctx.a,functionName:'get_request',args:[ctx.k]}),c.readContract({address:ctx.a,functionName:'get_curator',args:[]})]);
  const parsed=typeof data==='string'?JSON.parse(data):data;
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Unexpected contract response. Check the contract address.');
  record=parsed;curator=operator;loaded=ctx;render();$('deployment-label').textContent='Contract read on Studionet';
}
async function connect(){
  if(!window.ethereum)throw Error('Install or open an EIP-1193 wallet.');
  const addresses=await window.ethereum.request({method:'eth_requestAccounts'});if(!addresses?.[0])throw Error('No wallet account selected.');
  const [{createClient},{studionet}]=await sdk();
  const candidate=createClient({chain:studionet,account:addresses[0],provider:window.ethereum});await candidate.connect('studionet');
  account=addresses[0];client=candidate;$('connect').textContent=account.slice(0,6)+'…'+account.slice(-4);updateActions();
}
async function track(p){
  if(!p)throw Error('No saved transaction to track.');
  status('Tracking transaction','Waiting for finalized execution. A timeout preserves this transaction for later tracking.');
  $('txlink').href='https://explorer-studio.genlayer.com/tx/'+p.hash;$('txlink').hidden=false;$('resume').hidden=false;
  const c=await readClient();
  const receipt=await c.waitForTransactionReceipt({hash:p.hash,status:'FINALIZED',retries:60,interval:3000});
  const result=journal.finish(receipt);
  if(result.kind==='unresolved'){status('Execution needs inspection',`Status: ${result.state||'unknown'}; execution: ${result.execution||'unknown'}. The saved hash remains locked for tracking.`);return;}
  $('resume').hidden=true;
  status(result.kind==='success'?'Finalized':'Finalized with failure',result.kind==='success'?'Contract execution completed.':'The contract did not complete successfully. Inspect the transaction and correct the request before submitting again.');
  if(current().a.toLowerCase()===p.address.toLowerCase()&&current().k===p.key){try{await read();}catch(e){status('Receipt saved; readback unavailable',`${result.kind}. ${userError(e)} Use Read record to refresh.`);}}
}
async function write(method,args){
  journal.ensureWritable();if(!client)await connect();
  const {a,k}=config(),actual=await window.ethereum.request({method:'eth_chainId'}),addresses=await window.ethereum.request({method:'eth_accounts'});
  if(Number(actual)!==61999)throw Error('Switch wallet to Studionet (61999).');
  if(addresses[0]?.toLowerCase()!==account?.toLowerCase()){client=undefined;throw Error('Wallet account changed. Reconnect before submitting.');}
  if(method!=='register'){
    const allowed=permissions(record,account,curator,current(),loaded);
    if(!(method==='assess'?allowed.assess:method==='decide'?allowed.decide:allowed.close))throw Error('Read this request and connect the authorized account before this action.');
    if(method!=='assess'&&(!args.at(-1)?.trim()||args.at(-1).length>1000))throw Error('Enter a decision or return evidence note (1–1000 characters).');
  }
  status('Awaiting signature','Confirm the operation in your wallet.');
  const hash=await client.writeContract({address:a,functionName:method,args:[k,...args],value:0n});
  const p={hash,address:a,key:k,method};
  if(!journal.remember(p)){status('Transaction submitted — save this hash',`${hash}. Browser storage failed; keep this page open and copy the hash before continuing.`);$('txlink').href='https://explorer-studio.genlayer.com/tx/'+hash;$('txlink').hidden=false;$('resume').hidden=false;return;}
  await track(p);
}
async function guard(fn){
  if(busy)return;busy=true;document.body.classList.add('busy');document.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);
  try{await fn();}catch(e){let p;try{p=journal.pending();}catch{}status(p?'Tracking paused':'Action stopped',userError(e));$('resume').hidden=!p;}
  finally{busy=false;document.body.classList.remove('busy');document.querySelectorAll('input,textarea').forEach(el=>el.disabled=false);updateActions();}
}
$('verified').onclick=()=>guard(async()=>{$('address').value=deployment.contractAddress;$('key').value=deployment.exampleRequest;await read();$('desk').scrollIntoView({behavior:'smooth'});status('Finalized example loaded','This record was read from Studionet. No wallet or transaction required.');});
$('connect').onclick=()=>guard(connect);$('read').onclick=()=>guard(read);
$('request').onsubmit=e=>{e.preventDefault();guard(async()=>{const source=validatePolicy($('source').value);const sample=$('sample').value.trim(),plan=$('plan').value.trim();if(!sample||!plan)throw Error('Enter a sample reference and research plan.');await write('register',[sample,source,plan]);});};
$('assess').onclick=()=>guard(()=>write('assess',[]));$('approve').onclick=()=>guard(()=>write('decide',[true,$('note').value]));$('decline').onclick=()=>guard(()=>write('decide',[false,$('note').value]));$('close').onclick=()=>guard(()=>write('close',[$('note').value]));$('resume').onclick=()=>guard(()=>track(journal.pending()));
$('example').onclick=()=>{$('key').value='CR-'+Date.now();$('sample').value='Illustrative sediment sample — no allocation claimed';$('plan').value='Measure mineral composition using non-destructive X-ray scanning. No grinding or sample consumption. No onward transfer to another laboratory. Return all material and submit results to the repository. Sample-specific allocation approval has not yet been obtained.';updateActions();status('Example loaded','Illustrative input only. No assessment or chain transaction has occurred.');};
$('address').addEventListener('input',updateActions);$('key').addEventListener('input',updateActions);
$('export').onclick=()=>{const {a,k}=loaded;const blob=new Blob([JSON.stringify({contract:a,request_id:k,network:61999,record},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='corerelay-'+k.replace(/[^\w-]/g,'_')+'.json';link.click();URL.revokeObjectURL(url);};
try{const p=journal.pending();if(p){$('address').value=p.address;$('key').value=p.key;$('resume').hidden=false;status('Pending transaction saved','Resume tracking before sending another operation.');}}catch(e){status('Saved transaction needs inspection',userError(e));}
for(const event of ['accountsChanged','chainChanged'])window.ethereum?.on?.(event,()=>{client=undefined;account=undefined;$('connect').textContent='Reconnect wallet';updateActions();});
