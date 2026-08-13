const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
require("../frontend/js/scent-engine.js");

const engine=globalThis.ParfumAgenteScentEngine;
const data=name=>JSON.parse(fs.readFileSync(path.join(__dirname,"../frontend/data",name),"utf8"));
const questions=data("questions.json").questions;
const fragrances=data("fragrances.json").fragrances;
const archetypes=data("archetypes.json").archetypes;
const config=data("engine-config.json");

test("all catalog data loads",()=>{
  assert.equal(questions.length,12);
  assert.ok(fragrances.length>=30);
  assert.ok(archetypes.length>=10);
});

test("a complete answer set produces bounded Scent DNA",()=>{
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].id]));
  const profile=engine.buildUserProfile(answers,questions,config);
  for(const value of Object.values(profile.scentDNA)) assert.ok(value>=0&&value<=100);
  assert.equal(Object.keys(profile.scentDNA).length,6);
});

test("recommendations are sorted and include a valid match score",()=>{
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.options.at(-1).id]));
  const profile=engine.buildUserProfile(answers,questions,config);
  const recs=engine.getRecommendations(profile,fragrances,config,{minScore:0});
  assert.equal(recs.length,fragrances.length);
  assert.ok(recs.every(x=>x.match.score>=0&&x.match.score<=100));
  assert.ok(recs.every((x,i)=>i===0||recs[i-1].match.score>=x.match.score));
});

test("archetype selection returns primary and secondary identities",()=>{
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].id]));
  const profile=engine.buildUserProfile(answers,questions,config);
  const result=engine.getArchetype(profile,archetypes);
  assert.ok(result.primary.name);
  assert.ok(result.secondary.name);
});
