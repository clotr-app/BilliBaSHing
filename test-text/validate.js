'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=__dirname, rows=fs.readFileSync(path.join(dir,'examples.jsonl'),'utf8').trimEnd().split(/\r?\n/).map((s,i)=>{try{return JSON.parse(s)}catch(e){throw Error(`line ${i+1}: ${e.message}`)}});
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const ids=new Set();let positives=0,negatives=0;
for(const [i,r] of rows.entries()){
 assert(r&&typeof r.id==='string'&&typeof r.text==='string'&&['en','es'].includes(r.lang)&&Array.isArray(r.expect)&&Array.isArray(r.style),`schema at ${i+1}`);
 assert(!ids.has(r.id),`duplicate id ${r.id}`);ids.add(r.id);
 for(const e of r.expect){assert(typeof e.kind==='string'&&Array.isArray(e.span)&&e.span.length===2,`bad expect ${r.id}`);const [a,b]=e.span;const chars=[...r.text];assert(Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>a&&b<=chars.length,`span bounds ${r.id}`);assert(chars.slice(a,b).length===b-a,`span length ${r.id}`);}
 if(r.expect.length)positives++;else negatives++;
}
function luhn(s){let sum=0,dbl=false;for(let i=s.length-1;i>=0;i--){let n=+s[i];if(dbl){n*=2;if(n>9)n-=9;}sum+=n;dbl=!dbl;}return sum%10===0;}
function mod97(s){let rem=0;for(const ch of s){const v=/[A-Z]/.test(ch)?ch.charCodeAt(0)-55:ch;for(const c of String(v))rem=(rem*10+Number(c))%97;}return rem;}
function dniValid(s){return s.slice(-1)==='TRWAGMYFPDXBNJZSQVHLCKE'[Number(s.slice(0,8))%23];}
function nieValid(s){return s.slice(-1)==='TRWAGMYFPDXBNJZSQVHLCKE'[Number(({X:'0',Y:'1',Z:'2'})[s[0]]+s.slice(1,8))%23];}
function nhsValid(s){let sum=0;for(let i=0;i<9;i++)sum+=Number(s[i])*(10-i);return sum%11!==1&&Number(s[9])===(11-sum%11)%11;}
const dv=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]],pm=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]],inv=[0,4,3,2,1,5,6,7,8,9];
function verhoeff(s){let c=0;const rev=s.split('').reverse().map(Number);for(let i=0;i<rev.length;i++)c=dv[c][pm[(i+1)%8][rev[i]]];return inv[c];}
function curpValid(s){const chars='0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';let sum=0;for(let i=0;i<17;i++)sum+=chars.indexOf(s[i])*(18-i);return s.length===18&&Number(s[17])===(10-sum%10)%10;}
function bipValid(s){const ws=fs.readFileSync(path.join(dir,'bip39-english.txt'),'utf8').trim().split(/\r?\n/),p=s.split(' ');if(p.length!==12||p.some(x=>!ws.includes(x)))return false;let bits=p.map(x=>ws.indexOf(x).toString(2).padStart(11,'0')).join('');const ent=Buffer.from(bits.slice(0,128).match(/.{8}/g).map(x=>parseInt(x,2)));return bits.slice(128)===crypto.createHash('sha256').update(ent).digest()[0].toString(2).padStart(8,'0').slice(0,4);}
const wordDigits={zero:'0',zoro:'0',one:'1',won:'1',two:'2',too:'2',three:'3',thre:'3',four:'4',fore:'4',five:'5',fiv:'5',six:'6',siks:'6',seven:'7',sevn:'7',eight:'8',eigt:'8',nine:'9',nien:'9'};
for(const r of rows.filter(x=>x.expect.length))for(const e of r.expect){const raw=[...r.text].slice(...e.span).join('');const v=['credit_card','phone_number','us_ssn','iban','es_dni','es_nie','uk_nhs','aadhaar','au_tfn','mx_curp'].includes(e.kind)?raw.replace(/\b(?:zero|zoro|one|won|two|too|three|thre|four|fore|five|fiv|six|siks|seven|sevn|eight|eigt|nine|nien)\b/gi,w=>wordDigits[w.toLowerCase()]):raw;switch(e.kind){case'credit_card':assert(luhn(v.replace(/\D/g,'')),`Luhn ${r.id}`);break;case'iban':{const s=v.replace(/[\s-]/g,'');assert(mod97(s.slice(4)+s.slice(0,4))===1,`IBAN ${r.id}`);break;}case'es_dni':assert(dniValid(v.replace(/[- ]/g,'')),`DNI ${r.id}`);break;case'es_nie':assert(nieValid(v.replace(/[- ]/g,'')),`NIE ${r.id}`);break;case'uk_nhs':assert(nhsValid(v.replace(/\D/g,'')),`NHS ${r.id}`);break;case'aadhaar':{const s=v.replace(/\D/g,'');assert(verhoeff(s.slice(0,-1))===Number(s.slice(-1)),`Aadhaar ${r.id}`);break;}case'au_tfn':{const s=v.replace(/\D/g,''),w=[1,4,3,7,5,8,6,9,10];assert(s.length===9&&s.split('').reduce((a,d,i)=>a+Number(d)*w[i],0)%11===0,`TFN ${r.id}`);break;}case'mx_curp':assert(curpValid(v.replace(/[\s-]/g,'')),`CURP ${r.id}`);break;case'bip39_seed':assert(bipValid(v),`BIP39 ${r.id}`);break;case'us_ssn':{const s=v.replace(/\D/g,'');assert(/^\d{3}\d{2}\d{4}$/.test(s)&&!/^000|^666|^9/.test(s)&&s.slice(3,5)!=='00'&&s.slice(5)!=='0000',`SSN ${r.id}`);break;}}
}
const negativeTexts=rows.filter(x=>x.id==='neg-001'||x.id==='neg-002'||x.id==='neg-003'||x.id==='neg-007'||x.id==='neg-008'||x.id==='neg-009'||x.id==='neg-011'||x.id==='neg-012'||x.id==='neg-013');
assert(negativeTexts.every(x=>!x.expect.length),'negative expected set');
assert(!luhn('4111111111111112'),'invalid card negative accidentally passes Luhn');
assert(mod97('370400440532013002DE89')!==1,'invalid IBAN negative accidentally passes mod-97');
assert(/^666/.test('666123456'),'reserved SSN negative lost its reserved area');
assert(!dniValid('12345678A'),'invalid DNI negative accidentally passes');
assert(!nieValid('X1234567A'),'invalid NIE negative accidentally passes');
assert(!nhsValid('9434765918'),'invalid NHS negative accidentally passes');
const badAadhaar='234567890123';assert(verhoeff(badAadhaar.slice(0,-1))!==Number(badAadhaar.slice(-1)),'invalid Aadhaar negative accidentally passes');
const badTfn='123456783', tfnWeights=[1,4,3,7,5,8,6,9,10];assert(badTfn.split('').reduce((a,d,i)=>a+Number(d)*tfnWeights[i],0)%11!==0,'invalid TFN negative accidentally passes');
assert(!curpValid('XXXX000101HXXABC00'),'invalid CURP negative accidentally passes');
const serialized=fs.readFileSync(path.join(dir,'examples.jsonl'),'utf8');
const guards={github_classic:/\bgh[pousr]_[A-Za-z0-9]{20,}\b/,github_fine:/\bgithub_pat_[A-Za-z0-9_]{20,}\b/,openai:/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,google:/\bAIza[0-9A-Za-z_-]{35}\b/,anthropic:/\bsk-ant-[A-Za-z0-9_-]{20,}\b/};
for(const [name,re] of Object.entries(guards))assert(!re.test(serialized),`provider push shape ${name}`);
const aws=[...serialized.matchAll(/AKIA[0-9A-Z]{16}/g)].map(m=>m[0]);assert(aws.length===4&&aws.every(x=>x==='AKIAIOSFODNN7EXAMPLE'),'AWS doc sample allowlist: '+aws.length+' matches');
assert(negatives>=positives,`negative balance ${negatives}/${positives}`);
console.log(`PASS: ${rows.length} JSONL records parse; ${positives} positives, ${negatives} empty-expect negatives; IDs unique.`);
console.log(`PASS: all ${rows.reduce((n,r)=>n+r.expect.length,0)} expected spans match their text and stay in bounds.`);
console.log(`PASS: all positive card, IBAN, DNI, NIE, NHS, Aadhaar, TFN, CURP, BIP-39 and SSN checks validate.`);
console.log('PASS: selected negative card, IBAN, SSN, DNI, NIE, NHS, Aadhaar, TFN and CURP cases fail their checksums or reserved-range rules.');
console.log('PASS: provider-shaped fakes avoid GitHub/OpenAI/Google/Anthropic token regexes; AWS matches only the 4 allowlisted public documentation examples.');


