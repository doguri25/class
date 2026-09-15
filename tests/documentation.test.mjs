import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildOutputs,renderMarkdown,publishDocs,DOCUMENTS} from '../scripts/publish-docs.mjs';

const prd=fs.readFileSync(new URL('../docs/PRD_v0.5.md',import.meta.url),'utf8');
test('PRD has 32 unique contracts, 12 invariants, 28 acceptance scenarios and 12 backlog packages',()=>{
 const check=(pattern,prefix,count)=>assert.deepEqual([...prd.matchAll(pattern)].map(m=>m[1]),Array.from({length:count},(_,i)=>prefix+String(i+1).padStart(2,'0')));
 check(/^### (R\d{2}) ·/gm,'R',32);check(/^\| (INV-\d{2}) \|/gm,'INV-',12);check(/^\| (T\d{2}) \|/gm,'T',28);check(/^\| (B\d{2}) /gm,'B',12);
});
test('every original AC01 through AC115 has exactly one traceability row',()=>{
 const section=prd.split('## 8. ')[1].split('## 9. ')[0],covered=[];
 for(const row of section.matchAll(/^\| AC(\d+)(?:–(?:AC)?(\d+))? \| ([^\n]+)\|$/gm)){
  const start=Number(row[1]),end=Number(row[2]||row[1]);assert.ok(end>=start);for(let n=start;n<=end;n++)covered.push(n);
  const refs=[...row[3].matchAll(/R(\d{2})/g)];assert.ok(refs.length);for(const ref of refs)assert.ok(Number(ref[1])>=1&&Number(ref[1])<=32);
 }
 assert.deepEqual(covered,Array.from({length:115},(_,i)=>i+1));
});
test('static document renderer escapes untrusted text, keeps headings and renders accessible tables',()=>{
 const {html,toc}=renderMarkdown('# 제목\n\n## <script>alert(1)</script>\n\n| 열 | 다른 열 |\n| --- | --- |\n| <img src=x onerror=alert(1)> | 안전 |\n\n- 항목\n\n1. 순서\n\n```\n<iframe>\n```');
 assert.ok(!html.includes('<script>')&&!html.includes('<img ')&&!html.includes('<iframe>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('scope="col"'));assert.ok(html.includes('tabindex="0"'));assert.ok(html.includes('<ol>'));assert.equal(toc.length,1);assert.ok(html.includes('id="'+toc[0].id+'"'));
});
test('published PRD and approved downloads match sources, versions and local navigation',()=>{
 assert.equal(publishDocs({check:true}),5);
 const outputs=buildOutputs(),html=outputs.get('dist/prd.html'),release=JSON.parse(fs.readFileSync(new URL('../docs/releases.json',import.meta.url)))[0];
 assert.ok(html.includes(release.version));assert.ok(html.includes(release.date));assert.ok(html.includes('<html lang="ko">'));
 const ids=[...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]));
 for(const name of DOCUMENTS)assert.ok(html.includes('href="./docs/'+name+'" download'));
 for(const m of html.matchAll(/href="\.\/([^"]+)"/g))assert.ok(fs.existsSync(new URL('../dist/'+m[1],import.meta.url)),m[1]);
 assert.ok(!html.includes('<script'));assert.ok(!html.includes('lang="ja"'));
});
