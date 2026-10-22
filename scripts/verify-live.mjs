// Read-only verification of the configured Studionet deployment.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {classifyReceipt} from '../src/workflow.js';
const root=new URL('../',import.meta.url);
const config=JSON.parse(await fs.readFile(new URL('src/deployment.json',root),'utf8'));
if(!config.contractAddress)throw Error('No deployment configured');
const client=createClient({chain:studionet});
const chain=Number(await client.request({method:'eth_chainId',params:[]}));
if(chain!==config.chainId)throw Error('Unexpected chain');
const [curator,raw,code,local]=await Promise.all([
  client.readContract({address:config.contractAddress,functionName:'get_curator',args:[]}),
  client.readContract({address:config.contractAddress,functionName:'get_request',args:[config.exampleRequest]}),
  client.getContractCode(config.contractAddress),
  fs.readFile(new URL('contracts/sample_scope.py',root),'utf8')
]);
if(code!==local)throw Error('Deployed source differs from the bundled source');
const record=JSON.parse(raw);
if(record.state!=='CLOSED')throw Error('The configured lifecycle example is not closed');
console.log(JSON.stringify({chain,address:config.contractAddress,curator,request:config.exampleRequest,state:record.state,history:record.history.map(e=>e.state),source_sha256:createHash('sha256').update(code).digest('hex')},null,2));
const evidence=JSON.parse(await fs.readFile(new URL('evidence/studionet.json',root),'utf8'));
for(const tx of evidence.transactions){
 const receipt=await client.getTransaction({hash:tx.hash});
 const result=classifyReceipt(receipt);
 console.log(`${tx.action}: ${result.state} / ${result.execution} / ${tx.hash}`);
 if(result.kind!=='success')throw Error(`${tx.action} is not finalized with verified successful execution`);
}
process.exit(0);
