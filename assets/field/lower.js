(() => {
  const skillSection = document.getElementById('skills');
  const filters = skillSection?.querySelector('.lo-filters');
  if (!filters) return;
  const buttons = [...filters.querySelectorAll('[data-lo-filter]')];
  const groups = [...skillSection.querySelectorAll('[data-lo-category]')];
  filters.addEventListener('click', (event) => {
    const selected = event.target.closest('[data-lo-filter]');
    if (!selected || !filters.contains(selected)) return;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button === selected)));
    const category = selected.dataset.loFilter;
    groups.forEach((group) => {
      group.hidden = category !== 'all' && group.dataset.loCategory !== category;
    });
  });
  filters.hidden = false;
})();
