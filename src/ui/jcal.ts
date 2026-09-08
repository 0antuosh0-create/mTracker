/* Jalali month calendar — day picker + activity heat (daily view),
   plus a generic plain grid reused by the entry modal & report range picker. */
import type { AppSettings } from '../settings';
import { faNum, fmtHours } from '../settings';
import { isoOf, isoToDate, toJ, monthMeta, monthStartOf, jLabel, addDays, todayIso, jDayLabel } from '../jalali';
import type { Repo } from '../storage';
import { WEEK_HEAD, levelOf } from './wall';

export function calGridHTML(viewMs: Date, selectedIso: string, tIso: string, action: string): string {
  const meta = monthMeta(viewMs);
  const lead = (isoToDate(meta.startIso).getDay() - 6 + 7) % 7;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="ecal-cell blank"></span>';
  for (let d = isoToDate(meta.startIso); isoOf(d) <= meta.endIso; d = addDays(d, 1)) {
    const iso = isoOf(d);
    cells += '<button type="button" class="ecal-cell' +
      (iso === selectedIso ? ' selected' : '') +
      (iso === tIso ? ' today' : '') +
      (iso > tIso ? ' off' : '') +
      '" data-action="' + action + '" data-date="' + iso + '"' +
      (iso > tIso ? ' disabled' : '') + '>' + faNum(toJ(d).jd) + '</button>';
  }
  return WEEK_HEAD.map(w => '<span class="ecal-head">' + w + '</span>').join('') + cells;
}

export function jcalHTML(repo: Repo, viewMonthStartIso: string, selectedIso: string, s: AppSettings): string {
  const ms = isoToDate(viewMonthStartIso);
  const meta = monthMeta(ms);
  const tIso = todayIso();
  const totals: Record<string, number> = {};
  for (const e of repo.entries) totals[e.date] = (totals[e.date] || 0) + e.hours;
  let max = 0, monthTotal = 0, active = 0, bestDate = '', bestH = 0;
  for (let d = isoToDate(meta.startIso); isoOf(d) <= meta.endIso; d = addDays(d, 1)) {
    const iso = isoOf(d);
    const h = totals[iso] || 0;
    if (h > max) max = h;
    if (iso <= tIso) {
      monthTotal += h;
      if (h > 0) active++;
      if (h > bestH) { bestH = h; bestDate = iso; }
    }
  }
  let streak = 0;
  let cur = isoToDate(tIso);
  if ((totals[tIso] || 0) <= 0) cur = addDays(cur, -1);
  while ((totals[isoOf(cur)] || 0) > 0 && streak < 3650) { streak++; cur = addDays(cur, -1); }

  const lead = (isoToDate(meta.startIso).getDay() - 6 + 7) % 7;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="wall-cell blank" aria-hidden="true"></span>';
  for (let d = isoToDate(meta.startIso); isoOf(d) <= meta.endIso; d = addDays(d, 1)) {
    const iso = isoOf(d);
    const h = totals[iso] || 0;
    const cls = 'wall-cell jcal-day lvl' + levelOf(h, max) +
      (iso === selectedIso ? ' selected' : '') +
      (iso === tIso ? ' today' : '') +
      (iso > tIso ? ' off' : '');
    cells += '<button type="button" class="' + cls + '" data-action="pick-day" data-date="' + iso + '"' +
      (iso > tIso ? ' disabled' : '') +
      ' title="' + jDayLabel(iso) + (h > 0 ? ': ' + fmtHours(h, s) + ' ساعت' : '') + '">' +
      '<b>' + faNum(toJ(d).jd) + '</b>' +
      (h > 0 ? '<i>' + fmtHours(h, s) + '</i>' : '') +
      '</button>';
  }
  const used = lead + meta.length;
  for (let i = 0; i < (7 - used % 7) % 7; i++) cells += '<span class="wall-cell blank" aria-hidden="true"></span>';
  const head = WEEK_HEAD.map(w => '<span class="wall-head">' + w + '</span>').join('');
  const atCurrent = viewMonthStartIso >= isoOf(monthStartOf(new Date()));
  const glance = '<div class="jcal-glance">' +
    '<span class="jg-chip">مجموع ماه <b>' + fmtHours(monthTotal, s) + '</b></span>' +
    '<span class="jg-chip">روزهای فعال <b>' + faNum(active) + '</b></span>' +
    (bestH > 0 ? '<span class="jg-chip">پرکارترین <b>روز ' + faNum(toJ(isoToDate(bestDate)).jd) + '</b></span>' : '') +
    (streak > 0 ? '<span class="jg-chip">زنجیره <b>' + faNum(streak) + ' روز</b></span>' : '') +
    '</div>';
  return '<div class="jcal">' +
    '<div class="jcal-head">' +
    '<button type="button" class="btn small ghost" data-action="cal-prev">ماه قبل</button>' +
    '<div class="jcal-title">' + jLabel(ms) + '</div>' +
    '<button type="button" class="btn small ghost" data-action="cal-next"' + (atCurrent ? ' disabled' : '') + '>ماه بعد</button>' +
    '</div>' +
    '<div class="jcal-week">' + head + '</div>' +
    '<div class="wall-grid jcal-body">' + cells + '</div>' +
    glance +
    '</div>';
}