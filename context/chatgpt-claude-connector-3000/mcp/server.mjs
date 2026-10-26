#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const VERSION = '1.0.0';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const NOVA_MCP_URL = process.env.NOVA_MCP_URL || '';
const NOVA_MCP_TOKEN = process.env.NOVA_MCP_TOKEN || '';
let novaSessionId = null;
let negotiatedProtocol = '2025-06-18';

function send(id, result) { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n'); }
function error(id, code, message, data) { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message,...(data?{data}:{})}})+'\n'); }
function projectRoot(){const root=process.env.NOVA_PROJECT_ROOT;if(!root)throw new Error('NOVA_PROJECT_ROOT is not configured.');return path.resolve(root);}
function safeProjectPath(relative){const root=projectRoot();const target=path.resolve(root,relative);if(target!==root&&!target.startsWith(root+path.sep))throw new Error(`Path escapes NOVA_PROJECT_ROOT: ${relative}`);return target;}
async function readProjectFile(relative){const target=safeProjectPath(relative);const stat=await fs.stat(target);if(!stat.isFile())throw new Error(`Not a file: ${relative}`);if(stat.size>250_000)throw new Error(`File too large: ${relative}`);return fs.readFile(target,'utf8');}

async function callClaude(prompt, system, model) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured.');
  const body = {
    model: model || CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  };
  if (system) body.system = system;
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Anthropic API ${response.status}: ${text.slice(0, 2000)}`);
  const data = JSON.parse(text);
  const contentText = data.content?.map(c => c.text || '').join('\n') || '';
  return { model: data.model || model || CLAUDE_MODEL, text: contentText, raw_usage: data.usage || null };
}

async function callOpenAI(prompt, system, model) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured.');
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || OPENAI_MODEL,
      messages
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${text.slice(0, 2000)}`);
  const data = JSON.parse(text);
  const contentText = data.choices?.[0]?.message?.content || '';
  return { model: data.model || model || OPENAI_MODEL, text: contentText, raw_usage: data.usage || null };
}

async function novaMcpCall(method, params={}){
 if(!NOVA_MCP_URL)throw new Error('NOVA_MCP_URL is not configured.');
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
 if(body.includes('data:')){const dataLines=body.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).filter(Boolean);return dataLines.length?dataLines.join('\n'):body;}
 return body;
}

const tools = [
  { name: 'claude_ask', description: 'Send a prompt to Anthropic Claude.', inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, system: { type: 'string' }, model: { type: 'string' } }, required: ['prompt'] } },
  { name: 'chatgpt_ask', description: 'Send a prompt to OpenAI ChatGPT.', inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, system: { type: 'string' }, model: { type: 'string' } }, required: ['prompt'] } },
  { name: 'claude_project_review', description: 'Read selected files and ask Claude for a read-only review.', inputSchema: { type: 'object', properties: { task: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, project_state: { type: 'string' }, model: { type: 'string' } }, required: ['task', 'files'] } },
  { name: 'chatgpt_project_review', description: 'Read selected files and ask ChatGPT for a read-only review.', inputSchema: { type: 'object', properties: { task: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, project_state: { type: 'string' }, model: { type: 'string' } }, required: ['task', 'files'] } },
  { name: 'project_read_state', description: 'Read PROJECT_CONTEXT.md from the shared Nova project.', inputSchema: { type: 'object', properties: {} } },
  { name: 'project_write_handoff', description: 'Write a Claude/ChatGPT handoff markdown artifact into the shared project root.', inputSchema: { type: 'object', properties: { content: { type: 'string' }, filename: { type: 'string' } }, required: ['content'] } },
  { name: 'nova_mcp_probe', description: 'Initialize and probe the existing canonical Nova Streamable-HTTP MCP endpoint.', inputSchema: { type: 'object', properties: { method: { type: 'string' } }, required: ['method'] } }
];

async function handleTool(name, args) {
  if (name === 'claude_ask') return { content: [{ type: 'text', text: JSON.stringify({ provenance: 'claude-via-anthropic-api', ...(await callClaude(args.prompt, args.system, args.model)) }, null, 2) }] };
  if (name === 'chatgpt_ask') return { content: [{ type: 'text', text: JSON.stringify({ provenance: 'chatgpt-via-openai-api', ...(await callOpenAI(args.prompt, args.system, args.model)) }, null, 2) }] };
  if (name === 'project_read_state') return { content: [{ type: 'text', text: await readProjectFile('PROJECT_CONTEXT.md') }] };
  if (name === 'project_write_handoff') {
    const filename = args.filename || 'MODEL_HANDOFF_CLAUDE_CHATGPT.md';
    if (!/^[A-Za-z0-9._-]+\.md$/.test(filename)) throw new Error('Invalid handoff filename.');
    await fs.writeFile(safeProjectPath(filename), args.content, 'utf8');
    return { content: [{ type: 'text', text: `Wrote shared handoff: ${filename}` }] };
  }
  if (name === 'claude_project_review') {
    const files = {}; for (const relative of args.files || []) files[relative] = await readProjectFile(relative);
    const bundle = Object.entries(files).map(([p, c]) => `\n===== FILE: ${p} =====\n${c}\n===== END FILE =====`).join('\n');
    const prompt = `You are the independent Claude peer for Nova–Ygdrassil.\nTASK:\n${args.task}\nPROJECT STATE:\n${args.project_state || '(not supplied)'}\nPROJECT FILES:${bundle}\nReturn: VERIFIED; IMPLEMENTED; DOCUMENTED BUT UNVERIFIED; MISSING; SECURITY RISKS; RECOMMENDED NEXT STEP; REQUIRED TESTS.`;
    return { content: [{ type: 'text', text: JSON.stringify({ provenance: 'claude-project-review', files_reviewed: Object.keys(files), ...(await callClaude(prompt, 'Act as an independent adversarial engineering peer. Read-only review.', args.model)) }, null, 2) }] };
  }
  if (name === 'chatgpt_project_review') {
    const files = {}; for (const relative of args.files || []) files[relative] = await readProjectFile(relative);
    const bundle = Object.entries(files).map(([p, c]) => `\n===== FILE: ${p} =====\n${c}\n===== END FILE =====`).join('\n');
    const prompt = `You are the independent ChatGPT peer for Nova–Ygdrassil.\nTASK:\n${args.task}\nPROJECT STATE:\n${args.project_state || '(not supplied)'}\nPROJECT FILES:${bundle}\nReturn: VERIFIED; IMPLEMENTED; DOCUMENTED BUT UNVERIFIED; MISSING; SECURITY RISKS; RECOMMENDED NEXT STEP; REQUIRED TESTS.`;
    return { content: [{ type: 'text', text: JSON.stringify({ provenance: 'chatgpt-project-review', files_reviewed: Object.keys(files), ...(await callOpenAI(prompt, 'Act as an independent adversarial engineering peer. Read-only review.', args.model)) }, null, 2) }] };
  }
  if (name === 'nova_mcp_probe') {
    const method = args.method || 'initialize';
    const params = method === 'initialize' ? { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'chatgpt-claude-connector-3000', version: VERSION } } : {};
    return { content: [{ type: 'text', text: await novaMcpCall(method, params) }] };
  }
  throw new Error(`Unknown tool: ${name}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async chunk => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === 'initialize') {
      negotiatedProtocol = msg.params?.protocolVersion || '2025-06-18';
      send(msg.id, { protocolVersion: negotiatedProtocol, capabilities: { tools: {} }, serverInfo: { name: 'chatgpt_claude_connector_3000', version: VERSION } });
    } else if (msg.method === 'notifications/initialized') {
    } else if (msg.method === 'ping') {
      send(msg.id, {});
    } else if (msg.method === 'tools/list') {
      send(msg.id, { tools });
    } else if (msg.method === 'tools/call') {
      try {
        send(msg.id, await handleTool(msg.params?.name, msg.params?.arguments || {}));
      } catch (e) {
        error(msg.id, -32000, e?.message || String(e));
      }
    } else if (msg.id !== undefined) {
      error(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  }
});
