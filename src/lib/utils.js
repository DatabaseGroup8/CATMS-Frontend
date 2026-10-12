export const localDate = (date = new Date()) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};
export const monthStart = () => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), 1));
};
export const money = value => value === undefined || value === null ? '—' : 'Rs. ' + Number(value).toLocaleString('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
export const shortDate = value => {
  if (!value) return '—';
  const d = new Date(String(value).slice(0, 10) + 'T00:00:00');
  return Number.isNaN(+d) ? String(value) : d.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
export const currencyNumber = value => Number(value || 0);
export const str = v => v == null ? '—' : String(v);
export const titleCase = s => String(s || '').replaceAll('_', ' ').replace(/\b\w/g, x => x.toUpperCase());
export function toCSV(rows) {
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const e = v => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  return [cols.join(','), ...rows.map(r => cols.map(c => e(r[c])).join(','))].join('\r\n');
}
export function downloadCSV(rows, name) {
  if (!rows?.length) return;
  const blob = new Blob(['\ufeff', toCSV(rows)], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 300);
}
