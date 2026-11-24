(() => {
  const shots = ['Opening', 'Middle', 'Closing'];
  const pending = new Set(document.querySelectorAll('main .screen-card[data-clip]'));

  // The player installs its seek controls after fetching each film's timing sheet.
  function labelFrames(card) {
    const buttons = card.querySelectorAll('.still-options [data-frame-time]');
    if (buttons.length !== shots.length) return;
    buttons.forEach((button, index) => {
      const label = button.querySelector('span');
      if (!label) return;
      const playbackTime = label.textContent;
      label.textContent = shots[index];
      button.setAttribute('aria-label', shots[index] + ' · ' + button.getAttribute('aria-label'));
      button.title = shots[index] + ' · ' + playbackTime;
    });
    pending.delete(card);
  }

  for (const card of pending) labelFrames(card);
  if (!pending.size) return;
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (pending.has(record.target)) labelFrames(record.target);
    }
    if (!pending.size) observer.disconnect();
  });
  for (const card of pending) observer.observe(card, {childList: true});
})();
