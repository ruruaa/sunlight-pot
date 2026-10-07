// 1단계 확인용 화면: 생성된 퍼즐을 보여주고 정답이 하나인지 검사한다.
// 개발용 화면 (dev.html).

import { solve, isValidSolution } from './core/solver.js';
import { generatePuzzle } from './core/generator.js';
import { CHAPTERS, STAGES_PER_CHAPTER, stageConfig, dailyConfig, todayKey } from './game/levels.js';

const $ = (sel) => document.querySelector(sel);
const chapterSel = $('#chapter');
const stageSel = $('#stage');
const dateInput = $('#date');
const board = $('#board');
const info = $('#info');
const answerBtn = $('#toggle-answer');

let mode = 'stage';
let showAnswer = false;

CHAPTERS.forEach((ch) => {
  chapterSel.add(new Option(`${ch.id}장 · ${ch.size}×${ch.size}${ch.withClues ? '' : ' (팻말 없음)'}`, ch.id));
});
for (let s = 1; s <= STAGES_PER_CHAPTER; s++) stageSel.add(new Option(`${s}`, s));
dateInput.value = todayKey();

function currentConfig() {
  if (mode === 'daily') return { label: `데일리 ${dateInput.value}`, config: dailyConfig(dateInput.value) };
  const ch = Number(chapterSel.value), st = Number(stageSel.value);
  return { label: `${ch}장 ${st}스테이지`, config: stageConfig(ch, st) };
}

function render() {
  const { label, config } = currentConfig();
  const t0 = performance.now();
  const puzzle = generatePuzzle(config);
  const genMs = performance.now() - t0;
  const t1 = performance.now();
  const { count } = solve(puzzle, 2);
  const solveMs = performance.now() - t1;

  drawBoard(puzzle);

  const unique = count === 1;
  info.innerHTML = '';
  const rows = [
    ['문제', label],
    ['크기', `${puzzle.size}×${puzzle.size}`],
    ['팻말', `${puzzle.clues.length}개${config.extraClues ? ` (난이도용 여분 ${config.extraClues}개 포함)` : ''}`],
    ['정답 개수', unique ? '1개 ✓' : `${count}개 이상 ✗`, unique ? 'ok' : 'bad'],
    ['정답 규칙', isValidSolution(puzzle, puzzle.solution) ? '지킴 ✓' : '위반 ✗'],
    ['만든 시간', `${genMs.toFixed(1)}ms (검사 ${solveMs.toFixed(1)}ms)`],
  ];
  for (const [k, v, cls] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    if (cls) dd.className = cls;
    info.append(dt, dd);
  }
}

function drawBoard(p) {
  const n = p.size;
  board.style.setProperty('--n', n);
  board.innerHTML = '';
  const clueAt = new Map(p.clues.map((k) => [k.r * n + k.c, k.value]));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.background = `var(--bed-${p.regions[i]})`;
      if (r > 0 && p.regions[i - n] !== p.regions[i]) cell.classList.add('edge-top');
      if (c > 0 && p.regions[i - 1] !== p.regions[i]) cell.classList.add('edge-left');
      if (clueAt.has(i)) {
        const sign = document.createElement('span');
        sign.className = 'sign';
        sign.textContent = clueAt.get(i);
        cell.append(sign);
      } else if (showAnswer && p.solution[r] === c) {
        const pot = document.createElement('span');
        pot.className = 'pot';
        pot.textContent = '🪴';
        cell.append(pot);
      }
      board.append(cell);
    }
  }
}

function step(delta) {
  if (mode === 'daily') {
    const d = new Date(`${dateInput.value}T00:00:00`);
    d.setDate(d.getDate() + delta);
    dateInput.value = todayKey(d);
  } else {
    let ch = Number(chapterSel.value), st = Number(stageSel.value) + delta;
    if (st > STAGES_PER_CHAPTER && ch < CHAPTERS.length) { ch++; st = 1; }
    if (st < 1 && ch > 1) { ch--; st = STAGES_PER_CHAPTER; }
    st = Math.min(Math.max(st, 1), STAGES_PER_CHAPTER);
    chapterSel.value = ch;
    stageSel.value = st;
  }
  render();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-on', t === tab));
    document.querySelectorAll('[data-show]').forEach((el) => { el.hidden = el.dataset.show !== mode; });
    render();
  });
});
chapterSel.addEventListener('change', render);
stageSel.addEventListener('change', render);
dateInput.addEventListener('change', render);
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
answerBtn.addEventListener('click', () => {
  showAnswer = !showAnswer;
  answerBtn.setAttribute('aria-pressed', String(showAnswer));
  answerBtn.textContent = showAnswer ? '정답 끄기' : '정답 보기';
  render();
});

$('#check-all').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const out = $('#check-result');
  btn.disabled = true;
  out.textContent = '검사 중…';
  await new Promise((r) => setTimeout(r, 30)); // 화면 갱신할 틈

  const t0 = performance.now();
  const fails = [];
  let total = 0;
  const clueStats = [];
  for (const ch of CHAPTERS) {
    const counts = [];
    for (let s = 1; s <= STAGES_PER_CHAPTER; s++) {
      const p = generatePuzzle(stageConfig(ch.id, s));
      total++;
      counts.push(p.clues.length);
      if (solve(p, 2).count !== 1 || !isValidSolution(p, p.solution)) fails.push(`${ch.id}장 ${s}`);
    }
    if (ch.withClues) clueStats.push(`${ch.id}장 팻말 ${Math.min(...counts)}~${Math.max(...counts)}개`);
  }
  const start = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const p = generatePuzzle(dailyConfig(todayKey(date)));
    total++;
    if (solve(p, 2).count !== 1) fails.push(`데일리 ${todayKey(date)}`);
  }
  const ms = performance.now() - t0;

  out.className = `check-result ${fails.length ? 'bad' : 'ok'}`;
  out.textContent = fails.length
    ? `✗ ${fails.length}개 실패: ${fails.join(', ')}`
    : `✓ ${total}개 모두 정답이 딱 하나입니다 (${(ms / 1000).toFixed(1)}초)\n${clueStats.join('\n')}`;
  btn.disabled = false;
});

render();
