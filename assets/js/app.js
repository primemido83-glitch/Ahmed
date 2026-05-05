const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const money = n => parsePrice(n).toLocaleString('en-US') + ' EGP';
function get(k) {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]');
  }
  catch {
    return [];
  }
}
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const cleaned = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : 0;
}
function normalizeCartItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(x => ({
      name: String(x.name || 'Item').trim(),
      price: parsePrice(x.price),
      qty: Math.max(1, parseInt(x.qty, 10) || 1)
    }))
    .filter(x => x.name && x.price > 0);
}
function getCart() {
  return normalizeCartItems(get('freshShopCart'));
}
function saveCart(items) {
  set('freshShopCart', normalizeCartItems(items));
}

function initTheme() {
  if (localStorage.freshTheme === 'night' || localStorage.freshTheme === 'dark') {
    document.body.classList.add('night');
  }
  paintTheme();
}
function paintTheme() {
  const night = document.body.classList.contains('night');
  $$('[data-mood-label]').forEach(x => x.textContent = night ? 'Light' : 'Night');
  $$('[data-theme-icon]').forEach(x => x.textContent = night ? '☀️' : '🌙');
  if ($('[data-storage-note]')) {
    $('[data-storage-note]').textContent = night ? 'Night mode is on.' : 'Day mode is on.';
  }
}
function initNav() {
  const file = location.pathname.split('/').pop() || 'index.html';
  $$('.side-nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === file));
}

function addItem(name, price) {
  const unitPrice = parsePrice(price);
  if (!name || !unitPrice) {
    toast('Could not add this item. Please try again.');
    return;
  }
  const items = getCart();
  const found = items.find(x => x.name === name);
  if (found) {
    found.qty += 1;
    found.price = unitPrice;
  }
  else {
    items.push({ name, price: unitPrice, qty: 1 });
  }
  saveCart(items);
  drawCart();
  updateCount();
  toast(name + ' added to your order.');
}
function changeItem(index, step) {
  const items = getCart();
  const i = Number(index);
  if (!items[i]) {
    return;
  }
  items[i].qty += Number(step);
  if (items[i].qty < 1) {
    items.splice(i, 1);
  }
  saveCart(items);
  drawCart();
  updateCount();
}
function removeItem(index) {
  const items = getCart();
  const i = Number(index);
  if (!items[i]) {
    return;
  }
  items.splice(i, 1);
  saveCart(items);
  drawCart();
  updateCount();
}
function updateCount() {
  const count = getCart().reduce((t, x) => t + x.qty, 0);
  $$('[data-cart-count]').forEach(x => {
    x.textContent = count;
    x.classList.toggle('show', count > 0);
  });
}
function drawCart() {
  const body = $('[data-shop-items]');
  if (!body) {
    return;
  }
  const items = getCart();
  saveCart(items);
  const total = items.reduce((t, x) => t + parsePrice(x.price) * x.qty, 0);
  $('[data-shop-empty]')?.classList.toggle('show', items.length === 0);
  const totalBox = $('[data-shop-total]');
  if (totalBox) {
    totalBox.textContent = money(total);
  }
  const template = $('#cart-row-template');
  if (!template) {
    return;
  }
  const rows = items.map((x, i) => {
    const row = template.content.firstElementChild.cloneNode(true);
    $('[data-cart-item-name]', row).textContent = x.name;
    $('[data-cart-item-price]', row).textContent = money(x.price);
    $('[data-cart-item-qty]', row).textContent = x.qty;
    $('[data-cart-item-total]', row).textContent = money(parsePrice(x.price) * x.qty);
    $('[data-cart-minus]', row).dataset.cartMinus = i;
    $('[data-cart-plus]', row).dataset.cartPlus = i;
    $('[data-cart-remove]', row).dataset.cartRemove = i;
    return row;
  });
  body.replaceChildren(...rows);
}
function receipt() {
  const items = getCart();
  if (!items.length) {
    return alert('Your cart is empty. Pick something from the menu first.');
  }
  const total = items.reduce((t, x) => t + parsePrice(x.price) * x.qty, 0);
  const box = $('[data-receipt]');
  const lineTemplate = $('#receipt-line-template');
  const totalTemplate = $('#receipt-total-template');
  if (!box || !lineTemplate || !totalTemplate) {
    return alert('Total: ' + money(total));
  }
  const lines = items.map(x => {
    const line = lineTemplate.content.firstElementChild.cloneNode(true);
    $('[data-receipt-name]', line).textContent = x.name;
    $('[data-receipt-qty]', line).textContent = x.qty;
    $('[data-receipt-line-total]', line).textContent = money(parsePrice(x.price) * x.qty);
    return line;
  });
  const totalLine = totalTemplate.content.cloneNode(true);
  $('[data-receipt-total]', totalLine).textContent = money(total);
  box.replaceChildren(...lines, totalLine);
  $('[data-modal]')?.classList.add('show');
}
function toast(text) {
  const box = $('[data-shop-toast]');
  if (!box) {
    return;
  }
  box.textContent = text;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 1300);
}

function initMenu() {
  const list = $('[data-menu-results]');
  if (!list) {
    return;
  }
  list.state = { cat: 'All', page: 1 };
  updateMenu();
}

function checkField(input) {
  const value = input.value.trim();
  let ok = true;
  if (input.dataset.required === 'true' && !value) {
    ok = false;
  }
  if (input.dataset.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    ok = false;
  }
  if (input.dataset.type === 'phone' && value && !/^[0-9+\-\s]{8,}$/.test(value)) {
    ok = false;
  }
  if (input.dataset.match) {
    const original = $(input.dataset.match);
    if (original && value !== original.value.trim()) {
      ok = false;
    }
  }
  if (input.dataset.min && Number(value) < Number(input.dataset.min)) {
    ok = false;
  }
  input.closest('.input-box')?.classList.toggle('bad', !ok);
  return ok;
}
function sendForm(form) {
  const ok = $$('input, textarea, select', form).map(checkField).every(Boolean);
  if (!ok) {
    return;
  }
  const records = get('freshFormRecords');
  records.push({ page: location.pathname.split('/').pop(), time: new Date().toLocaleString() });
  set('freshFormRecords', records.slice(-20));
  const msg = $('[data-form-message]', form.parentElement) || $('[data-form-message]');
  if (msg) {
    msg.textContent = form.dataset.success || 'Thanks — we got it.';
    msg.classList.add('show');
  }
  form.reset();
}

function initOffers() {
  const timer = $('[data-offer-timer]');
  if (!timer) {
    return;
  }
  let s = Number(timer.dataset.seconds || 7200);
  setInterval(() => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    timer.textContent = h + ':' + m + ':' + sec + ' left';
    if (s > 0) {
      s--;
    }
  }, 1000);
}
function initDate() {
  const input = $('[data-date-not-past]');
  if (!input) {
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  input.min = today;
  input.addEventListener('input', () => input.closest('.input-box')?.classList.toggle('bad', input.value < today));
}

function pageMotion() {
  requestAnimationFrame(() => document.body.classList.add('page-ready'));
}

function clickControl(e) {
  const t = e.target;
  const menu = $('.side-nav');
  const add = t.closest('[data-add-cart]');
  const cat = t.closest('.filter-btn[data-category]');
  const page = t.closest('[data-page]');
  const offer = t.closest('[data-offer-filter]');
  const link = t.closest('a');
  if (t.closest('[data-theme-toggle]')) {
    e.preventDefault();
    document.body.classList.toggle('night');
    localStorage.freshTheme = document.body.classList.contains('night') ? 'night' : 'day';
    paintTheme();
  }
  if (t.closest('[data-menu-toggle]')) {
    e.stopPropagation();
    menu?.classList.toggle('open');
    document.body.classList.toggle('side-on');
  }
  else if (!t.closest('.side-nav')) {
    menu?.classList.remove('open');
    document.body.classList.remove('side-on');
  }
  if (add) {
    e.preventDefault();
    addItem(add.dataset.name, add.dataset.price);
  }
  if (t.closest('[data-cart-plus]')) {
    changeItem(t.closest('[data-cart-plus]').dataset.cartPlus, 1);
  }
  if (t.closest('[data-cart-minus]')) {
    changeItem(t.closest('[data-cart-minus]').dataset.cartMinus, -1);
  }
  if (t.closest('[data-cart-remove]')) {
    removeItem(t.closest('[data-cart-remove]').dataset.cartRemove);
  }
  if (t.closest('[data-clear-cart]')) {
    saveCart([]);
    drawCart();
    updateCount();
  }
  if (t.closest('[data-shop-checkout]')) {
    receipt();
  }
  if (t.closest('[data-close-modal]')) {
    $('[data-modal]')?.classList.remove('show');
  }
  if (cat) {
    $$('.filter-btn[data-category]').forEach(x => x.classList.remove('on'));
    cat.classList.add('on');
    const results = $('[data-menu-results]');
    if (results) {
      results.dataset.cat = cat.dataset.category;
      updateMenu({ cat: cat.dataset.category, page: 1 });
    }
  }
  if (page) {
    updateMenu({ page: Number(page.dataset.page) });
  }
  if (offer) {
    $$('[data-offer-filter]').forEach(x => x.classList.remove('on'));
    offer.classList.add('on');
    $$('[data-offer-card]').forEach(c => c.classList.toggle('hide', offer.dataset.offerFilter !== 'All' && c.dataset.offerCard !== offer.dataset.offerFilter));
  }
  if (link) {
    pageLink(e, link);
  }
}
function updateMenu(next) {
  const list = $('[data-menu-results]');
  if (!list) {
    return;
  }
  list.state = Object.assign(list.state || { cat: 'All', page: 1 }, next);
  const state = list.state;
  const cards = $$('[data-food-card]', list);
  const word = ($('[data-menu-search]')?.value || '').toLowerCase();
  const shown = cards.filter(c => (state.cat === 'All' || c.dataset.category === state.cat) && c.dataset.search.includes(word));
  const max = Math.max(1, Math.ceil(shown.length / 6));
  state.page = Math.min(state.page, max);
  list.className = 'dish-list grid';
  cards.forEach(c => c.classList.add('hide'));
  shown.slice((state.page - 1) * 6, state.page * 6).forEach(c => c.classList.remove('hide'));
  const pagination = $('[data-pagination]');
  if (pagination) {
    $$('[data-page]', pagination).forEach((button, i) => {
      const pageNumber = i + 1;
      button.dataset.page = pageNumber;
      button.textContent = pageNumber;
      button.hidden = pageNumber > max;
      button.classList.toggle('on', state.page === pageNumber);
    });
  }
}
function pageLink(e, link) {
  const href = link.getAttribute('href') || '';
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || link.target && link.target !== '_self') {
    return;
  }
  const next = new URL(link.href, location.href);
  if (next.origin !== location.origin || next.href === location.href) {
    return;
  }
  e.preventDefault();
  document.body.classList.add('page-leave');
  setTimeout(() => {
    location.href = next.href;
  }, 160);
}

function start() {
  initTheme();
  initNav();
  updateCount();
  drawCart();
  initMenu();
  initOffers();
  initDate();
  pageMotion();
  $$('[data-fresh-form]').forEach(f => f.noValidate = true);
  document.addEventListener('click', clickControl);
  document.addEventListener('input', e => {
    if (e.target.matches('[data-menu-search]')) updateMenu({ page: 1 });
    if (e.target.matches('input, textarea, select')) checkField(e.target);
  });
  document.addEventListener('submit', e => {
    if (!e.target.matches('[data-fresh-form]')) {
      return;
    }
    e.preventDefault();
    sendForm(e.target);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('.side-nav')?.classList.remove('open');
  });
}
document.addEventListener('DOMContentLoaded', start);
