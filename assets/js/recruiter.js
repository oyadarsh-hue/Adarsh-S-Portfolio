/* Small optional enhancements; every project remains available without JS. */
((global) => {
  'use strict';
  const focuses = ['all', 'web', 'vision', 'security', 'experiment'];
  const normalize = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase('en').trim();
  const validFocus = (value) => focuses.includes(value) ? value : 'all';
  function matchesProject(project, focus, query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const tags = String(project.tags || '').split(/\s+/);
    const text = normalize(project.text);
    return (validFocus(focus) === 'all' || tags.includes(focus)) && terms.every(term => text.includes(term));
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {matchesProject, validFocus};
    return;
  }
  const doc = global.document;
  if (!doc) return;
  const tools = doc.querySelector('[data-project-tools]');
  if (tools) {
    const search = doc.getElementById('projectSearch');
    const status = doc.getElementById('projectResults');
    const empty = doc.getElementById('projectEmpty');
    const buttons = [...tools.querySelectorAll('[data-project-filter]')];
    const projects = [...doc.querySelectorAll('[data-project-tags]')].map(el => ({
      el, tags: el.dataset.projectTags, text: el.textContent
    }));
    const parameters = new URL(global.location.href).searchParams;
    let focus = validFocus(parameters.get('focus'));
    search.value = (parameters.get('q') || '').slice(0, 160);
    function update(saveUrl = true) {
      let count = 0;
      projects.forEach(project => {
        const show = matchesProject(project, focus, search.value);
        project.el.hidden = !show;
        if (show) count++;
      });
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectFilter === focus)));
      status.textContent = `Showing ${count} of ${projects.length} projects.`;
      empty.hidden = count !== 0;
      if (saveUrl) {
        const url = new URL(global.location.href);
        if (focus === 'all') url.searchParams.delete('focus');
        else url.searchParams.set('focus', focus);
        if (search.value.trim()) url.searchParams.set('q', search.value.trim());
        else url.searchParams.delete('q');
        try { global.history.replaceState(null, '', url); } catch { /* file previews remain usable */ }
      }
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      focus = validFocus(button.dataset.projectFilter);
      update();
    }));
    search.addEventListener('input', () => update());
    update(false);
    tools.hidden = false;
  }
  doc.querySelectorAll('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      const status = doc.querySelector('[data-copy-status]');
      try {
        if (!global.navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await global.navigator.clipboard.writeText('oyadarsh@gmail.com');
        status.textContent = 'Email address copied.';
      } catch {
        status.textContent = 'Copy this address: oyadarsh@gmail.com';
      }
    });
  });
  doc.querySelectorAll('[data-print-summary]').forEach(button => button.addEventListener('click', () => global.print()));
  doc.querySelectorAll('[data-js-action]').forEach(button => { button.hidden = false; });
})(globalThis);
