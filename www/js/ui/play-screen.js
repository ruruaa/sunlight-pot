// 플레이 화면: 판 그리기, 탭 처리, 타이머, 클리어 표시.
// 규칙 판단은 BoardState가 하고, 여기서는 보여주기만 한다.

import { BoardState, MARK, POT, AUTO_MARK } from '../game/board-state.js';

// 화분 그림. 시들면 CSS로 잎을 늘어뜨리고 색을 바꾼다.
const POT_SVG = `
<svg class="pot-svg" viewBox="0 0 40 40" aria-hidden="true">
  <rect class="pot-rim" x="8" y="20" width="24" height="5" rx="1.5" />
  <path class="pot-body" d="M10 25 H30 L27.5 37 H12.5 Z" />
  <g class="plant">
    <path class="stem" d="M20 21 V9" />
    <path class="leaf leaf-l" d="M20 17 C14 17 9 13 8 8 C14 8 19 11 20 17 Z" />
    <path class="leaf leaf-r" d="M20 15 C26 15 31 11 32 6 C26 6 21 9 20 15 Z" />
    <path class="leaf leaf-c" d="M20 11 C17 8 17 4 20 1 C23 4 23 8 20 11 Z" />
  </g>
</svg>`;

export function createPlayScreen({ boardEl, timerEl, undoBtn, resetBtn, onSolved }) {
  let state = null;
  let cells = [];
  let shown = [];
  let elapsed = 0;
  let runningSince = null;
  let solved = false;
  let tickHandle = null;

  function load(puzzle, { autoMark }) {
    state = new BoardState(puzzle, { autoMark });
    solved = false;
    buildBoard();
    elapsed = 0;
    startTimer();
    refresh();
  }

  function buildBoard() {
    const { n, puzzle } = state;
    boardEl.style.setProperty('--n', n);
    boardEl.classList.remove('is-solved');
    boardEl.innerHTML = '';
    cells = [];
    shown = new Array(n * n).fill(-1);
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n;
      const reg = puzzle.regions[i];
      const cell = document.createElement(state.isClue(i) ? 'div' : 'button');
      cell.className = 'cell';
      cell.style.background = `var(--bed-${reg})`;
      if (r > 0 && puzzle.regions[i - n] !== reg) cell.classList.add('edge-top');
      if (c > 0 && puzzle.regions[i - 1] !== reg) cell.classList.add('edge-left');
      if (state.isClue(i)) {
        const k = puzzle.clues[state.clueAt.get(i)];
        cell.innerHTML = `<span class="sign">${k.value}</span>`;
        cell.setAttribute('aria-label', `${r + 1}행 ${c + 1}열 팻말 ${k.value}`);
      } else {
        cell.type = 'button';
        cell.dataset.i = i;
      }
      boardEl.append(cell);
      cells.push(cell);
    }
  }

  function refresh() {
    const display = state.displayStates();
    const { wilted, overClues, solved: nowSolved } = state.analyze();
    const { n } = state;

    display.forEach((v, i) => {
      const cell = cells[i];
      if (v === null) {
        cell.querySelector('.sign').classList.toggle('is-over', overClues.has(state.clueAt.get(i)));
        return;
      }
      if (shown[i] !== v) {
        shown[i] = v;
        cell.innerHTML = v === POT ? POT_SVG
          : v === MARK ? '<span class="mark">×</span>'
          : v === AUTO_MARK ? '<span class="mark is-auto">×</span>'
          : '';
        const label = v === POT ? '화분' : (v === MARK || v === AUTO_MARK) ? 'X 표시' : '빈칸';
        cell.setAttribute('aria-label', `${Math.floor(i / n) + 1}행 ${(i % n) + 1}열 ${label}`);
      }
      cell.classList.toggle('is-wilted', wilted.has(i));
    });

    undoBtn.disabled = !state.canUndo() || solved;
    resetBtn.disabled = solved;

    if (nowSolved && !solved) {
      solved = true;
      stopTimer();
      boardEl.classList.add('is-solved');
      undoBtn.disabled = true;
      resetBtn.disabled = true;
      onSolved?.({ timeMs: elapsed });
    }
  }

  boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('button.cell');
    if (!cell || solved) return;
    if (state.tap(Number(cell.dataset.i))) refresh();
  });

  undoBtn.addEventListener('click', () => { if (!solved && state.undo()) refresh(); });
  resetBtn.addEventListener('click', () => { if (!solved && state.reset()) refresh(); });

  // 타이머: 화면이 가려지면(다른 앱으로 가면) 멈춘다
  function startTimer() {
    runningSince = document.hidden ? null : performance.now();
    clearInterval(tickHandle);
    tickHandle = setInterval(drawTimer, 250);
    drawTimer();
  }
  function pauseTimer() {
    if (runningSince !== null) elapsed += performance.now() - runningSince;
    runningSince = null;
  }
  function stopTimer() {
    pauseTimer();
    clearInterval(tickHandle);
    drawTimer();
  }
  function currentMs() {
    return elapsed + (runningSince !== null ? performance.now() - runningSince : 0);
  }
  function drawTimer() {
    timerEl.textContent = formatTime(currentMs());
  }
  document.addEventListener('visibilitychange', () => {
    if (solved || !state) return;
    if (document.hidden) pauseTimer();
    else runningSince = performance.now();
  });

  return {
    load,
    setAutoMark(on) {
      if (!state) return;
      state.autoMark = on;
      refresh();
    },
  };
}

export function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60), s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
