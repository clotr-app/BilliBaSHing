'use strict';
// Rebuilds the synthetic JSONL corpus from a fixed seed. Run: node test-text/build.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const here = __dirname;
const words = fs.readFileSync(path.join(here, 'bip39-english.txt'), 'utf8').trim().split(/\r?\n/);
if (words.length !== 2048) throw new Error('BIP-39 list must contain 2,048 entries');
let state = 0x4b1b1a5;
function rand(n) { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % n; }
function digits(n) { return Array.from({length:n}, () => rand(10)).join(''); }
function luhn(s) { let sum=0, dbl=false; for(let i=s.length-1;i>=0;i--){let x=+s[i];if(dbl){x*=2;if(x>9)x-=9;}sum+=x;dbl=!dbl;}return sum%10===0; }
function card() { const base='4'+digits(14); for(let d=0;d<10;d++) if(luhn(base+d)) return base+d; throw Error('luhn'); }
function mod97(s) { let r=0; for(const ch of s){ const v=/[A-Z]/.test(ch)?ch.charCodeAt(0)-55:ch; for(const c of String(v)) r=(r*10+Number(c))%97; } return r; }
function iban() { const bban=digits(18); const check=String(98-mod97(bban+'DE00')).padStart(2,'0'); return 'DE'+check+bban; }
function dni() { const n=String(rand(100000000)).padStart(8,'0'); return n+'TRWAGMYFPDXBNJZSQVHLCKE'[Number(n)%23]; }
function nie() { const lead=['X','Y','Z'][rand(3)], n=String(rand(10000000)).padStart(7,'0'); const v=({X:'0',Y:'1',Z:'2'})[lead]+n; return lead+n+'TRWAGMYFPDXBNJZSQVHLCKE'[Number(v)%23]; }
function nhs() { const n=digits(9); let sum=0; for(let i=0;i<9;i++)sum+=Number(n[i])*(10-i); const c=(11-(sum%11))%11; return c===10?nhs():n+c; }
const dv=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const pm=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const inv=[0,4,3,2,1,5,6,7,8,9];
function verhoeff(s) { let c=0, rev=s.split('').reverse().map(Number); for(let i=0;i<rev.length;i++) c=dv[c][pm[(i+1)%8][rev[i]]]; return inv[c]; }
function aadhaar() { const b='2'+digits(10); return b+verhoeff(b); }
function tfn() { const w=[1,4,3,7,5,8,6,9,10]; for(;;){const b=digits(8);let sum=0;for(let i=0;i<8;i++)sum+=Number(b[i])*w[i];const c=sum%11;if(c<10)return b+c;} }
function curp() { const b=['BASH','TEST','MOCK'][rand(3)]+'010101'+(rand(2)?'H':'M')+'NE'+'BCDFG'[rand(5)]+'BCDFG'[rand(5)]+'BCDFG'[rand(5)]+String(rand(10)); const chars='0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';let sum=0;for(let i=0;i<17;i++)sum+=chars.indexOf(b[i])*(18-i);return b+String((10-(sum%10))%10); }
const nwords=['zero','one','two','three','four','five','six','seven','eight','nine'];
const miss=['zoro','won','too','thre','fore','fiv','siks','sevn','eigt','nien'];
function numberWords(s,bad=false) { return s.replace(/\d/g,d=>` ${(bad?miss:nwords)[d]} `).replace(/\s+/g,' ').trim(); }
function bip39() { const entropy=crypto.createHash('sha256').update('BilliBaSHing-fixed-seed-'+rand(0x7fffffff)).digest().subarray(0,16); const checksum=crypto.createHash('sha256').update(entropy).digest()[0]>>>4; let bits=[...entropy].map(x=>x.toString(2).padStart(8,'0')).join('')+checksum.toString(2).padStart(4,'0'); const out=[];for(let i=0;i<12;i++)out.push(words[parseInt(bits.slice(i*11,(i+1)*11),2)]);return out.join(' '); }
function address() { const num=rand(8999)+100; const street=['Imaginary Quay','Fable Crescent','Example Loop','Nowhere Parade','Fictional Way'][rand(5)];return `${num} ${street}, Testville, ZZ 00000`; }
const kinds=[
 ['credit_card',()=>card(), 'card'], ['iban',()=>iban(),'iban'], ['us_ssn',()=>{const a=rand(665)+1;return `${String(a).padStart(3,'0')}${String(rand(99)+1).padStart(2,'0')}${String(rand(9999)+1).padStart(4,'0')}`;},'ssn'],
 ['phone_number',()=>`20255501${String(rand(100)).padStart(2,'0')}`,'phone'], ['email',()=>`sample${rand(9999)}@${rand(2)?'example.com':'example.org'}`,'email'], ['address',()=>address(),'address'],
 ['es_dni',()=>dni(),'id'], ['es_nie',()=>nie(),'id'], ['uk_nhs',()=>nhs(),'id'], ['uk_ni',()=>`AB${String(rand(1000000)).padStart(6,'0')}${'ABCD'[rand(4)]}`,'id'], ['aadhaar',()=>aadhaar(),'id'], ['au_tfn',()=>tfn(),'id'], ['mx_curp',()=>curp(),'curp'], ['bip39_seed',()=>bip39(),'seed'], ['aws_access_key',()=> 'AKIAIOSFODNN7EXAMPLE','aws'],
 ['github_token_fake',()=>`ghp-EXAMPLE-NOT-A-TOKEN-${String(rand(1e8)).padStart(8,'0')}`,'fakekey'], ['openai_key_fake',()=>`sk:example-not-a-key-${String(rand(1e8)).padStart(8,'0')}`,'fakekey']
];
function styleValue(raw, category, i) {
 if((i%8===1)&&category==='card')return raw.replace(/(\d{4})(?=\d)/g,'$1 ');
 if((i%8===2)&&['card','ssn','phone','id','iban','curp'].includes(category))return raw.replace(/(\d{3})(?=\d)/g,'$1-');
 if((i%8===3)&&['card','ssn','phone','id','iban','curp'].includes(category))return numberWords(raw);
 if((i%8===4)&&['card','ssn','phone','id','iban','curp'].includes(category))return numberWords(raw,true);
 if((i%8===5)&&['card','ssn','phone','id','iban','curp'].includes(category))return raw.replace(/\d/g,(d,j)=>j%2?` ${nwords[d]} `:d).trim();
 if((i%8===6)&&(category==='email'||category==='fakekey'||category==='aws'||category==='seed'))return raw;
 return raw;
}
const templates=[(x)=>`Example: ${x}`,x=>`For the test form, use ${x}.`,x=>'`'+x+'`',x=>`La muestra ficticia es ${x}.`,x=>`The parser should find ${x} here.`,x=>'\n```text\n'+x+'\n```',x=>`Copy this made-up value: ${x}`,x=>`Test case value = ${x}`,x=>`I typed ${x} in the mock form.`,x=>`El formulario de prueba contiene ${x}.`];
const rows=[];
for(const [kind,make,cat] of kinds){const count=kind==='aws_access_key'?4:20;for(let i=0;i<count;i++){const raw=styleValue(make(),cat,i);const wrap=templates[i%templates.length];let text=wrap(raw);if(kind==='address'&&i%10===0)text=raw;const start=text.indexOf(raw);const tags=[];if(/\d/.test(raw))tags.push('digits');if(/[ -]/.test(raw))tags.push('spaced');if(/-/.test(raw))tags.push('dashed');if(i%8===4&&['card','ssn','phone','id','iban','curp'].includes(cat))tags.push('misspelled');if(/[a-z].*\d|\d.*[a-z]/i.test(raw))tags.push('mixed');if(i%8===3&&['card','ssn','phone','id','iban','curp'].includes(cat))tags.push('number_words');if(i%10===3||i%10===9)tags.push('spanish');if(text.includes('\n```'))tags.push('code_block');else tags.push('in_sentence');rows.push({id:`pos-${kind}-${String(i+1).padStart(2,'0')}`,text,lang:tags.includes('spanish')?'es':'en',expect:[{kind,span:[start,start+raw.length]}],style:[...new Set(tags)]});}}
const negTexts=[
 ['credit_card','4111 1111 1111 1112','wrong Luhn digit'],['iban','DE89370400440532013002','wrong IBAN check digit'],['us_ssn','666-12-3456','reserved SSN area'],['phone_number','202-555-01999','too long'],['email','sample.user@not-a-domain.invalid','invalid email domain'],['address','12 Main Street, Testville, ZZ 00000','ordinary street name'],['es_dni','12345678A','wrong DNI check letter'],['es_nie','X1234567A','wrong NIE check letter'],['uk_nhs','9434765918','wrong NHS check digit'],['uk_ni','AB123456C','invalid NI suffix'],['aadhaar','234567890123','wrong Verhoeff check digit'],['au_tfn','123456783','wrong TFN checksum'],['mx_curp','XXXX000101HXXABC00','wrong CURP check digit'],['bip39_seed','this is random English and not a mnemonic phrase at all','not a seed phrase'],['aws_access_key','AKIA','placeholder key'],['github_token_fake','ghp_','placeholder key'],['openai_key_fake','sk-','placeholder key'],['credit_card','ORD-2026-00412','order number'],['us_ssn','2026-10-17','date'],['credit_card','version 4.12.0 build 77','version string']
];
for(let i=0;i<360;i++){const [kind,txt,why]=negTexts[i%negTexts.length];let text=i%4===0?`Test note: ${txt}`:i%4===1?'\n```text\n'+txt+'\n```':i%4===2?`La prueba contiene ${txt}.`:`${txt}`;rows.push({id:`neg-${String(i+1).padStart(3,'0')}`,text,lang:i%4===2?'es':'en',expect:[],style:[i%4===1?'code_block':i%4===2?'spanish':'in_sentence','negative',why.replaceAll(' ','_')]});}
const out=rows.map(x=>JSON.stringify(x)).join('\n')+'\n';fs.writeFileSync(path.join(here,'examples.jsonl'),out);
console.log(`Wrote ${rows.length} examples (${rows.filter(x=>x.expect.length).length} positive, ${rows.filter(x=>!x.expect.length).length} negative), seed 0x4b1b1a5.`);


