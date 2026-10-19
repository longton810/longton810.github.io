'use strict';

// Menu ordering and local project links
(() => {
  const menu = document.querySelector('nav[aria-label="Dental notes"]');
  const cards = [...menu.querySelectorAll('.tool')];
  const storageKey = 'dental-notes-menu-order';
  // Keep saved card ordering stable while opening the current local Extraction project.
  const cardId = card => new URL(card.dataset.hostedHref || card.href).pathname;
  cards.forEach(card => {
    if (location.protocol === 'file:' && card.dataset.localHref) {
      card.dataset.hostedHref = card.href;
      card.href = new URL(card.dataset.localHref, location.href).href;
    }
  });
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) {
      const remaining = new Map(cards.map(card => [cardId(card), card]));
      saved.forEach(id => { if (remaining.has(id)) { menu.append(remaining.get(id)); remaining.delete(id); } });
      remaining.forEach(card => menu.append(card));
    }
  } catch {}
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify([...menu.querySelectorAll('.tool')].map(cardId))); } catch {} };
  let dragging = null, target = null, suppressClickUntil = 0;
  const clearTarget = () => { if (target) target.classList.remove('drop-target'); target = null; };
  const finish = () => {
    clearTarget();
    if (dragging) dragging.classList.remove('dragging');
    dragging = null;
    suppressClickUntil = Date.now() + 250;
  };
  cards.forEach(card => {
    card.draggable = true;
    card.title = 'Click to open; drag to rearrange';
    card.addEventListener('dragstart', event => {
      dragging = card;
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cardId(card));
    });
    card.addEventListener('dragend', finish);
    card.addEventListener('click', event => { if (dragging || Date.now() < suppressClickUntil) event.preventDefault(); });
  });
  menu.addEventListener('dragover', event => {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const next = event.target.closest('.tool');
    if (next === target) return;
    clearTarget();
    if (next && next !== dragging && menu.contains(next)) { target = next; target.classList.add('drop-target'); }
  });
  menu.addEventListener('dragleave', event => { if (!menu.contains(event.relatedTarget)) clearTarget(); });
  menu.addEventListener('drop', event => {
    if (!dragging) return;
    event.preventDefault();
    if (target) {
      const rect = target.getBoundingClientRect();
      const multipleColumns = getComputedStyle(menu).gridTemplateColumns.split(' ').length > 1;
      const after = multipleColumns ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2;
      menu.insertBefore(dragging, after ? target.nextSibling : target);
      save();
    }
    finish();
  });
})();

// Portrait blinking
(() => {
  const portrait = document.querySelector('.portrait-wrap');
  const closed = portrait?.querySelector('.portrait-blink-frame');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!portrait || !closed) return;
  let timer, end;
  const stop = () => {
    clearTimeout(timer); clearTimeout(end);
    portrait.classList.remove('is-blinking');
  };
  const blink = () => {
    if (document.hidden || reduced.matches || !closed.complete || !closed.naturalWidth) return;
    portrait.classList.add('is-blinking');
    end = setTimeout(() => portrait.classList.remove('is-blinking'), 200);
    timer = setTimeout(blink, 4000 + Math.random() * 3500);
  };
  const start = () => {
    stop();
    if (!document.hidden && !reduced.matches && closed.complete && closed.naturalWidth) timer = setTimeout(blink, 2200);
  };
  closed.addEventListener('load', start);
  document.addEventListener('visibilitychange', start);
  reduced.addEventListener('change', start);
  start();
})();

// Eastern time clock
(() => {
  const clock = document.getElementById('homepageTime');
  const date = document.getElementById('homepageDate');
  const timeZone = 'America/New_York';
  const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const datePartsFormat = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  let timer;
  const update = () => {
    const now = new Date();
    clock.textContent = timeFormat.format(now);
    clock.dateTime = now.toISOString();
    date.textContent = dateFormat.format(now);
    const parts = Object.fromEntries(datePartsFormat.formatToParts(now).map(({ type, value }) => [type, value]));
    date.dateTime = `${parts.year}-${parts.month}-${parts.day}`;
  };
  const resume = () => {
    clearInterval(timer);
    update();
    if (!document.hidden) timer = setInterval(update, 1000);
  };
  document.addEventListener('visibilitychange', resume);
  resume();
})();

// Rotating date countdown
(() => {
  const events = [
    ['ADEX EXAM', 2026, 11, 13, '🦷'],
    ['Thanksgiving Day', 2026, 11, 26, '🦃'],
    ['Christmas Eve', 2026, 12, 24, '🎄'],
    ["New Year's Day", 2027, 1, 1, '🎆'],
    ['Last Day of D4', 2027, 5, 21, '🎉'],
    ['Commencement Day', 2027, 6, 6, '🎓']
  ];
  const track = document.getElementById('countdownTrack');
  const card = track.parentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const dateFormat = new Intl.DateTimeFormat('en-US', { month:'long', day:'numeric', year:'numeric' });
  let index = 0, timer, flipTimer, paused = false;
  const face = eventIndex => {
    const [name, year, month, day, icon] = events[eventIndex], now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((Date.UTC(year, month - 1, day) - today) / 86400000);
    const remaining = days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} left` : days === 0 ? 'Today!' : `${-days} ${days === -1 ? 'day' : 'days'} ago`;
    const panel = document.createElement('div'); panel.className = 'countdown-face';
    [['countdown-title',`${icon} ${name}`],['countdown-remaining',remaining],['countdown-date',dateFormat.format(new Date(year, month - 1, day))]].forEach(([className,text]) => {
      const line = document.createElement('div'); line.className = className; line.textContent = text; panel.append(line);
    });
    return panel;
  };
  const show = () => {
    track.classList.remove('is-rotating');
    const front = face(index); front.classList.add('countdown-front');
    track.replaceChildren(front);
  };
  const next = () => {
    if (paused || document.hidden) return;
    const nextIndex = (index + 1) % events.length;
    if (reducedMotion.matches) { index = nextIndex; show(); return; }
    const right = face(nextIndex); right.classList.add('countdown-right');
    track.append(right);
    track.classList.add('is-rotating');
    flipTimer = setTimeout(() => { index = nextIndex; show(); },800);
  };
  const resume = () => {
    clearInterval(timer); clearTimeout(flipTimer); show();
    if (!document.hidden) timer = setInterval(next,5000);
  };
  card.addEventListener('pointerenter',() => paused = true);
  card.addEventListener('pointerleave',() => paused = false);
  document.addEventListener('visibilitychange',resume);
  resume();
})();
