<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type Perspective='concept'|'user-scenario'|'structures'|'interaction-policy'|'ux-design-scope'|'open-decisions';
const perspectives:{id:Perspective;label:string;description:string}[]=[
{id:'concept',label:'Concept',description:'Product value, goals, users and scope'},
{id:'user-scenario',label:'User Scenario',description:'Journeys, states, paths and edge cases'},
{id:'structures',label:'Structures',description:'Information architecture and product structure'},
{id:'interaction-policy',label:'Interaction & Policy',description:'Rules, behavior, validation and policies'},
{id:'ux-design-scope',label:'UX Design Scope',description:'Screens, components, states and deliverables'},
{id:'open-decisions',label:'Open Decisions & Dependencies',description:'Unknowns, dependencies, risks and decisions'}];
const prd=ref('');const fileName=ref('');const name=ref('');const selected=ref<Perspective[]>(perspectives.map(p=>p.id));const busy=ref(false);const error=ref('');const analysis=ref<any>();const history=ref<any[]>([]);const events=ref<any[]>([]);let es:EventSource|undefined;
const selectedCount=computed(()=>selected.value.length);const allSelected=computed(()=>selectedCount.value===perspectives.length);
function toggle(p:Perspective){selected.value=selected.value.includes(p)?selected.value.filter(x=>x!==p):[...selected.value,p]}
function toggleAll(){selected.value=allSelected.value?[]:perspectives.map(p=>p.id)}
async function onFile(e:Event){const input=e.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;if(!/\.(md|txt)$/i.test(file.name)){error.value='Only .md and .txt files are supported.';return}fileName.value=file.name;name.value=file.name.replace(/\.(md|txt)$/i,'');prd.value=await file.text();error.value=''}
async function loadHistory(){history.value=await fetch('/api/analyses').then(r=>r.json())}
async function generate(){error.value='';if(!prd.value.trim()){error.value='Please upload or paste a PRD.';return}if(!selectedCount.value){error.value='Select at least one perspective.';return}busy.value=true;events.value=[];const res=await fetch('/api/analyses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.value||fileName.value||'Untitled PRD',prd:prd.value,selected:selected.value})});if(!res.ok){error.value=(await res.json()).error||'Unable to start analysis';busy.value=false;return}analysis.value=await res.json();connectEvents(analysis.value.id);await loadHistory()}
function connectEvents(id:string){es?.close();es=new EventSource(`/api/analyses/${id}/events`);es.onmessage=async ev=>{const e=JSON.parse(ev.data);events.value.push(e);if(e.data?.status){}if(e.type==='analysis.completed'||e.type==='snapshot'){analysis.value=await fetch(`/api/analyses/${id}`).then(r=>r.json());busy.value=analysis.value.status==='running'||analysis.value.status==='queued';if(!busy.value)await loadHistory()}if(e.type==='analysis.failed'){analysis.value=await fetch(`/api/analyses/${id}`).then(r=>r.json());busy.value=false}};es.onerror=()=>{} }
async function openHistory(id:string){analysis.value=await fetch(`/api/analyses/${id}`).then(r=>r.json());prd.value=analysis.value.prd;selected.value=analysis.value.selected;name.value=analysis.value.name;busy.value=false;connectEvents(id)}
async function rerun(p:Perspective){if(!analysis.value)return;await fetch(`/api/analyses/${analysis.value.id}/rerun/${p}`,{method:'POST'});busy.value=true;connectEvents(analysis.value.id)}
async function cancelCurrent(){if(!analysis.value)return;await fetch(`/api/analyses/${analysis.value.id}/cancel`,{method:'POST'});busy.value=false;analysis.value=await fetch(`/api/analyses/${analysis.value.id}`).then(r=>r.json());await loadHistory()}
function download(){if(!analysis.value?.finalHtml)return;const blob=new Blob([analysis.value.finalHtml],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${analysis.value.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase() || 'ux-report'}.html`;a.click();URL.revokeObjectURL(a.href)}
onMounted(loadHistory)
</script>
<template>
<div class="app">
<header><div><strong>UX Scenario Agent</strong><span>Codex-powered UX analysis</span></div><button class="ghost" @click="loadHistory">Refresh history</button></header>
<main>
<section v-if="!analysis" class="workspace">
<div class="intro"><h1>Analyze your PRD from multiple UX perspectives</h1><p>Choose your PRD and select exactly the perspectives you want before generating the analysis.</p></div>
<div class="grid">
<div class="card input-card">
<label class="label">PRD</label>
<label class="upload"><input type="file" accept=".md,.txt" @change="onFile"><span class="upload-icon">📄</span><strong>Choose PRD File</strong><small>.md or .txt</small></label>
<div class="or">or</div>
<textarea v-model="prd" placeholder="Paste your PRD here..."></textarea>
<div class="row"><input v-model="name" class="text" placeholder="Analysis name (optional)"><span class="count">{{ prd.length }} characters</span></div>
</div>
<div class="card perspective-card">
<div class="card-title"><div><span class="label">WHAT WOULD YOU LIKE TO ANALYZE?</span><h2>{{ selectedCount }} of {{ perspectives.length }} selected</h2></div><button class="link" @click="toggleAll">{{ allSelected ? 'Clear all' : 'Select all' }}</button></div>
<label v-for="p in perspectives" :key="p.id" class="perspective" :class="{selected:selected.includes(p.id)}"><input type="checkbox" :checked="selected.includes(p.id)" @change="toggle(p.id)"><span><strong>{{ p.label }}</strong><small>{{ p.description }}</small></span></label>
<button class="primary" :disabled="!prd.trim() || !selectedCount || busy" @click="generate">Generate Analysis <span>→</span></button>
<p v-if="error" class="error">{{ error }}</p>
</div>
</div>
</section>
<section v-else-if="busy" class="progress card">
<div class="progress-head"><div><span class="label">ANALYSIS IN PROGRESS</span><h1>{{ analysis.name }}</h1><p>Codex agents are analyzing the selected perspectives in parallel.</p></div></div>
<div class="agent-grid"><div v-for="p in analysis.selected" :key="p" class="agent" :class="analysis.runs[p].status"><span class="dot"></span><div><strong>{{ perspectives.find(x=>x.id===p)?.label }}</strong><small>{{ analysis.runs[p].status }}</small></div></div></div>
<div class="composer"><div class="spinner"></div><div><strong>Codex Report Composer is assembling the final HTML…</strong><p>Combining the completed UX perspectives into one coherent HTML report.</p></div></div>
<div class="progress-actions"><button class="secondary" @click="cancelCurrent">Cancel analysis</button></div><div class="event-log"><div v-for="(e,i) in events.slice(-8)" :key="i">{{ e.message || e.type }}</div></div>
</section>
<section v-if="analysis && analysis.status==='completed'" class="report-shell">
<div class="report-toolbar"><div><span class="label">FINAL UX REPORT</span><h2>{{ analysis.name }}</h2></div><div class="toolbar-actions"><button class="secondary" @click="download">Download HTML</button><button class="secondary" @click="analysis=undefined">New Analysis</button></div></div>
<div class="report-layout"><aside><strong>Perspectives</strong><button v-for="p in analysis.selected" :key="p" @click="rerun(p)" class="side-item">↻ {{ perspectives.find(x=>x.id===p)?.label }}<small>{{ analysis.runs[p].status }}</small></button><div class="critic"><strong>Quality review</strong><p>{{ analysis.critic?.summary || 'Completed' }}</p></div></aside><iframe class="report" :srcdoc="analysis.finalHtml"></iframe></div>
</section>
<section class="recent card"><div class="card-title"><div><span class="label">RECENT</span><h2>Previous analyses</h2></div></div><div v-if="!history.length" class="empty">No analyses yet.</div><button v-for="h in history" :key="h.id" class="history" @click="openHistory(h.id)"><span><strong>{{ h.name }}</strong><small>{{ h.selected.length }} perspectives · {{ new Date(h.updatedAt).toLocaleString() }}</small></span><span>→</span></button></section>
</main>
</div>
</template>
