/* view: امروز */
import type { Repo } from '../../storage';
import { appSettings, fmtHours, FA_DATE_FULL, faNum } from '../../settings';
import { todayIso, monthStartOf, monthMeta, isoOf, isoToDate, addDays, jLabel, toJ } from '../../jalali';
import { taskWeekAnalysis, overallMonthAnalysis } from '../../analysis';
import { badge, statBox } from '../bits';
import { esc, normalizeDaysPerWeek } from '../../utils';
import { wallHTML } from '../wall';

export function viewToday(repo: Repo): string {
  const s = appSettings(repo.db);
  const allActive = repo.activeTasks();
  const tasks = allActive.filter(t => normalizeDaysPerWeek(t.daysPerWeek) > 0);
  const tIso = todayIso();
  const todayTotal = repo.entries.filter(e => e.date === tIso).reduce((a, e) => a + e.hours, 0);
  let html = '<section class="hero">' +
    '<div><div class="hero-date">' + FA_DATE_FULL.format(new Date()) + '</div>' +
    '<div class="hero-sub">' + (todayTotal > 0
      ? 'امروز ' + fmtHours(todayTotal, s) + ' ساعت ثبت شده'
      : 'امروز هنوز چیزی ثبت نشده') + '</div></div>' +
    '<button class="btn primary" data-action="open-entry">ثبت دستی ساعت</button>' +
    '</section>';
  if (!allActive.length) {
    return html + '<section class="card empty-state">' +
      '<h2>اولین تسکت را بساز</h2>' +
      '<p>برای هر کار تخصصی یک تسک بساز، هدف روزانه‌اش را مشخص کن و هر روز ساعت کارکردت را ثبت کن. میانگین، انحراف معیار و قانون پایداری (SD کمتر از نصف میانگین) خودکار محاسبه می‌شود.</p>' +
      '<button class="btn primary" data-action="open-task">ساخت تسک</button>' +
      '<button class="btn ghost" data-action="load-sample">دیدن با داده نمونه</button>' +
      '</section>';
  }
  const meta = monthMeta(monthStartOf(new Date()));
  const totals: Record<string, number> = {};
  for (const e of repo.entries) totals[e.date] = (totals[e.date] || 0) + e.hours;
  const wallDays: { date: string; hours: number }[] = [];
  for (let d = isoToDate(meta.startIso); isoOf(d) <= tIso; d = addDays(d, 1)) {
    const iso = isoOf(d);
    wallDays.push({ date: iso, hours: totals[iso] || 0 });
  }
  /* month glances: streak + best day */
  const ov = overallMonthAnalysis(repo, monthStartOf(new Date()));
  const activeSet = new Set(repo.entries.filter(e => e.hours > 0).map(e => e.date));
  let streak = 0;
  let cur = isoToDate(tIso);
  if (!activeSet.has(tIso)) cur = addDays(cur, -1);
  while (activeSet.has(isoOf(cur))) { streak++; cur = addDays(cur, -1); }
  let bestDate = '', bestH = 0;
  for (const d of wallDays) if (d.hours > bestH) { bestH = d.hours; bestDate = d.date; }

  /* محاسبات هفته جاری و ترند برای پر کردن عمودی */
  const last7Days: { dayName: string; hours: number }[] = [];
  const dayLabels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  for (let i = 6; i >= 0; i--) {
    const dateObj = addDays(isoToDate(tIso), -i);
    const isoStr = isoOf(dateObj);
    const dayOfWeek = (dateObj.getDay() + 1) % 7; // شنبه تا جمعه
    last7Days.push({
      dayName: dayLabels[dayOfWeek] ?? '',
      hours: totals[isoStr] || 0
    });
  }
  const maxLast7 = Math.max(...last7Days.map(d => d.hours), 1);

  const sparkBars = last7Days.map(d => {
    const barHeight = Math.max(8, Math.round((d.hours / maxLast7) * 48));
    const activeColor = d.hours > 0 ? 'var(--color-primary, #10b981)' : 'rgba(255,255,255,0.1)';
    return '<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;">' +
      '<div style="font-size:10px; opacity:0.6;">' + (d.hours > 0 ? fmtHours(d.hours, s) : '-') + '</div>' +
      '<div style="width:100%; height:48px; display:flex; align-items:flex-end; background:rgba(255,255,255,0.02);">' +
        '<div style="width:100%; height:' + barHeight + 'px; background:' + activeColor + '; transition:height 0.2s;"></div>' +
      '</div>' +
      '<div style="font-size:11px; opacity:0.7;">' + d.dayName + '</div>' +
    '</div>';
  }).join('');

  const targetDailyTotal = tasks.reduce((sum, t) => sum + (t.targetDailyHours || 0), 0);
  const isStable = ov.mean > 0 && ov.sd < (ov.mean / 2);

  /* compact board + month summary, side by side */
  html += '<div class="grid2" style="align-items: stretch;">';
  html += '<section class="card wall-card" style="border-radius: 0 !important;"><div class="card-head"><h3>دیوار ماه</h3>' +
    '<span class="mini-chip none">' + jLabel(monthStartOf(new Date())) + '</span></div>' +
    '<p class="rule-hint">هر خانه یک روز؛ پررنگ‌تر یعنی ساعت بیشتر. نگه‌دار برای جزئیات، بزن برای دیدن روز.</p>' +
    wallHTML(wallDays, s, tIso, meta.endIso) + '</section>';

  html += '<section class="card" style="border-radius: 0 !important; display: flex; flex-direction: column; justify-content: space-between;">' +
    '<div>' +
      '<div class="card-head"><h3>ماه جاری (همه تسک‌ها)</h3>' + badge(ov.status) +
      '<button class="btn small ghost" data-action="tab" data-tab="report" style="margin-inline-start:auto; border-radius:0;">گزارش کامل</button></div>' +
      '<div class="stats">' +
      statBox('مجموع ساعت', fmtHours(ov.total, s), 'ساعت') +
      statBox('میانگین روزانه', fmtHours(ov.mean, s), 'ساعت') +
      statBox('انحراف معیار', fmtHours(ov.sd, s), 'ساعت') +
      statBox('روزهای فعال', faNum(ov.activeDays) + ' از ' + faNum(ov.n), '') +
      statBox('زنجیره جاری', faNum(streak), 'روز') +
      statBox('پرکارترین روز', bestH > 0 ? faNum(toJ(isoToDate(bestDate)).jd) + 'ام' : '—', bestH > 0 ? fmtHours(bestH, s) : '') +
      '</div>' +
    '</div>' +

    /* بخش تکمیلی: ترند ۷ روز اخیر + تعادل SD (پرکننده دقیق ارتفاع با لبه‌های تیز) */
    '<div style="margin-top: 14px; padding: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 0; display: flex; flex-direction: column; gap: 12px;">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">' +
        '<span style="opacity: 0.85; font-weight: 500;">ریتم ثبت ساعت ۷ روز اخیر</span>' +
        '<span style="opacity: 0.6;">تارگت روزانه: <b>' + fmtHours(targetDailyTotal, s) + ' س</b></span>' +
      '</div>' +
      '<div style="display: flex; gap: 6px; align-items: flex-end; padding: 4px 0;">' +
        sparkBars +
      '</div>' +
      '<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; opacity: 0.75; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">' +
        '<span>شاخص پایداری ماه: <b style="color:' + (isStable ? '#10b981' : '#f59e0b') + '">' + (isStable ? 'پایدار (SD مطلوب)' : 'نوسانی') + '</b></span>' +
        '<span>پوشش زمانی: <b>' + faNum(Math.round((ov.activeDays / (ov.n || 1)) * 100)) + '٪</b></span>' +
      '</div>' +
    '</div>' +
    '</section>';
  html += '</div>';

  const gridContent = tasks.length
    ? tasks.map(t => {
      const e = repo.findEntry(t.id, tIso);
      const wk = taskWeekAnalysis(repo, t);
      const wkChip = wk ? '<div class="week-chip"><span class="wc-label">۷ روز اخیر</span>' +
        '<span>میانگین <b>' + fmtHours(wk.mean, s) + '</b></span>' +
        '<span class="wc-sep" aria-hidden="true"></span>' +
        '<span>انحراف <b>' + fmtHours(wk.sd, s) + '</b></span>' +
        '<span class="wc-badge">' + badge(wk.status) + '</span></div>' : '';
      const d = normalizeDaysPerWeek(t.daysPerWeek);
      const targetText = t.targetDailyHours > 0
        ? (d < 7 ? 'هدف: ' + fmtHours(t.targetDailyHours, s) + ' (' + faNum(d) + ' روز/هفته)' : 'هدف: ' + fmtHours(t.targetDailyHours, s) + ' ساعت در روز')
        : (d < 7 ? faNum(d) + ' روز در هفته' : 'بدون هدف');
      const pct = t.targetDailyHours > 0 ? Math.min(100, ((e ? e.hours : 0) / t.targetDailyHours) * 100) : null;
      return '<article class="card task-card" style="--task:' + t.color + '">' +
        '<header><span class="dot"></span><h3>' + esc(t.name) + '</h3>' +
        '<span class="target-chip">' + targetText + '</span></header>' +
        '<div class="today-row">' +
        (e ? '<div class="today-hours">' + fmtHours(e.hours, s) + ' ساعت</div>'
          : '<div class="today-hours none">ثبت نشده</div>') +
        '<div class="quick">' +
        '<button class="btn small" data-action="quick-add" data-task="' + t.id + '" data-amount="0.5">+۳۰ دقیقه</button>' +
        '<button class="btn small" data-action="quick-add" data-task="' + t.id + '" data-amount="1">+۱ ساعت</button>' +
        '<button class="btn small ghost" data-action="open-entry" data-task="' + t.id + '">ویرایش</button>' +
        '</div></div>' +
        (pct != null ? '<div class="progress"><i style="width:' + pct.toFixed(0) + '%"></i></div>' : '') +
        wkChip + '</article>';
    }).join('')
    : '<section class="card empty-state" style="padding:28px 20px"><p style="margin:0">تسک‌های بدون برنامهٔ پایداری (۰ روز در هفته) در تب امروز نمایش داده نمی‌شوند.</p></section>';
  html += '<div class="task-grid">' + gridContent + '</div>';
  return html;
}