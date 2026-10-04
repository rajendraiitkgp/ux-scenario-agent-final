import { Codex } from '@openai/codex-sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Perspective } from '../types.js';
import { normalizeHtmlFragment } from '../utils/html.js';
import { promptFiles } from './config.js';

const codex = new Codex({ env: process.env.CODEX_API_KEY ? { ...process.env, CODEX_API_KEY: process.env.CODEX_API_KEY } : undefined });
const root=path.resolve(process.cwd(),'prompts');
export function createThread(){return codex.startThread({workingDirectory:process.cwd(),skipGitRepoCheck:true,sandboxMode:(process.env.CODEX_SANDBOX as any)||'read-only',model:process.env.CODEX_MODEL||undefined,modelReasoningEffort:(process.env.CODEX_REASONING_EFFORT as any)||'high'});}
async function base(){return fs.readFile(path.join(root,'shared.md'),'utf8')}
async function specific(p:Perspective){return fs.readFile(path.join(root,'agents',promptFiles[p]),'utf8')}
export async function runPerspective(p:Perspective,prd:string,onEvent:(e:any)=>void,signal?:AbortSignal){const thread=createThread();const prompt=`${await base()}\n\n${await specific(p)}\n\nSOURCE PRD:\n---\n${prd}\n---\n\nReturn ONLY one self-contained HTML <section> fragment. Do not return markdown fences, JSON, commentary, or a full HTML document.`;const stream=await thread.runStreamed(prompt,{signal});let response='';for await(const e of stream.events){onEvent(e);if(e.type==='item.completed' && e.item.type==='agent_message')response=e.item.text}return {html:normalizeHtmlFragment(response,p),threadId:thread.id||undefined}}
export async function runCodexText(prompt:string,onEvent:(e:any)=>void,signal?:AbortSignal){const thread=createThread();const stream=await thread.runStreamed(prompt,{signal});let response='';for await(const e of stream.events){onEvent(e);if(e.type==='item.completed'&&e.item.type==='agent_message')response=e.item.text}return {text:response,threadId:thread.id||undefined}}
