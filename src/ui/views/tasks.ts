/* view: تسک‌ها */
import type { Repo } from '../../storage';
import { appSettings, fmtHours, faNum } from '../../settings';
import { isoToDate, todayIso, isoOf, addDays } from '../../jalali';
import { scheduleSummary, taskPeriodAnalysis, taskWeekAnalysis, streakOf } from '../../analysis';
import { esc } from '../../utils';
import { badge } from '../bits';
import { lineChartHTML } from '../charts/line';

export function viewTasks(repo: Repo): string {
  const s = appSettings(repo.db);
  const tasks = repo.activeTasks();
  const tIso = todayIso();
  const totalEntries = repo.entries.length;
  const totalHours = repo.entries.reduce((a, e) => a + e.hours, 0);

  let html = '<section class="card hero" style="padding:14px 18px; margin-bottom:16px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">' +
    '<div style="display:flex; align-items:center; gap:12px;">' +
      '<h2 style="margin:0; font-size:1.2rem; font-weight:800;">تسک‌ها</h2>' +
      (totalEntries > 0 
        ? '<div style="display:flex; align-items:center; gap:6px; font-size:0.8rem; opacity:0.75;">' +
            '<span><b>' + faNum(tasks.length) + '</b> تسک</span>' +
            '<span style="opacity:0.3;">•</span>' +
            '<span><b>' + fmtHours(totalHours, s) + '</b> ساعت</span>' +
            '<span style="opacity:0.3;">•</span>' +
            '<span><b>' + faNum(totalEntries) + '</b> ثبت</span>' +
          '</div>'
        : '') +
    '</div>' +
    '<button class="btn primary" data-action="open-task" style="margin:0; padding:6px 14px; font-size:0.82rem; border-radius:3px; outline:none; height:32px;">+ تسک جدید</button>' +
  '</section>';

  if (!tasks.length) {
    return html + '<section class="card empty-state" style="padding:40px 20px; text-align:center; border-radius:4px;">' +
      '<h2 style="margin-bottom:6px; font-size:1.1rem;">هنوز تسکی نساخته‌ای</h2>' +
      '<p style="margin-bottom:16px; opacity:0.7; font-size:0.85rem;">برای شروع ارزیابی روزانه، تسک جدیدی ایجاد کنید.</p>' +
      '<button class="btn primary" data-action="open-task" style="padding:6px 16px; border-radius:3px;">ساخت اولین تسک</button>' +
    '</section>';
  }

  html += '<div class="task-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:14px;">';

  for (const t of tasks) {
    const a30 = taskPeriodAnalysis(repo, t, isoOf(addDays(new Date(), -29)), tIso);
    const wk = taskWeekAnalysis(repo, t);
    const st = streakOf(repo, t.id, tIso);
    const cnt = repo.entriesForTask(t.id).length;
    let last = '';
    for (const e of repo.entriesForTask(t.id)) if (!last || e.date > last) last = e.date;
    const lastLbl = !last
      ? 'بدون ثبت'
      : last === tIso
        ? 'امروز'
        : (Math.round((isoToDate(tIso).getTime() - isoToDate(last).getTime()) / 864e5) === 1
          ? 'دیروز'
          : faNum(Math.round((isoToDate(tIso).getTime() - isoToDate(last).getTime()) / 864e5)) + ' روز پیش');
    const sparkDays = a30.days.slice(-14);

    html += '<article class="card task-card" style="--task:' + t.color + '; padding:14px 16px; border-radius:4px; border-top:3px solid var(--task); display:flex; flex-direction:column; gap:10px;">' +
      
      /* هدر فشرده تسک */
      '<header style="display:flex; justify-content:space-between; align-items:center; gap:8px;">' +
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span class="dot" style="width:7px; height:7px; border-radius:1px; background:var(--task); display:inline-block;"></span>' +
          '<h3 style="margin:0; font-size:1.05rem; font-weight:700;">' + esc(t.name) + '</h3>' +
        '</div>' +
        '<div style="border-radius:2px; transform:scale(0.9); transform-origin:left;">' + badge(a30.status) + '</div>' +
      '</header>' +

      /* جزئیات تک‌سطری برنامه و هدف */
      '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; opacity:0.75; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.04);">' +
        '<span>' + scheduleSummary(t) + '</span>' +
        '<span>' + (t.targetDailyHours > 0 ? 'هدف: ' + fmtHours(t.targetDailyHours, s) : 'بدون هدف') + '</span>' +
      '</div>' +

      /* متاداده‌های کلیدی در یک سطر بدون اشغال فضای عمودی */
      '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:3px;">' +
        '<span>زنجیره: <b>' + faNum(st) + ' روز</b></span>' +
        (wk ? '<span>۷ روز: <b>' + fmtHours(wk.mean, s) + '</b></span>' : '') +
        '<span>ثبت: <b>' + lastLbl + '</b></span>' +
      '</div>' +

      /* نمودار بندانگشتی کوتاه و کم‌ارتفاع */
      '<div style="margin:-2px 0;">' +
        lineChartHTML(sparkDays, [{ name: t.name, color: t.color, values: sparkDays.map(x => x.hours) }], { h: 46, clickable: false, hoverDay: true }, s) +
      '</div>' +

      /* فوتر و دکمه‌های عملیاتی */
      '<div class="t2-actions" style="display:flex; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05);">' +
        '<button class="btn small primary" data-action="open-entry" data-task="' + t.id + '" style="margin:0; padding:4px 10px; font-size:0.78rem; border-radius:3px; outline:none; height:28px;">+ ثبت ساعت</button>' +
        '<div style="display:inline-flex; gap:4px;">' +
          '<button class="btn small ghost" data-action="open-task" data-task="' + t.id + '" style="margin:0; padding:4px 8px; font-size:0.78rem; border-radius:3px; outline:none; height:28px;">ویرایش</button>' +
          '<button class="btn small ghost" data-action="delete-task" data-task="' + t.id + '" style="margin:0; padding:4px 8px; font-size:0.78rem; border-radius:3px; outline:none; height:28px; opacity:0.6;">حذف</button>' +
        '</div>' +
      '</div>' +

      '</article>';
  }

  html += '</div>';
  return html;
}