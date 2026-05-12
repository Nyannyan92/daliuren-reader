import type { CourseChart } from './types';

function safe(value: string | undefined | null, fallback = '未提供'): string {
  const v = (value ?? '').trim();
  return v ? v : fallback;
}

function pillarsLine(c: CourseChart): string {
  const { pillars } = c;
  return `年柱 ${safe(pillars.year)} / 月柱 ${safe(pillars.month)} / 日柱 ${safe(pillars.day)} / 时柱 ${safe(pillars.hour)}`;
}

interface CourseRowMeta {
  label: string;
  col2Name: string;
  col3Name: string;
}

function courseLine(meta: CourseRowMeta, row: CourseChart['course']['one']): string {
  return [
    `${meta.label}：`,
    `天将 ${safe(row.upperGod)}`,
    ` ／ ${meta.col2Name} ${safe(row.upper)}`,
    ` ／ ${meta.col3Name} ${safe(row.lower)}`,
  ].join('');
}

function passageLine(label: string, p: { branch: string; god?: string }): string {
  return `${label}：${safe(p.branch)}${p.god ? ` 乘 ${safe(p.god)}` : ''}`;
}

export function formatChartAsUserMessage(chart: CourseChart): string {
  const lines: string[] = [];

  lines.push('【用户提交课盘】');
  lines.push('');
  lines.push(`所测之事：${safe(chart.question)}`);
  lines.push('');
  lines.push(`四柱：${pillarsLine(chart)}`);
  lines.push(`月将：${safe(chart.monthGeneral)}        占时：${safe(chart.hourBranch)}        性别：${safe(chart.sex)}`);
  lines.push(`贵人天盘位（贵人所乘的天盘字）：${safe(chart.noblePalace)}`);
  lines.push('');

  const courseRows = [chart.course.one, chart.course.two, chart.course.three, chart.course.four];
  const courseHasAny = courseRows.some(
    (r) => (r.upperGod || '').trim() || (r.upper || '').trim() || (r.lower || '').trim(),
  );
  if (courseHasAny) {
    lines.push('四课（自右至左：一二三四，每课包含「天将 / 天盘字 / 地盘字」三列）：');
    lines.push(`  ${courseLine({ label: '一课', col2Name: '干阳', col3Name: '日干' }, chart.course.one)}`);
    lines.push(`  ${courseLine({ label: '二课', col2Name: '干阴', col3Name: '干阳' }, chart.course.two)}`);
    lines.push(`  ${courseLine({ label: '三课', col2Name: '支阳', col3Name: '日支' }, chart.course.three)}`);
    lines.push(`  ${courseLine({ label: '四课', col2Name: '支阴', col3Name: '支阳' }, chart.course.four)}`);
  } else {
    lines.push('四课：用户未提供。');
  }
  lines.push('');

  const passages = [chart.passages.first, chart.passages.middle, chart.passages.last];
  const passagesHasAny = passages.some((p) => (p.branch || '').trim());
  if (passagesHasAny) {
    lines.push('三传：');
    lines.push(`  ${passageLine('初传（发用）', chart.passages.first)}`);
    lines.push(`  ${passageLine('中传', chart.passages.middle)}`);
    lines.push(`  ${passageLine('末传', chart.passages.last)}`);
  } else {
    lines.push('三传：用户未提供。');
  }
  lines.push('');

  lines.push(`年命：${safe(chart.natalYear)}        行年：${safe(chart.currentYear)}        旬空 / 空亡位：${safe(chart.voidPalaces)}`);

  if (chart.notes?.trim()) {
    lines.push('');
    lines.push(`补充信息：${chart.notes.trim()}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('注意事项：');
  lines.push('- 用户输入的「贵人天盘位」是贵人这个天将所乘的天盘字。请先根据月将、占时之间的加临关系，反推该天盘字落在地盘哪一宫，再按 SKILL 第 1 步规则判断顺排或逆排。');
  if (courseHasAny) {
    lines.push('- 一课地盘字应与四柱中的日干一致；三课地盘字应与四柱中的日支一致；二课地盘字应与一课天盘字一致；四课地盘字应与三课天盘字一致。若发现不一致，请直接指出并请用户复核，不要凭空修正。');
  }
  if (!courseHasAny || !passagesHasAny) {
    lines.push('- 用户未提供四课或三传中的部分内容。请根据已提供的信息（四柱、月将、占时、贵人天盘位等）：先尝试自行排出天地盘、四课与三传，并把推算结果写入"待确认课盘"，请用户核对；若信息不足以推算，则向用户列出还缺哪些字段。不要在用户确认前进入解读环节。');
  }
  lines.push('');
  lines.push('请按 SKILL 中"AI 执行规则"的流程：');
  lines.push('1. 先排十二贵神（依据贵人天盘位反推地盘宫，决定顺/逆）；');
  lines.push('2. 输出"待确认课盘"，标明每个四课、三传位置上所乘的贵神；');
  lines.push('3. 等待我回复"确认"或纠错后再开始六步法解读。');

  return lines.join('\n');
}
