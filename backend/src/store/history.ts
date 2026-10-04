import fs from 'node:fs/promises';
import path from 'node:path';
import type { Analysis } from '../types.js';

const file = path.resolve(process.cwd(),'data','analyses.json');
async function ensure(){await fs.mkdir(path.dirname(file),{recursive:true});try{await fs.access(file)}catch{await fs.writeFile(file,'{}')}}
async function read():Promise<Record<string,Analysis>>{await ensure();return JSON.parse(await fs.readFile(file,'utf8'))}
async function write(data:Record<string,Analysis>){await ensure();await fs.writeFile(file,JSON.stringify(data,null,2),'utf8')}
export async function save(a:Analysis){const d=await read();d[a.id]=a;await write(d);return a}
export async function get(id:string){return (await read())[id]}
export async function list(){return Object.values(await read()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(a=>({id:a.id,name:a.name,status:a.status,selected:a.selected,createdAt:a.createdAt,updatedAt:a.updatedAt,hasReport:Boolean(a.finalHtml)}))}
