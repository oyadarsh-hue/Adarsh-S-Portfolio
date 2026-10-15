((global) => {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? require('./workbench-data.js') : global.PortfolioEvidence;
  const clean = value => String(value || '').normalize('NFKC').toLowerCase();
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function analyze(text) {
    const normalized = clean(text).slice(0, 6000);
    return data.skills.filter(skill => skill.aliases.some(alias =>
      new RegExp('(^|[^a-z0-9_])' + escapeRegex(alias) + '(?=$|[^a-z0-9_])', 'i').test(normalized)
    )).map(skill => ({...skill, projects:data.projects.filter(project=>project.skills.includes(skill.id))}));
  }
  function selectedIds(ids) {
    return [...new Set(ids)].filter(id=>data.projects.some(p=>p.id===id)).slice(0,3);
  }
  function buildBrief({company='', role='', ids=[]}) {
    const safeLine = value => String(value).replace(/[\r\n\u0000-\u001f\u007f]/g,' ').trim().slice(0,80);
    const lines = ['ADARSH S | SELECTED PROJECT BRIEF', '',
      ...(safeLine(company) ? ['Prepared for: '+safeLine(company)] : []),
      ...(safeLine(role) ? ['Role: '+safeLine(role)] : []),
      'MCA 2026 | Kozhikode, Kerala, India',
      'Software development, full-stack applications and Python.', '', 'SELECTED PROJECT EVIDENCE'];
    for (const id of selectedIds(ids)) {
      const p = data.projects.find(project=>project.id===id);
      lines.push('', p.name+' | '+p.scope, p.summary, 'Stack: '+p.stack, 'Engineering decision: '+p.decision,
        'Validation evidence: '+p.tests, 'Scope: '+p.limit, 'Case study: '+data.base+'projects/'+p.id+'.html', 'Source: '+p.code);
    }
    lines.push('', 'CONTACT & FULL CV', 'Email: oyadarsh@gmail.com',
      'Portfolio: '+data.base, 'Original CV: '+data.base+'assets/docs/Adarsh_S_CV.pdf', '',
      'This selected-project brief accompanies the original CV. Test-source links describe available evidence; they are not new execution results.');
    return lines.join('\n');
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports={analyze,selectedIds,buildBrief}; return; }
  const doc=global.document;
  if (!doc || !data) return;
  const byId=id=>doc.getElementById(id);
  const make=(tag,text,className)=>{const el=doc.createElement(tag); if(text!==undefined) el.textContent=text; if(className) el.className=className; return el;};
  const status=byId('workStatus');
  const input=byId('jobText');
  const params=new URL(global.location.href).searchParams;
  let selected=params.has('projects') ? selectedIds(params.get('projects').split(',')) : ['quietnote','assenttag'];
  function link(text,href) {const a=make('a',text); a.href=href; return a;}
  function renderMatches() {
    const matches=analyze(input.value);
    const supported=matches.filter(s=>s.projects.length);
    byId('matchSummary').textContent = !input.value.trim() ? 'Choose a role preset or paste requirements to explore the evidence.' :
      matches.length ? `${matches.length} catalog terms recognized. ${supported.length} have linked project evidence.` : 'No catalog terms recognized. Review the case studies for other requirements.';
    const list=byId('matchList'); list.replaceChildren();
    matches.forEach(skill=>{
      const row=make('li',undefined,'match-row'); row.append(make('strong',skill.label));
      const evidence=make('div');
      if(skill.projects.length) skill.projects.forEach(p=>evidence.append(link(p.name, 'projects/'+p.id+'.html')));
      else evidence.append(make('span','No linked project evidence in this catalog.','muted'));
      row.append(evidence); list.append(row);
    });
    byId('suggestProjects').disabled = supported.length===0;
  }
  function renderSelection() {
    byId('selectionCount').textContent=`${selected.length} of 3 projects selected.`;
    doc.querySelectorAll('[data-choose-project]').forEach(box=>{
      box.checked=selected.includes(box.value);
      box.disabled=!box.checked && selected.length>=3;
    });
    const region=byId('comparison'); region.replaceChildren();
    if(selected.length) {
      const projects=selected.map(id=>data.projects.find(p=>p.id===id));
      const table=make('table'); table.append(make('caption','Selected project comparison'));
      const head=make('thead'), headings=make('tr');
      const label=make('th','Review area'); label.scope='col'; headings.append(label);
      projects.forEach(p=>{const th=make('th'); th.scope='col'; th.append(link(p.name,'projects/'+p.id+'.html')); headings.append(th);});
      head.append(headings); table.append(head);
      const body=make('tbody');
      [['scope','Scope'],['stack','Stack'],['decision','Engineering decision'],['tests','Validation evidence'],['limit','Limitations']].forEach(([key,label])=>{
        const row=make('tr'), title=make('th',label); title.scope='row'; row.append(title);
        projects.forEach(p=>row.append(make('td',p[key]))); body.append(row);
      });
      table.append(body); region.append(table);
    } else region.append(make('p','Select a project above to compare evidence and create a brief.','empty-note'));
    renderBrief();
  }
  function renderBrief() {
    byId('briefText').textContent=selected.length ? buildBrief({company:byId('company').value,role:byId('targetRole').value,ids:selected}) : 'Select at least one project to build your brief.';
    doc.querySelectorAll('[data-brief-action]').forEach(button=>{button.disabled=selected.length===0;});
  }
  function updateUrl() {
    const url=new URL(global.location.href); url.search=''; url.searchParams.set('projects',selected.join(','));
    try {global.history.replaceState(null,'',url);} catch { /* local previews */ }
  }
  async function copy(text, message, fallback) {
    try {await global.navigator.clipboard.writeText(text); status.textContent=message;}
    catch {status.textContent=fallback; byId('copyFallback').value=text; byId('copyFallbackWrap').hidden=false; byId('copyFallback').focus(); byId('copyFallback').select();}
  }
  const choices=byId('projectChoices');
  data.projects.forEach(p=>{
    const label=make('label',undefined,'project-choice'), checkbox=make('input'); checkbox.type='checkbox'; checkbox.value=p.id; checkbox.dataset.chooseProject='';
    const details=make('span'); details.append(make('strong',p.name),make('small',p.scope)); label.append(checkbox,details); choices.append(label);
    checkbox.addEventListener('change',()=>{selected=selectedIds(checkbox.checked?[...selected,p.id]:selected.filter(id=>id!==p.id)); renderSelection(); updateUrl();});
  });
  input.addEventListener('input',()=>{byId('rolePreset').value=''; renderMatches();});
  byId('rolePreset').addEventListener('change',event=>{if(data.presets[event.target.value]) input.value=data.presets[event.target.value]; renderMatches();});
  byId('suggestProjects').addEventListener('click',()=>{
    const skillIds=analyze(input.value).map(s=>s.id);
    selected=data.projects.map((p,index)=>({id:p.id,count:p.skills.filter(s=>skillIds.includes(s)).length,index}))
      .filter(p=>p.count>0).sort((a,b)=>b.count-a.count||a.index-b.index).slice(0,3).map(p=>p.id);
    renderSelection(); updateUrl(); status.textContent='Selected up to three projects with the most catalog term matches. Review their scope below.';
  });
  byId('clearSelection').addEventListener('click',()=>{selected=[]; renderSelection();updateUrl();});
  byId('company').addEventListener('input',renderBrief); byId('targetRole').addEventListener('input',renderBrief);
  byId('shareSelection').addEventListener('click',()=>{
    const url=new URL('workbench.html',data.base); url.searchParams.set('projects',selected.join(',')); url.hash='compare';
    copy(url.href,'Selection link copied. It includes only project IDs.','Copy the selection link below.');
  });
  byId('copyBrief').addEventListener('click',()=>copy(byId('briefText').textContent,'Project brief copied.','Copy the brief from the text box below.'));
  byId('downloadBrief').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([byId('briefText').textContent],{type:'text/plain;charset=utf-8'}));
    const a=link('',url); a.download='Adarsh-S-project-brief.txt'; doc.body.append(a); a.click(); a.remove();
    global.setTimeout(()=>URL.revokeObjectURL(url),1000); status.textContent='Project brief downloaded as a text file.';
  });
  byId('printBrief').addEventListener('click',()=>global.print());
  doc.querySelectorAll('[data-workbench]').forEach(el=>{el.hidden=false;});
  renderMatches(); renderSelection();
})(globalThis);
