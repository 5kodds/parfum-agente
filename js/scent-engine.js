/* Parfum Agente — Scent Engine v1.0.0 */
(function (global) {
  "use strict";
  const D = ["freshness","sweetness","warmth","intensity","character","elegance"];
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
  const avg=(a,f=50)=>{const x=a.filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:f;};

  function optionFor(q,answer){const id=typeof answer==="object"?answer?.id:answer;return q?.options?.find(o=>o.id===id)||null;}

  function buildUserProfile(answers={},questions=[],config={}){
    const raw={}; D.forEach(d=>raw[d]=[]);
    const families={},notes={},occasions={},explore=[];
    questions.forEach(q=>{
      const o=optionFor(q,answers[q.id]); if(!o)return;
      if(q.absoluteDimension&&D.includes(q.absoluteDimension)&&Number.isFinite(o.value)) raw[q.absoluteDimension].push(o.value);
      else if(o.scores) D.forEach(d=>{if(Number.isFinite(o.scores[d]))raw[d].push(clamp(50+o.scores[d]));});
      (o.families||[]).forEach(x=>families[x]=(families[x]||0)+1);
      (o.notes||[]).forEach(x=>notes[x]=(notes[x]||0)+1);
      (o.occasions||[]).forEach(x=>occasions[x]=(occasions[x]||0)+1);
      if(q.absoluteOccasion&&o.occasion) occasions[o.occasion]=(occasions[o.occasion]||0)+3;
      if(q.absoluteDimension==="exploration"&&Number.isFinite(o.value))explore.push(o.value);
    });
    const scentDNA={};
    D.forEach(d=>{
      const w=config.questionWeights?.[d]||{};
      const vals=[];
      Object.entries(w).forEach(([qid,weight])=>{
        const q=questions.find(x=>x.id===qid),o=optionFor(q,answers[qid]);
        if(!o)return;
        let v=Number.isFinite(o.value)&&q.absoluteDimension===d?o.value:o.scores?.[d]!=null?clamp(50+o.scores[d]):null;
        if(v!=null)vals.push([v,weight]);
      });
      const tw=vals.reduce((s,x)=>s+x[1],0);
      scentDNA[d]=tw?clamp(vals.reduce((s,x)=>s+x[0]*x[1],0)/tw):clamp(avg(raw[d]));
    });
    const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
    const fam=top(families).slice(0,5), note=top(notes).slice(0,8);
    const occ={};const max=Math.max(1,...Object.values(occasions));["everyday","office","date","nightlife","formal","outdoor","versatile"].forEach(k=>occ[k]=clamp((occasions[k]||0)/max*100));
    return {scentDNA,exploration:clamp(avg(explore)),preferredFamilies:fam,preferredNotes:note,occasions:occ};
  }

  function dnaMatch(u,f){return Math.round(clamp(100-avg(D.map(d=>Math.abs(clamp(u?.[d])-clamp(f?.[d]))))));}
  function familyMatch(uf=[],ff=[],c={}){if(!uf.length||!ff.length)return c.defaults?.family??50;const s=new Set(ff.map(x=>x.toLowerCase()));return Math.round(clamp(uf.filter(x=>s.has(x.toLowerCase())).length/uf.length*100));}
  function noteMatch(un=[],notes={},c={}){if(!un.length)return c.defaults?.note??50;const s=new Set(["top","heart","base"].flatMap(k=>notes?.[k]||[]).map(x=>x.toLowerCase()));return Math.round(clamp(un.filter(x=>s.has(x.toLowerCase())).length/un.length*100));}
  function noteFamilyMatch(u,f,c={}){const a=familyMatch(u.preferredFamilies,f.families,c),b=noteMatch(u.preferredNotes,f.notes,c),w=c.noteFamilyWeights||{family:.6,note:.4};return clamp(a*w.family+b*w.note);}
  function occasionMatch(u={},f={},c={}){const ks=Object.keys(u).filter(k=>u[k]>0);if(!ks.length)return c.defaults?.occasion??50;return Math.round(clamp(avg(ks.map(k=>100-Math.abs(clamp(u[k])-clamp(f?.[k]))))));}
  function explorationMatch(u,f){return Math.round(clamp(100-Math.abs(clamp(u)-clamp(f))));}

  function calculateMatch(user,fragrance,config={}){
    const dna=dnaMatch(user.scentDNA,fragrance.scentDNA);
    const nf=noteFamilyMatch(user,fragrance,config);
    const oc=occasionMatch(user.occasions,fragrance.occasions,config);
    const ex=explorationMatch(user.exploration,fragrance.exploration);
    const w=config.weights||{scentDNA:.6,noteFamily:.2,occasion:.1,exploration:.1};
    const score=Math.round(clamp(dna*w.scentDNA+nf*w.noteFamily+oc*w.occasion+ex*w.exploration));
    return {score,dnaMatch:dna,familyMatch:familyMatch(user.preferredFamilies,fragrance.families,config),noteMatch:noteMatch(user.preferredNotes,fragrance.notes,config),noteFamilyMatch:Math.round(nf),occasionMatch:oc,explorationMatch:ex};
  }

  function getMatchLabel(s,c={}){const t=c.thresholds||{exceptional:90,strong:80,good:70,interesting:60};return s>=t.exceptional?"Exceptional Match":s>=t.strong?"Strong Match":s>=t.good?"Good Match":s>=t.interesting?"Interesting Match":"Low Match";}
  function getRecommendations(user,fragrances,config={},opts={}){const min=opts.minScore??config.thresholds?.interesting??60;return (fragrances||[]).map(f=>{const match=calculateMatch(user,f,config);return {...f,match,matchLabel:getMatchLabel(match.score,config)}}).filter(x=>x.match.score>=min).sort((a,b)=>b.match.score-a.match.score);}
  function generateWhyText(user,f,m){const r=[];if(m.dnaMatch>=85)r.push("Its overall scent character closely matches your profile.");if(m.familyMatch>=75)r.push("It features fragrance families you naturally gravitate toward.");if(m.noteMatch>=70)r.push("Several of its notes align with your preferences.");if(m.occasionMatch>=80)r.push("It fits the occasions you selected.");if(m.explorationMatch>=80)r.push("Its level of uniqueness fits how adventurous you said you are.");return r.slice(0,3).length?r.slice(0,3):["It shares several important characteristics with your scent profile."];}

  function getArchetype(user,archetypes=[]){
    const ranked=archetypes.map(a=>({...a,distance:Math.sqrt(D.reduce((s,d)=>s+Math.pow((user.scentDNA[d]||50)-(a.scentDNA[d]||50),2),0))})).sort((a,b)=>a.distance-b.distance);
    return ranked.length?{primary:ranked[0],secondary:ranked[1],ranked}:null;
  }
  global.ParfumAgenteScentEngine={buildUserProfile,calculateMatch,getRecommendations,getMatchLabel,generateWhyText,getArchetype,dnaMatch,familyMatch,noteMatch,noteFamilyMatch,occasionMatch,explorationMatch};
})(typeof window!=="undefined"?window:globalThis);
