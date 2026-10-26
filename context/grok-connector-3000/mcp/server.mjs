#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const VERSION = '0.4.1';
const MODEL = process.env.GROK_MODEL || 'grok-4.7';
const XAI_URL = 'https://api.x.ai/v1/responses';
const NOVA_MCP_URL = process.env.NOVA_MCP_URL || '';
const NOVA_MCP_TOKEN = process.env.NOVA_MCP_TOKEN || '';
let novaSessionId = null;
let negotiatedProtocol = '2025-06-18';

function send(id, result) { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n'); }
function error(id, code, message, data) { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message,...(data?{data}:{})}})+'\n'); }
function projectRoot(){const root=process.env.NOVA_PROJECT_ROOT;if(!root)throw new Error('NOVA_PROJECT_ROOT is not configured.');return path.resolve(root);}
function safeProjectPath(relative){const root=projectRoot();const target=path.resolve(root,relative);if(target!==root&&!target.startsWith(root+path.sep))throw new Error(`Path escapes NOVA_PROJECT_ROOT: ${relative}`);return target;}
async function readProjectFile(relative){const target=safeProjectPath(relative);const stat=await fs.stat(target);if(!stat.isFile())throw new Error(`Not a file: ${relative}`);if(stat.size>250_000)throw new Error(`File too large: ${relative}`);return fs.readFile(target,'utf8');}
function extractText(data){if(typeof data.output_text==='string')return data.output_text;const chunks=[];for(const item of data.output??[])for(const content of item.content??[])if(typeof content.text==='string')chunks.push(content.text);return chunks.join('\n').trim();}
async function callGrok(prompt,system,model){const key=process.env.XAI_API_KEY;if(!key)throw new Error('XAI_API_KEY is not configured.');const input=system?[{role:'system',content:system},{role:'user',content:prompt}]:prompt;const response=await fetch(XAI_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:model||MODEL,input})});const body=await response.text();if(!response.ok)throw new Error(`xAI API ${response.status}: ${body.slice(0,2000)}`);const data=JSON.parse(body);return{model:data.model||model||MODEL,response_id:data.id||null,text:extractText(data),raw_usage:data.usage||null};}
async function novaMcpCall(method,params={}){
 if(!NOVA_MCP_URL)throw new Error('NOVA_MCP_URL is not configured. Set it to the existing canonical Nova Streamable-HTTP MCP endpoint.');
 const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':negotiatedProtocol};
 if(NOVA_MCP_TOKEN)headers.Authorization=`Bearer ${NOVA_MCP_TOKEN}`;
 if(novaSessionId)headers['MCP-Session-Id']=novaSessionId;
 const id=Date.now();
 const response=await fetch(NOVA_MCP_URL,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
 const sid=response.headers.get('MCP-Session-Id');if(sid)novaSessionId=sid;
 const protocol=response.headers.get('MCP-Protocol-Version');if(protocol)negotiatedProtocol=protocol;
 const body=await response.text();
 if(response.status===202)return JSON.stringify({http_status:202,session_id:novaSessionId,protocol_version:negotiatedProtocol,accepted:true,body:body.slice(0,1000)});
 if(!response.ok)throw new Error(`Nova MCP ${response.status}: ${body.slice(0,2000)}`);
 if(!body.trim())return JSON.stringify({http_status:response.status,session_id:novaSessionId,protocol_version:negotiatedProtocol,body:'<empty response>'});
 // Streamable HTTP servers may return either JSON or an SSE event stream.
 if(body.includes('data:')){const dataLines=body.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).filter(Boolean);return dataLines.length?dataLines.join('\n'):body;}
 return body;
}
const tools=[
{name:'grok_ask',description:'Send a focused prompt to Grok through xAI Responses API.',inputSchema:{type:'object',properties:{prompt:{type:'string'},system:{type:'string'},model:{type:'string'}},required:['prompt']}},
{name:'grok_project_review',description:'Read selected local project files and ask Grok for an independent read-only review.',inputSchema:{type:'object',properties:{task:{type:'string'},files:{type:'array',items:{type:'string'}},project_state:{type:'string'},model:{type:'string'}},required:['task','files']}},
{name:'project_read_state',description:'Read PROJECT_CONTEXT.md from the shared Nova project.',inputSchema:{type:'object',properties:{}}},
{name:'project_write_handoff',description:'Write only a Grok handoff markdown artifact into the shared project root.',inputSchema:{type:'object',properties:{content:{type:'string'},filename:{type:'string'}},required:['content']}},
{name:'nova_mcp_probe',description:'Initialize and probe the existing canonical Nova Streamable-HTTP MCP endpoint. Does not create a server or write project files.',inputSchema:{type:'object',properties:{method:{type:'string',description:'Use initialize to establish a session or tools/list to inspect available tools.'}},required:['method']}}
];
async function handleTool(name,args){
 if(name==='grok_ask')return{content:[{type:'text',text:JSON.stringify({provenance:'grok-via-xai-api',...(await callGrok(args.prompt,args.system,args.model))},null,2)}]};
 if(name==='project_read_state')return{content:[{type:'text',text:await readProjectFile('PROJECT_CONTEXT.md')}]};
 if(name==='project_write_handoff'){const filename=args.filename||'MODEL_HANDOFF_GROK.md';if(!/^[A-Za-z0-9._-]+\.md$/.test(filename))throw new Error('Invalid handoff filename.');await fs.writeFile(safeProjectPath(filename),args.content,'utf8');return{content:[{type:'text',text:`Wrote shared handoff: ${filename}`}]};}
 if(name==='grok_project_review'){const files={};for(const relative of args.files||[])files[relative]=await readProjectFile(relative);const bundle=Object.entries(files).map(([p,c])=>`\n===== FILE: ${p} =====\n${c}\n===== END FILE =====`).join('\n');const prompt=`You are the independent Grok peer for Nova–Ygdrassil.\nTASK:\n${args.task}\nPROJECT STATE:\n${args.project_state||'(not supplied)'}\nPROJECT FILES:${bundle}\nReturn: VERIFIED; IMPLEMENTED; DOCUMENTED BUT UNVERIFIED; MISSING; SECURITY RISKS; RECOMMENDED NEXT STEP; REQUIRED TESTS. Never claim changes were applied.`;return{content:[{type:'text',text:JSON.stringify({provenance:'grok-project-review-via-xai-api',files_reviewed:Object.keys(files),...(await callGrok(prompt,'Act as an independent adversarial engineering peer. Read-only review; proposals only.',args.model))},null,2)}]};}
 if(name==='nova_mcp_probe'){const method=args.method||'initialize';const params=method==='initialize'?{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'grok-connector-3000',version:VERSION}}:{};return{content:[{type:'text',text:await novaMcpCall(method,params)}]};}
 throw new Error(`Unknown tool: ${name}`);
}
let buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',async chunk=>{buffer+=chunk;let idx;while((idx=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,idx).trim();buffer=buffer.slice(idx+1);if(!line)continue;let msg;try{msg=JSON.parse(line)}catch{continue;}if(msg.method==='initialize'){negotiatedProtocol=msg.params?.protocolVersion||'2025-06-18';send(msg.id,{protocolVersion:negotiatedProtocol,capabilities:{tools:{}},serverInfo:{name:'grok_connector_3000',version:VERSION}});}else if(msg.method==='notifications/initialized'){}else if(msg.method==='ping')send(msg.id,{});else if(msg.method==='tools/list')send(msg.id,{tools});else if(msg.method==='tools/call'){try{send(msg.id,await handleTool(msg.params?.name,msg.params?.arguments||{}));}catch(e){error(msg.id,-32000,e?.message||String(e));}}else if(msg.id!==undefined)error(msg.id,-32601,`Method not found: ${msg.method}`);}});
