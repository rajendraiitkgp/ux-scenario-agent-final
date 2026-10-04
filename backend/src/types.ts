export const PERSPECTIVES = ['concept','user-scenario','structures','interaction-policy','ux-design-scope','open-decisions'] as const;
export type Perspective = typeof PERSPECTIVES[number];
export type RunStatus = 'queued'|'running'|'completed'|'failed'|'cancelled';
export interface PerspectiveRun { id:string; perspective:Perspective; status:RunStatus; html?:string; threadId?:string; error?:string; startedAt?:string; completedAt?:string; attempts:number; }
export interface Analysis { id:string; name:string; prd:string; selected:Perspective[]; status:RunStatus; runs:Record<string,PerspectiveRun>; finalHtml?:string; createdAt:string; updatedAt:string; critic?:{status:string;summary:string;issues:string[]}; }
export interface ProgressEvent { type:'analysis.started'|'agent.started'|'agent.event'|'agent.completed'|'agent.failed'|'validation.completed'|'critic.completed'|'composer.started'|'composer.completed'|'analysis.completed'|'analysis.failed'; analysisId:string; perspective?:Perspective; message?:string; data?:unknown; }
