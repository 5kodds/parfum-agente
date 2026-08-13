const fs=require("node:fs");
const path=require("node:path");

const source=path.join(__dirname,"../frontend");
const output=path.join(__dirname,"../dist");
fs.rmSync(output,{recursive:true,force:true});
fs.cpSync(source,output,{recursive:true});

for(const required of ["index.html","css/styles.css","js/app.js","js/scent-engine.js","data/questions.json","data/fragrances.json"]){
  const target=path.join(output,required);
  if(!fs.existsSync(target))throw new Error(`Build is missing ${required}`);
}
console.log("Static production build created in dist/");
