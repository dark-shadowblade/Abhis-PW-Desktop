(()=>{'use strict';
const API='/api/v1', B1='6a0eb0a7f33c042849418636', $=id=>document.getElementById(id);
const S={key:'',batch:null,saved:[],batches:[],subjects:[],chapters:[],contents:[],resources:[],type:'videos',screen:'home',subject:null,chapter:null,current:-1,stream:'',search:'',page:1,totalPages:1,queue:[],downloads:[],progress:{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ident=x=>String(x?._id||x?.id||x?.subjectId||x?.chapterId||x?.chapter_id||x?.contentId||x?.videoId||x?.batchId||x?.batch_id||'');
const name=x=>x?.name||x?.title||x?.topic||x?.subject||'Untitled';
const enc=encodeURIComponent;
function toast(m){$('toast').textContent=m;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),3200)}
function setScreen(screen){S.screen=screen;['home','all_batches','my_batches','subjects','chapters','contents','player','download_center','downloads','settings'].forEach(x=>{const e=$(x);if(e)e.classList.toggle('hidden',x!==screen)});document.querySelectorAll('[data-nav]').forEach(e=>e.classList.toggle('active',e.dataset.nav===screen));$('crumb').textContent=({home:'Study',all_batches:'All batches',my_batches:'My batches',subjects:'Subjects',chapters:'Chapters',contents:'Learning materials',player:'Now playing',download_center:'Downloader',downloads:'Downloads',settings:'Settings'})[screen]||'Study'}
function arr(v,keys=[]){if(Array.isArray(v))return v;if(!v||typeof v!=='object')return[];for(const k of keys)if(Array.isArray(v[k]))return v[k];for(const x of Object.values(v)){const a=arr(x,keys);if(a.length)return a}return[]}
function findUrl(x,keys=['streamUrl','stream_url','videoUrl','video_url','url','fileUrl','file_url','downloadUrl','pdfUrl','pdf_url']){if(typeof x==='string'&&/^https?:/i.test(x))return x;if(x&&typeof x==='object'){for(const k of keys)if(typeof x[k]==='string'&&/^https?:/i.test(x[k]))return x[k];for(const v of Object.values(x)){const u=findUrl(v,keys);if(u)return u}}return''}
async function api(path,key=S.key,unwrap=true){let last;for(let n=0;n<3;n++){try{const h={Accept:'application/json'};if(key)h['x-api-key']=key;const r=await fetch('/api/v1'+path,{headers:h});const t=await r.text();let j;try{j=t?JSON.parse(t):{}}catch{throw Error('Invalid API response ('+r.status+')')};if(!r.ok||j.success===false){const e=Error(j.message||'API error '+r.status);if((r.status===429||r.status>=500)&&n<2){last=e;await new Promise(ok=>setTimeout(ok,400*(n+1)));continue}throw e}return unwrap&&Object.hasOwn(j,'data')?j.data??j:j}catch(e){last=e;if(n===2)throw e;await new Promise(ok=>setTimeout(ok,400*(n+1)))}}throw last}
function connected(v){$('apiState').textContent=v?'● API connected':'● API not connected';$('apiState').classList.toggle('good',v)}
function saveKey(k){S.key=k;if($('apiKey'))$('apiKey').value=k;localStorage.setItem('abhi_pw_key',k);localStorage.setItem('abhi_pw_expiry',String(Date.now()+86400000));connected(true)}
function keyModal(show){$('keyModal').classList.toggle('hidden',!show)}
async function generateKey(){try{$('keyStatus').textContent='Generating key link…';const d=await api('/auth/generate?server=1','');const link=d?.keyUrl||d?.key_url||findUrl(d,['keyUrl','key_url']);if(!link)throw Error('The API did not return a key link');window.open(link,'_blank','noopener');$('keyStatus').textContent='Complete activation in the browser, then paste your API key here.'}catch(e){$('keyStatus').textContent=e.message}}
async function verifyKey(){const k=$('apiKey').value.trim();if(!k)return $('keyStatus').textContent='Enter an API key.';try{$('keyStatus').textContent='Checking API key…';let activeBatch=B1;try{const savedBatch=JSON.parse(localStorage.getItem('abhi_pw_active_batch')||'null');if(savedBatch?.id)activeBatch=savedBatch.id}catch{}try{await api('/batch/'+enc(activeBatch)+'/subject',k)}catch{const r=await api('/auth/activate?key='+enc(k),'',false);if(!r?.success)throw Error(r?.message||'Key activation failed');await api('/batch/'+enc(activeBatch)+'/subject',k)}saveKey(k);keyModal(false);toast('API key connected');await loadSubjects()}catch(e){$('keyStatus').textContent=e.message}}
function loadSaved(){try{S.saved=JSON.parse(localStorage.getItem('abhi_pw_saved_batches')||'[]')}catch{S.saved=[]}}
function saveSaved(){localStorage.setItem('abhi_pw_saved_batches',JSON.stringify(S.saved))}
function batchCard(b,small=false){return '<article class="batch" data-batch="'+esc(b.id)+'"><div class="cover">'+(b.image?'<img src="'+esc(b.image)+'">':'▤')+'</div><b>'+esc(b.name)+'</b><p>'+esc([b.language,b.className].filter(Boolean).join(' · ')||'Study batch')+'</p><div class="cardFoot"><span>Open batch →</span><button class="starBatch" data-save="'+esc(b.id)+'">'+(S.saved.some(x=>x.id===b.id)?'★ Saved':'☆ Save')+'</button></div></article>'}
function bindBatchCards(){document.querySelectorAll('[data-batch]').forEach(e=>e.onclick=()=>{const b=[...S.batches,...S.saved].find(x=>x.id===e.dataset.batch);if(b)openBatch(b)});document.querySelectorAll('[data-save]').forEach(e=>e.onclick=ev=>{ev.stopPropagation();const id=e.dataset.save;const b=[...S.batches,...S.saved].find(x=>x.id===id);if(!b)return;S.saved=S.saved.some(x=>x.id===id)?S.saved.filter(x=>x.id!==id):[...S.saved,b];saveSaved();renderHome();if(S.screen==='my_batches')renderMyBatches()})}
function hasBatchIdentity(x){return !!(x&&typeof x==='object'&&(x._id||x.id||x.batchId||x.batch_id||x.batchID))}
function extractBatchArray(value,depth=0,empty={value:null}){
 if(depth>8||value==null)return null;
 if(Array.isArray(value)){
  if(value.length&&value.some(hasBatchIdentity))return value;
  if(!value.length&&!empty.value)empty.value=value;
  for(const item of value){const found=extractBatchArray(item,depth+1,empty);if(found)return found}
  return null;
 }
 if(typeof value==='object'){
  for(const key of ['batches','batchList','batch_list','results','items','docs']){
   const nested=value[key];
   if(Array.isArray(nested)&&nested.some(hasBatchIdentity))return nested;
   const found=extractBatchArray(nested,depth+1,empty);if(found)return found;
  }
  for(const nested of Object.values(value)){const found=extractBatchArray(nested,depth+1,empty);if(found)return found}
 }
 return null;
}
function extractTotalPages(value,depth=0){
 if(depth>8||!value||typeof value!=='object')return 0;
 for(const [k,v] of Object.entries(value)){
  if(['totalpages','total_pages','totalpage','total_page','pages'].includes(k.toLowerCase())&&Number(v)>0)return Number(v);
  const found=extractTotalPages(v,depth+1);if(found)return found;
 }
 return 0;
}
function editDistance(a,b){
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){
  const current=[i+1];
  for(let j=0;j<b.length;j++)current[j+1]=Math.min(current[j]+1,previous[j+1]+1,previous[j]+(a[i]===b[j]?0:1));
  previous=current;
 }
 return previous[b.length];
}
function batchMatches(b,q){
 const normalize=s=>String(s||'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const searchable=normalize([b.name,b.language,b.className,b.id].join(' '));
 const query=normalize(q);
 if(!query)return true;
 if(searchable.includes(query))return true;
 const queryTokens=query.split(/\s+/).filter(Boolean);
 const nameTokens=searchable.split(/\s+/).filter(Boolean);
 return queryTokens.every(token=>nameTokens.some(candidate=>
  candidate===token||candidate.startsWith(token)||token.startsWith(candidate)||
  (token.length>=5&&candidate.length>=5&&editDistance(token,candidate)<=(token.length>=8?2:1))||
  (token.length>=7&&candidate.length>=7&&editDistance(token,candidate)<=2)
 ));
}
function findBatchImage(value,depth=0){
 if(depth>5||value==null)return '';
 if(typeof value==='string')return /^https?:\/\//i.test(value.trim())?value.trim():'';
 if(Array.isArray(value)){for(const item of value){const found=findBatchImage(item,depth+1);if(found)return found}return ''}
 if(typeof value==='object'){
  const preferred=['previewImage','thumbnail','thumbnailurl','thumbnail_url','thumb','thumburl','thumb_url','image','imageurl','image_url','coverimage','cover_image','cover','banner','bannerimage','banner_image','batchimage','batch_image','logo','photo','photourl','photo_url','poster','avatar','picture'];
  for(const key of preferred){const actual=Object.keys(value).find(k=>k.toLowerCase()===key);if(actual){const found=findBatchImage(value[actual],depth+1);if(found)return found}}
  for(const nested of Object.values(value)){const found=findBatchImage(nested,depth+1);if(found)return found}
 }
 return '';
}
function normalizeBatchResponse(d){
 const raw=extractBatchArray(d)||[];
 return raw.map(x=>({
  id:String(x._id||x.id||x.batchId||x.batch_id||''),
  name:x.name||x.title||x.batchName||'Unnamed batch',
  image:findBatchImage(x),
  language:x.lang||x.language||'',
  className:x.class||x.className||''
 })).filter(x=>x.id);
}
async function searchBatches(reset=true){
 if(!S.key)return keyModal(true);
 if(reset){S.page=0;S.batches=[];S.totalPages=50}
 const q=$('batchSearch')?.value.trim()||'';
 $('allBatchList').innerHTML='<div class="empty">Searching batches…</div>';
 try{
  const start=S.page+1;
  let reported=S.totalPages||50, scanned=0, found=[];
  let next=start;
  while(next<=reported&&scanned<8){
   const groupEnd=Math.min(next+1,reported,start+(q?reported:8)-1);
   const pages=await Promise.all(Array.from({length:groupEnd-next+1},(_,i)=>next+i).map(async p=>{
    const searchUrl='/batch/search/v2?cohortId=635b83410a47c70011ca5ffb&exam=UPSC&page='+p+(q?'&keyword='+enc(q):'');
    const d=await api(searchUrl,S.key,false);
    return {page:p,data:d,items:normalizeBatchResponse(d),total:extractTotalPages(d)};
   }));
   let stop=false;
   for(const result of pages.sort((a,b)=>a.page-b.page)){
    if(result.total)reported=result.total;
    scanned++;
    if(!result.items.length){next=result.page+1;stop=true;break}
    const ids=new Set(S.batches.map(x=>x.id));
    if(result.items.every(x=>ids.has(x.id))){next=result.page+1;stop=true;break}
    found.push(...result.items.filter(x=>batchMatches(x,q)));
    next=result.page+1;
   }
   if(stop)break;
   next=groupEnd+1;
  }
  const seen=new Set(S.batches.map(x=>x.id));
  S.batches=[...S.batches,...found.filter(x=>!seen.has(x.id)&&seen.add(x.id))];
  S.page=Math.max(S.page,next-1);
  S.totalPages=reported||S.page;
  $('allBatchList').innerHTML=S.batches.length?S.batches.map(b=>batchCard(b)).join(''):'<div class="empty">No matching batches found. Try a shorter search.</div>';
  bindBatchCards();
  $('batchPageInfo').textContent='Scanned '+S.page+' / '+S.totalPages+' pages'+(q?' · filtered results':'');
  $('nextBatchPage').disabled=S.page>=S.totalPages;
  $('prevBatchPage').disabled=S.page===0;
 }catch(e){$('allBatchList').innerHTML='<div class="empty">'+esc(e.message)+'</div>'}
}
function renderHome(){const active=S.batch;const last=JSON.parse(localStorage.getItem('abhi_pw_last_lesson')||'null'); $('activeBatchName').textContent=active?.name||'Choose a batch';$('homeSavedCount').textContent=S.saved.length+' saved batches';$('homeSubjectArea').innerHTML=active?'<button class="primary" id="continueBatch">Continue studying '+esc(active.name)+' →</button>':'<div class="empty">Add a batch to get started. Search All batches or add a batch ID.</div>';if($('continueBatch'))$('continueBatch').onclick=()=>loadSubjects();if(last){$('homeSubjectArea').innerHTML+='<button class="soft resumeLast" id="resumeLast">▶ Resume: '+esc(last.title||'Last lesson')+'</button>';$('resumeLast').onclick=resumeLastStudy;}$('homeBatchGrid').innerHTML=S.saved.length?S.saved.slice(0,4).map(b=>batchCard(b)).join(''):'<div class="empty">Your saved batches will appear here.</div>';bindBatchCards()}
async function openBatch(b){S.batch=b;localStorage.setItem('abhi_pw_active_batch',JSON.stringify(b));S.subject=null;S.chapter=null;setScreen('subjects');$('subjectTitle').textContent=b.name;$('subjectsList').innerHTML='<div class="empty">Loading subjects…</div>';await loadSubjects()}
async function loadSubjects(){if(!S.key)return keyModal(true);if(!S.batch){try{S.batch=JSON.parse(localStorage.getItem('abhi_pw_active_batch')||'null')}catch{} }if(!S.batch){toast('Choose a batch first');setScreen('all_batches');return}setScreen('subjects');$('subjectTitle').textContent=S.batch.name;$('subjectsList').innerHTML='<div class="empty">Loading subjects…</div>';try{const d=await api('/batch/'+S.batch.id+'/subject');S.subjects=arr(d,['subjects','data','items']).map(x=>({id:ident(x),title:name(x),raw:x})).filter(x=>x.id);renderSubjects()}catch(e){$('subjectsList').innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
function renderSubjects(){const stars=JSON.parse(localStorage.getItem('abhi_pw_stars_'+S.batch.id)||'[]');$('subjectsList').innerHTML=S.subjects.length?S.subjects.map((x,i)=>'<div class="item"><span class="itemIcon">▤</span><span class="itemMain"><b>'+esc(x.title)+'</b><small>Subject</small></span><button class="star" data-star="'+i+'">'+(stars.includes(x.id)?'★':'☆')+'</button><button class="openItem" data-sub="'+i+'">Open →</button></div>').join(''):'<div class="empty">No subjects found.</div>';document.querySelectorAll('[data-sub]').forEach(e=>e.onclick=()=>openSubject(S.subjects[+e.dataset.sub]));document.querySelectorAll('[data-star]').forEach(e=>e.onclick=()=>{const i=+e.dataset.star,id=S.subjects[i].id;const a=JSON.parse(localStorage.getItem('abhi_pw_stars_'+S.batch.id)||'[]');localStorage.setItem('abhi_pw_stars_'+S.batch.id,JSON.stringify(a.includes(id)?a.filter(x=>x!==id):[...a,id]));renderSubjects()})}
async function openSubject(x){S.subject=x;setScreen('chapters');$('chapterTitle').textContent=x.title;$('chaptersList').innerHTML='<div class="empty">Loading chapters…</div>';try{const d=await api('/batch/'+S.batch.id+'/subject/'+enc(x.id)+'/chapter');S.chapters=arr(d,['chapters','data','items']).map(v=>({id:ident(v),title:name(v),raw:v})).filter(v=>v.id);$('chaptersList').innerHTML=S.chapters.length?S.chapters.map((c,i)=>'<div class="item" data-ch="'+i+'"><span class="itemIcon">▣</span><span class="itemMain"><b>'+esc(c.title)+'</b><small>Chapter</small></span><span>›</span></div>').join(''):'<div class="empty">No chapters found.</div>';document.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>openChapter(S.chapters[+e.dataset.ch]))}catch(e){$('chaptersList').innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
const TYPES=[['videos','Lectures'],['notes','Notes'],['DppNotes','DPP notes'],['DppVideos','DPP videos']];
async function openChapter(c,type=S.type){S.chapter=c;S.type=type;setScreen('contents');$('contentTitle').textContent=c.title;await loadContents(type)}
async function loadContents(type){S.type=type;$('contentTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset-type===type));$('contentsList').innerHTML='<div class="empty">Loading '+esc(type)+'…</div>';try{const d=await api('/batch/'+S.batch.id+'/subject/'+enc(S.subject.id)+'/chapter/'+enc(S.chapter.id)+'/content?type='+enc(type));S.contents=arr(d,['contents','content','videos','notes','items','data']).map(x=>({id:ident(x),title:name(x),raw:x})).filter(x=>x.id);renderContents()}catch(e){$('contentsList').innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
function cat(){return ({videos:'Lectures',notes:'Notes',DppNotes:'DPP',DppVideos:'DPP Videos'})[S.type]||'Lectures'}
function itemKey(x){return [S.batch?.id,S.subject?.id,S.chapter?.id,x.id].join(':')}
function renderContents(){$('contentsList').innerHTML=S.contents.length?S.contents.map((x,i)=>{const video=S.type==='videos'||S.type==='DppVideos';const done=S.downloads.some(d=>d.itemKey===itemKey(x));return '<div class="item"><span class="itemIcon">'+(video?'▶':'PDF')+'</span><span class="itemMain"><b>'+esc(x.title)+'</b><small>'+(video?'Video lecture':cat())+(done?' · Downloaded':'')+'</small></span><button class="soft" data-download="'+i+'">↓</button><button class="openItem" data-open="'+i+'">'+(video?'Play':'Open PDF')+'</button></div>'}).join(''):'<div class="empty">No learning material found for this category.</div>';document.querySelectorAll('[data-open]').forEach(e=>e.onclick=()=>{const x=S.contents[+e.dataset.open];if(S.type==='videos'||S.type==='DppVideos')playLecture(+e.dataset.open);else openResource(x)});document.querySelectorAll('[data-download]').forEach(e=>e.onclick=()=>downloadItem(S.contents[+e.dataset.download]))}
async function getDetail(x){return await api('/batch/'+S.batch.id+'/subject/'+enc(S.subject.id)+'/chapter/'+enc(S.chapter.id)+'/content/'+enc(x.id))}
async function playLecture(index){const x=S.contents[index];if(!x)return;S.current=index;localStorage.setItem('abhi_pw_last_lesson',JSON.stringify({batch:S.batch,subject:S.subject,chapter:S.chapter,itemId:x.id,title:x.title,type:S.type}));setScreen('player');$('playingTitle').textContent=x.title;$('playingSub').textContent=S.chapter.title;$('playerStatus').textContent='Preparing video…';$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').classList.remove('hidden');$('playerPlaceholder').classList.remove('hidden');try{const d=await getDetail(x);S.stream=findUrl(d);if(!S.stream)throw Error('No video stream URL returned by the API');$('video').src='/video?url='+enc(S.stream);$('video').load();$('video').playbackRate=Number($('playbackSpeed').value||1);$('playerPlaceholder').classList.add('hidden');$('playerStatus').textContent='Ready';const savedProgress=JSON.parse(localStorage.getItem('abhi_pw_video_progress')||'{}');const resumeAt=Number(savedProgress[itemKey(x)]||0);if(resumeAt>5)$('video').currentTime=resumeAt;$('video').play().catch(()=>{});loadLectureResources()}catch(e){$('playerStatus').textContent=e.message;toast(e.message)}renderPlayerQueue()}
function lectureNumber(title){
 let m=String(title||'').match(/\b(?:lecture|lec)\s*0*(\d+)/i);
 if(m)return Number(m[1]);
 m=String(title||'').match(/(?<!\d)0*(\d+)\s*:/);
 return m?Number(m[1]):null;
}
function resourceMatchesLecture(title,no){
 const patterns=[/\bof\s+(?:lecture|lec)\s*0*(\d+)/i,/\b(?:lecture|lec)\s*0*(\d+)/i,/\b0*(\d+)\s*:\s*(?:daily\s+class\s+notes|class\s+notes)\b/i,/\bMains\s+Questions?\s*0*(\d+)/i,/\bDPP\s+of\s+Lec\s*0*(\d+)/i];
 for(const p of patterns){const m=String(title||'').match(p);if(m)return Number(m[1])===no}
 return false;
}
async function loadLectureResources(){
 const x=S.contents[S.current];if(!x)return;
 const no=lectureNumber(x.title);
 const base='/batch/'+S.batch.id+'/subject/'+enc(S.subject.id)+'/chapter/'+enc(S.chapter.id)+'/content';
 $('playerResources').innerHTML='<p>Finding linked notes and DPP…</p>';
 try{
  const [n,d]=await Promise.all([api(base+'?type=notes'),api(base+'?type=DppNotes')]);
  const notes=arr(n,['contents','notes','items','data']);
  const dpps=arr(d,['contents','notes','items','data']);
  const all=[...notes.map(v=>({...v,_kind:'Notes'})),...dpps.map(v=>({...v,_kind:'DPP'}))];
  S.resources=no===null?all:all.filter(v=>resourceMatchesLecture(name(v),no));
  $('playerResources').innerHTML=S.resources.length?S.resources.map((r,i)=>'<div class="resource"><b>'+esc(name(r))+'</b><span>'+esc(r._kind)+'</span><button data-pr="'+i+'">Open</button><button data-prd="'+i+'">↓</button></div>').join(''):'<p>No linked resources found for '+(no===null?'this chapter':'Lecture '+no)+'. Check the Notes and DPP tabs for all chapter materials.</p>';
  document.querySelectorAll('[data-pr]').forEach(e=>e.onclick=()=>openResource(S.resources[+e.dataset.pr]));
  document.querySelectorAll('[data-prd]').forEach(e=>e.onclick=()=>downloadItem({id:ident(S.resources[+e.dataset.prd]),title:name(S.resources[+e.dataset.prd]),raw:S.resources[+e.dataset.prd]},S.resources[+e.dataset.prd]._kind,false));
 }catch(e){$('playerResources').innerHTML='<p>Could not load linked resources: '+esc(e.message)+'</p>'}
}
function openResource(x){
 const u=x.raw?.baseUrl||findUrl(x);
 if(!u)return toast('No PDF URL found');
 // Open external resource URLs in the system browser in Electron; on Pages
 // this falls back to a normal browser tab.
 if(window.studyDownloads)window.open(u,'_blank','noopener');
 else window.open(u,'_blank','noopener');
}
function renderPlayerQueue(){const x=S.contents[S.current];$('prevVideo').disabled=S.current>=S.contents.length-1;$('nextVideo').disabled=S.current<=0;$('playerPosition').textContent=(S.current+1)+' / '+S.contents.length;$('queueTitle').textContent=S.chapter?.title||'Lectures';$('playerQueue').innerHTML=S.contents.map((v,i)=>'<div class="lecture '+(i===S.current?'selected':'')+'" data-q="'+i+'"><span class="lectureNo">'+(i+1)+'</span><span><b>'+esc(v.title)+'</b><small>'+((i===S.current)?'Now playing':'Video lecture')+'</small></span></div>').join('');document.querySelectorAll('[data-q]').forEach(e=>e.onclick=()=>playLecture(+e.dataset.q))}
async function downloadItem(x,categoryOverride='',videoOverride=null){const video=videoOverride===null?(S.type==='videos'||S.type==='DppVideos'):videoOverride;const category=categoryOverride||cat();let source=x.raw?.baseUrl||findUrl(x);try{if(video){const d=await getDetail(x);source=findUrl(d)}if(!source)throw Error('No download URL found');const filename=(x.title||'Study material').replace(/[\\/:*?"<>|]/g,'_')+(video?'.mp4':'.pdf');const task={id:Date.now()+Math.random(),title:x.title,category,filename,source,video,itemKey:itemKey(x),status:'Queued',progress:0};S.queue.push(task);saveQueue();renderQueue();processQueue()}catch(e){toast(e.message)}}
function saveQueue(){localStorage.setItem('abhi_pw_queue',JSON.stringify(S.queue));localStorage.setItem('abhi_pw_downloads',JSON.stringify(S.downloads))}
async function processQueue(){
 if(!window.studyDownloads){toast('Desktop download service is unavailable');return}
 const limit=Number(localStorage.getItem('abhi_pw_parallel')||3);
 const active=S.queue.filter(t=>['Starting','Downloading'].includes(t.status)).length;
 const waiting=S.queue.filter(t=>t.status==='Queued');
 for(const task of waiting.slice(0,Math.max(0,limit-active))){
  task.status='Starting';saveQueue();renderQueue();
  // Electron's downloadURL requires an absolute URL. Video downloads must go
  // through the bundled local range-proxy, not a relative /download path.
  const url=task.video
   ?'http://127.0.0.1:4173/download?url='+enc(task.source)+'&filename='+enc(task.filename)
   :task.source;
  try{await window.studyDownloads.start({id:String(task.id),url,filename:task.filename});task.status='Downloading'}
  catch(e){task.status='Failed: '+(e.message||'Could not start');}
 }
 saveQueue();renderQueue();
}
function onDownloadProgress(data){
 const task=S.queue.find(t=>String(t.id)===String(data.id));if(!task)return;
 task.status=data.state==='progress'?'Downloading':task.status;
 task.received=data.received||0;task.total=data.total||0;
 task.progress=task.total?Math.min(99,Math.floor(task.received*100/task.total)):0;
 renderQueue();saveQueue();
}
function onDownloadDone(data){
 const i=S.queue.findIndex(t=>String(t.id)===String(data.id));if(i<0)return;
 const [task]=S.queue.splice(i,1);
 if(data.state==='completed'){
  task.status='Completed';task.progress=100;task.bytes=data.received||data.total||0;task.completed=Date.now();task.savedPath=data.path||'';
  S.downloads.unshift(task);toast('Downloaded: '+task.title);
 }else{task.status='Failed';toast('Download failed: '+task.title+' ('+(data.error||data.state)+')')}
 saveQueue();renderQueue();renderDownloads();processQueue();
}
function renderQueue(){
 $('queueList').innerHTML=S.queue.length?S.queue.map(t=>{
  const progress=Number(t.progress||0),active=['Starting','Downloading','Paused'].includes(t.status);
  return '<div class="queueItem"><div class="queueInfo"><b>'+esc(t.title)+'</b><small>'+esc(t.category)+' · '+esc(t.status)+(t.total?' · '+Math.round((t.received||0)/1048576)+' / '+Math.round(t.total/1048576)+' MB':'')+'</small><div class="downloadTrack"><i style="width:'+progress+'%"></i></div></div><span class="downloadPercent">'+progress+'%</span>'+(t.status==='Paused'?'<button data-qresume="'+esc(t.id)+'">Resume</button>':active?'<button data-qpause="'+esc(t.id)+'">Pause</button>':'')+'<button data-qcancel="'+esc(t.id)+'">×</button></div>';
 }).join(''):'<div class="empty">No active downloads.</div>';
 document.querySelectorAll('[data-qcancel]').forEach(e=>e.onclick=()=>{const id=e.dataset.qcancel;window.studyDownloads?.cancel(id);S.queue=S.queue.filter(t=>String(t.id)!==id);saveQueue();renderQueue();processQueue()});
 document.querySelectorAll('[data-qpause]').forEach(e=>e.onclick=async()=>{await window.studyDownloads?.pause(e.dataset.qpause);const t=S.queue.find(x=>String(x.id)===e.dataset.qpause);if(t)t.status='Paused';saveQueue();renderQueue();processQueue()});
 document.querySelectorAll('[data-qresume]').forEach(e=>e.onclick=async()=>{await window.studyDownloads?.resume(e.dataset.qresume);const t=S.queue.find(x=>String(x.id)===e.dataset.qresume);if(t)t.status='Downloading';saveQueue();renderQueue()});
 $('downloadCount').textContent=S.queue.length+' active';
}
function renderDownloads(){$('downloadHistory').innerHTML=S.downloads.length?S.downloads.map(d=>'<div class="item"><span class="itemIcon">'+(d.video?'▶':'PDF')+'</span><span class="itemMain"><b>'+esc(d.title)+'</b><small>'+esc(d.category)+' · '+(d.bytes?Math.round(d.bytes/1048576)+' MB':'Saved')+'</small></span><button class="soft" data-redownload="'+esc(d.id)+'">Download again</button></div>').join(''):'<div class="empty">No completed downloads recorded yet. Downloaded files are saved through your browser.</div>';document.querySelectorAll('[data-redownload]').forEach(e=>{const d=S.downloads.find(x=>String(x.id)===e.dataset.redownload);e.onclick=()=>{S.queue.push({...d,id:Date.now()+Math.random(),status:'Queued',progress:0,received:0,total:0});saveQueue();renderQueue();processQueue()}})}
function renderMyBatches(){$('myBatchList').innerHTML=S.saved.length?S.saved.map(b=>batchCard(b)).join(''):'<div class="empty">No saved batches. Find one in All batches.</div>';bindBatchCards()}
async function resumeLastStudy(){const last=JSON.parse(localStorage.getItem('abhi_pw_last_lesson')||'null');if(!last)return;try{S.batch=last.batch;localStorage.setItem('abhi_pw_active_batch',JSON.stringify(S.batch));await loadSubjects();const sub=S.subjects.find(x=>x.id===last.subject.id);if(!sub)throw Error('Saved subject is no longer available');await openSubject(sub);const ch=S.chapters.find(x=>x.id===last.chapter.id);if(!ch)throw Error('Saved chapter is no longer available');await openChapter(ch,last.type||'videos');const index=S.contents.findIndex(x=>x.id===last.itemId);if(index<0)throw Error('Saved lecture is no longer available');await playLecture(index)}catch(e){toast('Could not resume: '+e.message)}}
function back(){if(S.screen==='player')setScreen('contents');else if(S.screen==='contents')setScreen('chapters');else if(S.screen==='chapters')setScreen('subjects');else setScreen('home')}
document.querySelectorAll('[data-nav]').forEach(e=>e.onclick=()=>{const s=e.dataset.nav;setScreen(s);if(s==='home')renderHome();if(s==='all_batches')searchBatches();if(s==='my_batches')renderMyBatches();if(s==='downloads')renderDownloads();if(s==='download_center')renderQueue()});
$('settingsBtn').onclick=$('keyBtn').onclick=()=>setScreen('settings');$('openSettings').onclick=()=>{keyModal(false);setScreen('settings')};$('generate').onclick=generateKey;$('verify').onclick=verifyKey;$('backBtn').onclick=back;$('findBatches').onclick=()=>searchBatches();$('batchSearch').onkeydown=e=>{if(e.key==='Enter')searchBatches()};$('nextBatchPage').onclick=()=>{if(S.page<S.totalPages){S.page++;searchBatches(false)}};$('prevBatchPage').onclick=()=>{if(S.page>1){S.page--;searchBatches(false)}};$('addBatch').onclick=()=>{const id=$('manualBatchId').value.trim();if(!id)return;const b={id,name:'Batch '+id};S.saved=[...S.saved.filter(x=>x.id!==id),b];saveSaved();$('manualBatchId').value='';renderMyBatches();toast('Batch added')};$('refreshSubjects').onclick=loadSubjects;$('contentTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>loadContents(b.dataset.type));$('prevVideo').onclick=()=>playLecture(S.current+1);$('nextVideo').onclick=()=>playLecture(S.current-1);$('playbackSpeed').onchange=e=>{video.playbackRate=Number(e.target.value)};const video=$('video'),playerBox=document.querySelector('.video');
function fmtTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';const s=Math.floor(seconds);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
let hudTimer=null;
function revealPlayerHud(){
 playerBox.classList.add('showHud');clearTimeout(hudTimer);
 if(!video.paused)hudTimer=setTimeout(()=>playerBox.classList.remove('showHud'),4500);
}
playerBox.addEventListener('mousemove',revealPlayerHud);
video.addEventListener('click',()=>{if(playerBox.classList.contains('showHud')&&!video.paused)playerBox.classList.remove('showHud');else revealPlayerHud()});
video.addEventListener('dblclick',e=>{const r=video.getBoundingClientRect();video.currentTime=Math.max(0,Math.min(video.duration||Infinity,video.currentTime+(e.clientX<r.left+r.width/2?-10:10)));revealPlayerHud();e.preventDefault()});
video.addEventListener('play',revealPlayerHud);
video.addEventListener('pause',()=>{clearTimeout(hudTimer);playerBox.classList.add('showHud')});
document.addEventListener('keydown',e=>{
 if(S.screen!=='player'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.code==='Space'){e.preventDefault();video.paused?video.play().catch(()=>{}):video.pause()}
 else if(e.key==='ArrowLeft')video.currentTime=Math.max(0,video.currentTime-10);
 else if(e.key==='ArrowRight')video.currentTime=Math.min(video.duration||Infinity,video.currentTime+10);
 else if(e.key.toLowerCase()==='f')$('fullScreen').click();
 revealPlayerHud();
});
function syncPlayerUI(){
 const duration=Number.isFinite(video.duration)?video.duration:0;
 $('seekBar').max=duration||0;$('seekBar').value=video.currentTime||0;
 $('timeCurrent').textContent=fmtTime(video.currentTime);$('timeDuration').textContent=fmtTime(duration);
 $('togglePlay').textContent=video.paused?'▶':'Ⅱ';$('centerPlay').textContent=video.paused?'▶':'Ⅱ';
 $('muteToggle').textContent=(video.muted||video.volume===0)?'🔇':'🔊';
 $('volumeBar').value=video.muted?0:video.volume;
 playerBox.classList.toggle('playing',!video.paused);playerBox.classList.toggle('paused',video.paused);playerBox.classList.toggle('paused',video.paused);
}
video.addEventListener('timeupdate',()=>{syncPlayerUI();if(S.current>=0&&S.contents[S.current]){const p=JSON.parse(localStorage.getItem('abhi_pw_video_progress')||'{}');p[itemKey(S.contents[S.current])] = video.currentTime;localStorage.setItem('abhi_pw_video_progress',JSON.stringify(p))}});
['loadedmetadata','durationchange','play','pause','volumechange','waiting','canplay'].forEach(ev=>video.addEventListener(ev,syncPlayerUI));
$('togglePlay').onclick=$('centerPlay').onclick=()=>video.paused?video.play().catch(()=>{}):video.pause();
$('seekBack').onclick=()=>video.currentTime=Math.max(0,video.currentTime-10);
$('seekForward').onclick=()=>video.currentTime=Math.min(video.duration||Infinity,video.currentTime+10);
$('seekBar').oninput=e=>{if(Number.isFinite(video.duration))video.currentTime=Number(e.target.value)};
$('volumeBar').oninput=e=>{video.volume=Number(e.target.value);video.muted=video.volume===0};
$('muteToggle').onclick=()=>{video.muted=!video.muted;syncPlayerUI()};
$('fullScreen').onclick=()=>{if(!document.fullscreenElement)playerBox.requestFullscreen?.();else document.exitFullscreen?.()};
syncPlayerUI();
$('downloadCurrent').onclick=()=>{const x=S.contents[S.current];if(x)downloadItem(x)};$('clearQueue').onclick=()=>{S.queue.forEach(t=>window.studyDownloads?.cancel(String(t.id)));S.queue=[];saveQueue();renderQueue()};$('parallelLimit').value=String(Number(localStorage.getItem('abhi_pw_parallel')||3));$('parallelLimit').onchange=e=>localStorage.setItem('abhi_pw_parallel',String(Math.max(1,Math.min(5,Number(e.target.value)))));$('refreshDownloads').onclick=renderDownloads;$('clearApiKey').onclick=()=>{S.key='';localStorage.removeItem('abhi_pw_key');localStorage.removeItem('abhi_pw_expiry');connected(false);$('apiKey').value='';$('keyStatus').textContent='Saved API key cleared.';toast('API key cleared')};$('clearHistory').onclick=()=>{S.downloads=[];saveQueue();renderDownloads()};
loadSaved();try{S.queue=JSON.parse(localStorage.getItem('abhi_pw_queue')||'[]');S.downloads=JSON.parse(localStorage.getItem('abhi_pw_downloads')||'[]');S.queue.forEach(t=>{if(['Starting','Downloading','Paused'].includes(t.status))t.status='Queued'})}catch{}renderQueue();
if(window.studyDownloads){window.studyDownloads.onProgress(onDownloadProgress);window.studyDownloads.onDone(onDownloadDone);}
const saved=localStorage.getItem('abhi_pw_key'),expiry=Number(localStorage.getItem('abhi_pw_expiry')||0);if(saved&&expiry>Date.now()){S.key=saved;if($('apiKey'))$('apiKey').value=saved;connected(true);try{S.batch=JSON.parse(localStorage.getItem('abhi_pw_active_batch')||'null')}catch{}renderHome()}else{localStorage.removeItem('abhi_pw_key');localStorage.removeItem('abhi_pw_expiry');connected(false);keyModal(true)}
})();