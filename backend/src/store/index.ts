import * as local from './history.js';
import * as db from './postgres.js';
import type { Analysis } from '../types.js';
export const persistent=Boolean(process.env.DATABASE_URL);
export async function initStore(){if(persistent)await db.initDb()}
export async function save(a:Analysis){return persistent?db.saveDb(a):local.save(a)}
export async function get(id:string){return persistent?db.getDb(id):local.get(id)}
export async function list(){return persistent?db.listDb():local.list()}
