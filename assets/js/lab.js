/* Browser demonstrations: modeled interleaving and real Web Crypto digests. */
((global)=>{
  'use strict';
  function raceEvents(mode, count, initial='available') {
    const n=[2,5,25].includes(Number(count))?Number(count):2;
    const state=['available','expired','revoked'].includes(initial)?initial:'available';
    const events=[];
    if(mode==='unsafe') {
      for(let i=1;i<=n;i++) events.push({reader:i,action:'read',success:false,state,detail:state==='available'?'Read available; remembers permission.':`Read ${state}; access denied.`});
      if(state==='available') for(let i=1;i<=n;i++) events.push({reader:i,action:'deliver',success:true,state:'consumed',detail:'Uses stale permission, returns content and marks consumed.'});
    } else {
      for(let i=1;i<=n;i++) {
        const success=state==='available' && i===1;
        events.push({reader:i,action:'claim',success,state:state==='available'?'consumed':state,
          detail:success?'Conditional claim succeeds; marks consumed and returns content.':`Conditional claim fails; ${state==='available'?'already consumed':state}.`});
      }
    }
    return events;
  }
  async function sha256(text) {
    const bytes=new TextEncoder().encode(text);
    const result=await global.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(result),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  if(typeof module!=='undefined' && module.exports) {module.exports={raceEvents,sha256};return;}
  const doc=global.document; if(!doc) return;
  const byId=id=>doc.getElementById(id);
  let events=[],cursor=0,winners=0;
  function reset() {
    events=raceEvents(byId('raceMode').value,byId('readerCount').value,byId('initialState').value);
    cursor=0; winners=0; byId('raceLog').replaceChildren();
    byId('noteState').textContent=byId('initialState').value;
    byId('winnerCount').textContent='0'; byId('eventCount').textContent=`0 / ${events.length}`;
    byId('raceSummary').textContent='Ready. Step through each operation or run the full schedule.';
    byId('stepRace').disabled=false; byId('runRace').disabled=false;
    byId('readerGrid').replaceChildren();
    for(let i=1;i<=Number(byId('readerCount').value);i++) {
      const chip=doc.createElement('span');chip.id=`reader-${i}`;chip.textContent=`R${i}: waiting`;byId('readerGrid').append(chip);
    }
  }
  function step(announce=true) {
    if(cursor>=events.length) return;
    const event=events[cursor++]; if(event.success) winners++;
    byId('noteState').textContent=event.state;
    byId('winnerCount').textContent=String(winners);
    byId('eventCount').textContent=`${cursor} / ${events.length}`;
    const chip=byId(`reader-${event.reader}`);
    chip.textContent=`R${event.reader}: ${event.success?'received':event.action==='read' && event.state==='available'?'read available':'denied'}`;
    chip.dataset.result=event.success?'success':event.action==='read' && event.state==='available'?'pending':'denied';
    const row=doc.createElement('li'); row.textContent=`Reader ${event.reader} — ${event.detail}`;byId('raceLog').append(row);
    const done=cursor===events.length;
    byId('stepRace').disabled=done; byId('runRace').disabled=done;
    if(announce || done) byId('raceSummary').textContent=done ?
      `${winners} of ${byId('readerCount').value} readers received content. ${winners>1?'One-time access was violated by the stale reads.':winners===1?'Only one claim succeeded in this modeled schedule.':'No content was returned for the unavailable note.'}` :
      `Step ${cursor}: Reader ${event.reader}. ${event.detail}`;
  }
  ['raceMode','readerCount','initialState'].forEach(id=>byId(id).addEventListener('change',reset));
  byId('stepRace').addEventListener('click',()=>step());
  byId('runRace').addEventListener('click',()=>{while(cursor<events.length) step(false);});
  byId('resetRace').addEventListener('click',reset);
  const sample='Finding: review input validation\nFile: example.py\nLine: 42';
  let baseline=sample,version=0;
  async function updateHash() {
    const revision=++version, current=byId('hashInput').value;
    byId('hashStatus').textContent='Calculating SHA-256…';
    try {
      const [original,changed]=await Promise.all([sha256(baseline),sha256(current)]);
      if(revision!==version) return;
      byId('baselineHash').textContent=original;byId('currentHash').textContent=changed;
      byId('byteCount').textContent=`${new TextEncoder().encode(current).length} UTF-8 bytes`;
      byId('hashStatus').textContent=original===changed?'MATCH — current content has the same digest as the baseline.':'CHANGED — current content has a different digest from the baseline.';
      byId('hashStatus').dataset.result=original===changed?'success':'changed';
      byId('setBaseline').disabled=false;
    } catch {
      if(revision!==version) return;
      byId('hashStatus').textContent='SHA-256 is unavailable in this browser context. Open this page over HTTPS in a browser with Web Crypto support.';
      byId('baselineHash').textContent='Unavailable';byId('currentHash').textContent='Unavailable';byId('setBaseline').disabled=true;
    }
  }
  byId('hashInput').value=sample;
  byId('hashInput').addEventListener('input',updateHash);
  byId('tamperSample').addEventListener('click',()=>{byId('hashInput').value=byId('hashInput').value.endsWith('!')?byId('hashInput').value.slice(0,-1):byId('hashInput').value.slice(0,9999)+'!';updateHash();});
  byId('setBaseline').addEventListener('click',()=>{baseline=byId('hashInput').value;updateHash();});
  byId('resetHash').addEventListener('click',()=>{baseline=sample;byId('hashInput').value=sample;updateHash();});
  doc.querySelectorAll('[data-lab]').forEach(el=>{el.hidden=false;});
  reset();updateHash();
})(globalThis);
