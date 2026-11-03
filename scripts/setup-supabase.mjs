import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const env=Object.fromEntries(fs.readFileSync('.env.setup','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
const url=new URL(env.SUPABASE_PROJECT_URL),ref=url.hostname.endsWith('.supabase.co')?url.hostname.split('.')[0]:url.pathname.match(/\/project\/([a-z0-9]+)/)?.[1];
if(!ref||!/^[a-z0-9]+$/.test(ref))throw Error('Use the Supabase Project URL from Connect.');
const origin=process.env.SPENDWISE_APP_ORIGIN||'http://127.0.0.1:5173';
const redact=s=>Object.values(env).filter(Boolean).reduce((a,v)=>a.replaceAll(v,'[redacted]'),s);
async function api(route,{method='GET',body}={}){const r=await fetch(`https://api.supabase.com/v1/projects/${ref}${route}`,{method,headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,...(body&&! (body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`${method} ${route}: HTTP ${r.status} ${redact((await r.text()).slice(0,800))}`);const text=await r.text();return text?JSON.parse(text):null}
async function sql(query){return api('/database/query',{method:'POST',body:{query}})}
try{
 const project=await api('');console.log(`Connected to project: ${project.name}; status: ${project.status}`);
 if(process.argv.includes('--inspect')){const tables=await sql("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename");console.log('Existing public tables:',JSON.stringify(tables));const auth=await api('/config/auth');console.log('Auth:',JSON.stringify({email_enabled:auth.external_email_enabled,email_confirmation:!auth.mailer_autoconfirm,site_url:auth.site_url}));process.exit(0)}
 await sql('create table if not exists public.spendwise_migrations (name text primary key, applied_at timestamptz default now()); alter table public.spendwise_migrations enable row level security;');
 const done=await sql('select name from public.spendwise_migrations');
 for(const name of ['001_initial.sql','002_ai_limits.sql']){if(done.some(r=>r.name===name)){console.log('Migration already applied:',name);continue}await sql(`begin;\n${fs.readFileSync('supabase/migrations/'+name,'utf8')}\ninsert into public.spendwise_migrations(name) values ('${name}');\ncommit;`);console.log('Applied:',name)}
 const auth=await api('/config/auth');const redirects=[...new Set([...(auth.uri_allow_list||'').split(',').filter(Boolean),origin,origin+'/','http://localhost:5173','http://localhost:5173/'])];
 await api('/config/auth',{method:'PATCH',body:{site_url:origin,uri_allow_list:redirects.join(','),external_email_enabled:true,disable_signup:false,password_min_length:8}});console.log('Email sign-in and local redirects configured; existing email confirmation setting preserved.');
 const keys=await api('/api-keys');const anon=keys.find(k=>k.name==='anon')||keys.find(k=>k.type==='publishable');if(!anon?.api_key)throw Error('No public API key available.');
 fs.writeFileSync('.env.local',`VITE_SUPABASE_URL=https://${ref}.supabase.co\nVITE_SUPABASE_ANON_KEY=${anon.api_key}\n`);console.log('Wrote frontend connection to ignored .env.local.');
 const secrets=[{name:'APP_ORIGIN',value:origin},{name:'NVIDIA_MODEL',value:'nvidia/nemotron-3.5-bolt-e4b'}];if(env.NVIDIA_API_KEY)secrets.push({name:'NVIDIA_API_KEY',value:env.NVIDIA_API_KEY});await api('/secrets',{method:'POST',body:secrets});console.log('Configured server-side AI secrets.');
 const form=new FormData();form.set('metadata',JSON.stringify({name:'ai',entrypoint_path:'index.ts',verify_jwt:false}));form.append('file',new Blob([fs.readFileSync('supabase/functions/ai/index.ts')],{type:'application/typescript'}),'index.ts');
 const deployed=await api('/functions/deploy?slug=ai',{method:'POST',body:form});console.log('AI function deployed:',JSON.stringify({status:deployed.status,version:deployed.version}));
 const tables=await sql("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename");console.log('Verified tables and RLS:',JSON.stringify(tables));console.log('Supabase setup complete.');
}catch(e){console.error(redact(e.message));process.exitCode=1}
