#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { GoogleGenerativeAI } from '@google/generative-ai';

const VERSION = '1.0.0';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const NOVA_MCP_URL = process.env.NOVA_MCP_URL || '';
const NOVA_MCP_TOKEN = process.env.NOVA_MCP_TOKEN || '';

let genAI = null;
if (process.env.GOOGLE_AI_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
}

let novaSessionId = null;
let negotiatedProtocol = '2025-06-18';

function send(id, result) { 
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n'); 
}

function error(id, code, message, data) { 
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code,message,...(data?{data}:{})}})+'\n'); 
}

function projectRoot() {
  const root = process.env.NOVA_PROJECT_ROOT;
  if (!root) throw new Error('NOVA_PROJECT_ROOT is not configured.');
  return path.resolve(root);
}

function safeProjectPath(relative) {
  const root = projectRoot();
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`Path escapes NOVA_PROJECT_ROOT: ${relative}`);
  }
  return target;
}

async function readProjectFile(relative) {
  const target = safeProjectPath(relative);
  const stat = await fs.stat(target);
  if (!stat.isFile()) throw new Error(`Not a file: ${relative}`);
  return fs.readFile(target, 'utf8');
}

async function callGemini(prompt, system, modelName) {
  if (!genAI) throw new Error('GOOGLE_AI_KEY is not configured.');
  
  const model = genAI.getGenerativeModel({ 
    model: modelName || DEFAULT_MODEL,
    systemInstruction: system || undefined
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return {
    model: modelName || DEFAULT_MODEL,
    text: response.text(),
    usage: response.usageMetadata
  };
}

const tools = [
  {
    name: 'gemini_ask',
    description: 'Send a prompt to Gemini via Google AI Studio.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        system: { type: 'string' },
        model: { type: 'string' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'project_read_state',
    description: 'Read PROJECT_CONTEXT.md from the shared Nova project.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'project_write_handoff',
    description: 'Write a Gemini handoff markdown artifact into the project root.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        filename: { type: 'string' }
      },
      required: ['content']
    }
  }
];

async function handleTool(name, args) {
  if (name === 'gemini_ask') {
    const res = await callGemini(args.prompt, args.system, args.model);
    return { content: [{ type: 'text', text: JSON.stringify({ provenance: 'gemini-connector-3000', ...res }, null, 2) }] };
  }
  
  if (name === 'project_read_state') {
    const content = await readProjectFile('PROJECT_CONTEXT.md');
    return { content: [{ type: 'text', text: content }] };
  }

  if (name === 'project_write_handoff') {
    const filename = args.filename || 'MODEL_HANDOFF_GEMINI.md';
    if (!/^[A-Za-z0-9._-]+\.md$/.test(filename)) throw new Error('Invalid handoff filename.');
    await fs.writeFile(safeProjectPath(filename), args.content, 'utf8');
    return { content: [{ type: 'text', text: `Wrote shared handoff: ${filename}` }] };
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
      send(msg.id, {
        protocolVersion: negotiatedProtocol,
        capabilities: { tools: {} },
        serverInfo: { name: 'gemini-connector-3000', version: VERSION }
      });
    } else if (msg.method === 'notifications/initialized') {
      // Handshake complete
    } else if (msg.method === 'ping') {
      send(msg.id, {});
    } else if (msg.method === 'tools/list') {
      send(msg.id, { tools });
    } else if (msg.method === 'tools/call') {
      try {
        const result = await handleTool(msg.params?.name, msg.params?.arguments || {});
        send(msg.id, result);
      } catch (e) {
        error(msg.id, -32000, e?.message || String(e));
      }
    } else if (msg.id !== undefined) {
      error(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  }
});
