const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d) {
  if (!d) return '—';
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]} ${MONTHS[+parts[1]] || ''}`.trim();
}

export function pillClass(ok) {
  return `pill ${ok ? 'ok' : 'pend'}`;
}

export function esc(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function optList(values, current) {
  return values.map((v) => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(v) || '—'}</option>`).join('');
}
