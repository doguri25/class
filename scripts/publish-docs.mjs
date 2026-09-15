// Deterministic publication of approved project documents; never reads player saves.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const DOCUMENTS=['PRD_v0.5.md','PRD_v0.4.md','BETA_SCOPE.md','DEVELOPMENT.md'];
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

// Deliberately small, escaped Markdown subset used by this authored PRD.
// Raw HTML, script, external embeds and executable URLs are never interpreted.
export function renderMarkdown(markdown){
 const lines=markdown.replace(/\r\n/g,'\n').split('\n'),out=[],toc=[];
 let i=0,heading=0;
 const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
 const separator=line=>/^\s*\|?\s*:?-{3,}/.test(line||'');
 const special=line=>!line.trim()||/^#{1,6} |^[-*] |^\d+\. |^```/.test(line)||line.trim().startsWith('|');
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){i++;continue;}
  const h=/^(#{1,6}) (.+)$/.exec(line);
  if(h){const level=h[1].length,id='section-'+(++heading);out.push(`<h${level} id="${id}">${escape(h[2])}</h${level}>`);if(level===2)toc.push({id,title:h[2]});i++;continue;}
  if(line.startsWith('```')){const body=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))body.push(lines[i++]);if(i<lines.length)i++;out.push('<pre><code>'+escape(body.join('\n'))+'</code></pre>');continue;}
  if(line.trim().startsWith('|')&&separator(lines[i+1])){
   const headers=cells(line),rows=[];i+=2;
   while(i<lines.length&&lines[i].trim().startsWith('|'))rows.push(cells(lines[i++]));
   out.push('<div class="table-scroll" role="region" tabindex="0" aria-label="표 · 가로로 이동하여 전체 내용 보기"><table><thead><tr>'+headers.map(c=>'<th scope="col">'+escape(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+escape(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue;
  }
  if(/^[-*] |^\d+\. /.test(line)){
   const ordered=/^\d+\. /.test(line),re=ordered?/^\d+\. /:/^[-*] /,items=[];
   while(i<lines.length&&re.test(lines[i]))items.push(lines[i++].replace(re,''));
   const tag=ordered?'ol':'ul';out.push('<'+tag+'>'+items.map(t=>'<li>'+escape(t)+'</li>').join('')+'</'+tag+'>');continue;
  }
  const paragraph=[line];i++;while(i<lines.length&&!special(lines[i]))paragraph.push(lines[i++]);out.push('<p>'+escape(paragraph.join(' '))+'</p>');
 }
 return {html:out.join('\n'),toc};
}

export function buildOutputs(root=ROOT){
 const outputs=new Map(),release=JSON.parse(fs.readFileSync(path.join(root,'docs/releases.json'),'utf8'))[0];
 for(const name of DOCUMENTS)outputs.set('dist/docs/'+name,fs.readFileSync(path.join(root,'docs',name),'utf8'));
 const rendered=renderMarkdown(outputs.get('dist/docs/PRD_v0.5.md'));
 const nav=DOCUMENTS.map((name,i)=>`<a href="./docs/${name}" download>${['최신 PRD 내려받기','원안 v0.4','구현·검증 범위','개발·배포 안내'][i]}</a>`).join('');
 outputs.set('dist/prd.html',`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>PRD v0.5 · 교실 타이쿤</title>
<style>
:root{font-family:system-ui,-apple-system,sans-serif;color:#243e32;background:#eceee6;line-height:1.85;font-size:17px}*{box-sizing:border-box}body{margin:0}a{color:#245c59;text-underline-offset:3px}a:focus-visible,summary:focus-visible,.table-scroll:focus-visible{outline:3px solid #a46128;outline-offset:4px}header,main,footer{max-width:1080px;margin:auto;padding:28px 32px}header{padding-bottom:0}.eyebrow{font-size:12px;letter-spacing:.12em}.downloads{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.downloads a,.back{display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;border:1px solid #9dac9f;border-radius:8px;background:#f9f8f1;font-size:15px}.status{padding:16px 20px;border-left:4px solid #637f6b;background:#e1e6db;border-radius:4px}details{padding:16px 20px;border:1px solid #b9c7b9;border-radius:10px;background:#f9f8f1}summary{cursor:pointer;min-height:44px;display:list-item;padding:7px}nav li{margin:6px 0}article{background:#faf9f3;border:1px solid #c4ccbe;border-radius:12px;padding:32px;overflow-wrap:anywhere}h1{font-size:30px;line-height:1.4;margin-top:0}h2{font-size:24px;line-height:1.5;margin:42px 0 16px;padding-top:16px;border-top:1px solid #c8d2c3}h3{font-size:20px;margin:28px 0 12px}p,ul,ol{margin:14px 0}li{margin:8px 0}h1,h2,h3{scroll-margin-top:20px}.table-scroll{max-width:100%;overflow:auto;margin:20px 0;border:1px solid #b9c7b9;border-radius:7px}table{width:100%;border-collapse:collapse;font-size:15px;line-height:1.7}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #c7d0c2;min-width:140px}th{background:#dce5d8;color:#253d2e}tbody tr:nth-child(even){background:#eef1e8}pre{overflow:auto;background:#e4e9df;padding:18px;border-radius:8px}footer{font-size:14px}@media(max-width:600px){:root{font-size:16px}header,main,footer{padding:18px 14px}header{padding-bottom:0}article{padding:22px 16px}h1{font-size:25px}h2{font-size:22px}h3{font-size:19px}th,td{padding:10px;min-width:132px}.downloads{gap:8px}.downloads a{flex:1 1 44%;justify-content:center;text-align:center}nav ul{padding-left:20px}}@media print{body{background:white}header,footer,.downloads,details{display:none}main{padding:0;max-width:none}article{border:0;padding:0}.table-scroll{overflow:visible}th,td{min-width:0;font-size:10pt}h2,h3{break-after:avoid}}
</style></head><body><header><a class="back" href="./">← 게임으로 돌아가기</a><p class="eyebrow">CLASSROOM DAYS / PRODUCT REQUIREMENTS</p><p class="status">PRD v0.5 · ${escape(release.version)} · ${escape(release.date)}<br>실행 계약 32개 · 인수 시나리오 28개 · 기존 115개 기준 연결<br>요구사항과 구현·검수 상태를 구분합니다.</p><div class="downloads">${nav}</div><details><summary>목차 — 원하는 기능으로 이동</summary><nav aria-label="PRD 목차"><ul>${rendered.toc.map(x=>`<li><a href="#${x.id}">${escape(x.title)}</a></li>`).join('')}</ul></nav></details></header><main><article>${rendered.html}</article></main><footer><a href="./beta-notes.html">베타 제작 기록</a> · 만든이: 도구리 · 홍북초등학교 · <a href="mailto:raccoon@ai.cne.go.kr">raccoon@ai.cne.go.kr</a></footer></body></html>
`);
 return outputs;
}

export function publishDocs({root=ROOT,check=false}={}){
 const outputs=buildOutputs(root),mismatches=[];
 for(const [relative,content] of outputs){const file=path.join(root,relative);if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)mismatches.push(relative);}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}}
 if(mismatches.length)throw Error('Document outputs are stale: '+mismatches.join(', '));
 return outputs.size;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.some(a=>a!=='--check'))throw Error('Usage: node scripts/publish-docs.mjs [--check]');
 const check=args.includes('--check');console.log(`${publishDocs({check})} document outputs ${check?'verified':'generated'}`);
}
