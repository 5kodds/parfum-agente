const H={"content-type":"application/json; charset=UTF-8","access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type"};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const BASE="https://api.fragella.com/api/v1";
const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));

function auth(env){return {"x-api-key":env.FRAGELLA_API_KEY,"accept":"application/json"}}
async function fragella(env,path,params={}){
 if(!env.FRAGELLA_API_KEY) throw Error("FRAGELLA_API_KEY is not configured");
 const u=new URL(BASE+path);
 Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,String(v))});
 const r=await fetch(u,{headers:auth(env)});
 if(!r.ok) throw Error(`Fragella ${r.status}`);
 return r.json();
}
function arr(x){return Array.isArray(x)?x:[]}
function names(x){return arr(x).map(n=>typeof n==="string"?n:n?.name).filter(Boolean)}
function normalize(x){
 const notes=x.Notes||x.notes||{};
 const top=names(notes.Top||notes.top), middle=names(notes.Middle||notes.middle||notes.Heart), base=names(notes.Base||notes.base);
 const accords=arr(x["Main Accords"]||x.mainAccords||x.accords).reduce((o,a)=>{const n=typeof a==="string"?a:a?.name;if(n)o[n]=Number(a?.percentage??a?.value??0);return o},{});
 return {
  id:x._id||x.id,brand:x.Brand||x.brand,name:x.Name||x.name,year:x.Year||x.year||null,
  image:x["Image URL Transparent"]||x["Image URL"]||x.imageUrl||null,
  gender:x.Gender||x.gender||null,concentration:x.OilType||x.concentration||null,
  notes:{top,middle,base},generalNotes:names(x["General Notes"]||x.generalNotes),
  accords,longevity:x.Longevity||x.longevity||null,sillage:x.Sillage||x.sillage||null,
  price:x.Price||x.price||null,purchaseUrl:x["Purchase URL"]||x.purchaseUrl||null,
  rawConfidence:x.Confidence||x.confidence||null
 };
}
const lower=s=>String(s||"").toLowerCase();
function score(profile,f){
 const wanted=[...(profile.preferredFamilies||[]),...(profile.preferredNotes||[])].map(lower);
 const all=[...(f.generalNotes||[]),...(f.notes?.top||[]),...(f.notes?.middle||[]),...(f.notes?.base||[]),...Object.keys(f.accords||{})].map(lower);
 const hits=wanted.filter(w=>all.some(a=>a.includes(w)||w.includes(a))).length;
 const familyHits=(profile.preferredFamilies||[]).filter(w=>Object.keys(f.accords||{}).some(a=>lower(a).includes(lower(w)))).length;
 return clamp(45+hits*7+familyHits*5);
}
function profileToMatch(profile){
 const notes=profile.preferredNotes||[];
 const families=profile.preferredFamilies||[];
 // Fragella requires note-position fields only when we have confidence about position.
 // General notes are safer for the personalized engine.
 const params={general:notes.slice(0,6).join(","),limit:10};
 if(families.length) params.accords=families.slice(0,3).map(x=>`${x}:35`).join(",");
 return params;
}
export default{async fetch(req,env){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
 const u=new URL(req.url);
 if(u.pathname==="/health")return json({ok:true,version:"2.2.0",fragellaConfigured:!!env.FRAGELLA_API_KEY});
 if(u.pathname==="/usage"&&req.method==="GET"){
  try{return json(await fragella(env,"/usage"))}catch(e){return json({error:e.message},502)}
 }
 if(u.pathname!=="/recommend"||req.method!=="POST")return json({error:"Not found"},404);
 try{
  const body=await req.json(),p=body.profile||{};
  if(!p.scentDNA)return json({error:"profile.scentDNA is required"},400);

  let raw;
  const matchParams=profileToMatch(p);
  try{
   raw=await fragella(env,"/fragrances/match",matchParams);
  }catch{
   const q=[...(p.preferredFamilies||[]),...(p.preferredNotes||[])].slice(0,4).join(" ");
   raw=await fragella(env,"/fragrances",{search:q,limit:10});
  }

  const source=Array.isArray(raw)?raw:(raw.data||raw.fragrances||raw.results||[]);
  const candidates=source.map(normalize).filter(x=>x.id&&x.name);
  const ranked=candidates.map(f=>({...f,matchScore:score(p,f)})).sort((a,b)=>b.matchScore-a.matchScore);

  return json({
   enabled:true,provider:"Fragella",endpoint:"/fragrances/match",
   query:matchParams,generatedAt:new Date().toISOString(),
   recommendations:ranked.slice(0,10)
  });
 }catch(e){return json({enabled:false,error:e.message,recommendations:[]},502)}
}};