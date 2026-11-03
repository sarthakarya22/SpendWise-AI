import {createClient} from '@supabase/supabase-js';
export const supabase=import.meta.env.VITE_SUPABASE_URL&&import.meta.env.VITE_SUPABASE_ANON_KEY?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY):null;
export async function allRecords(table){const result=[];for(let offset=0;;offset+=1000){const {data,error}=await supabase.from(table).select('*').order('id').range(offset,offset+999);if(error)throw error;result.push(...data);if(data.length<1000)return {data:result};}}
