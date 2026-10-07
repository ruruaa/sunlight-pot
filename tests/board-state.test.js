import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoardState, EMPTY, MARK, POT, AUTO_MARK } from '../www/js/game/board-state.js';
import { getStagePuzzle } from '../www/js/game/levels.js';

const at = (p, r, c) => r * p.size + c;
const freeCell = (s) => [...s.cells.keys()].find((i) => !s.isClue(i));

test('탭: 빈칸 → X → 화분 → 빈칸', () => {
  const s = new BoardState(getStagePuzzle(1, 1));
  const i = freeCell(s);
  s.tap(i); assert.equal(s.cells[i], MARK);
  s.tap(i); assert.equal(s.cells[i], POT);
  s.tap(i); assert.equal(s.cells[i], EMPTY);
});

test('팻말 칸은 탭해도 바뀌지 않는다', () => {
  const p = getStagePuzzle(2, 1);
  const s = new BoardState(p);
  const k = p.clues[0];
  assert.equal(s.tap(at(p, k.r, k.c)), false);
  assert.equal(s.cells[at(p, k.r, k.c)], EMPTY);
  assert.equal(s.canUndo(), false);
});

test('되돌리기와 처음부터', () => {
  const s = new BoardState(getStagePuzzle(1, 1));
  const i = freeCell(s);
  s.tap(i); s.tap(i);
  assert.ok(s.undo()); assert.equal(s.cells[i], MARK);
  s.tap(i);
  assert.ok(s.reset()); assert.equal(s.cells[i], EMPTY);
  assert.ok(s.undo()); assert.equal(s.cells[i], POT); // 처음부터도 되돌릴 수 있다
  s.undo(); s.undo();
  assert.equal(s.undo(), false);
});

test('자동 X: 같은 행·열·화단과 주변 칸, 화분을 빼면 사라진다', () => {
  const p = getStagePuzzle(1, 1);
  const s = new BoardState(p, { autoMark: true });
  const r = 2, c = p.solution[2], i = at(p, r, c);
  s.tap(i); s.tap(i);
  const shown = s.displayStates();
  for (let j = 0; j < p.size * p.size; j++) {
    if (j === i) continue;
    const jr = Math.floor(j / p.size), jc = j % p.size;
    const attacked = jr === r || jc === c || p.regions[j] === p.regions[i] ||
      (Math.abs(jr - r) <= 1 && Math.abs(jc - c) <= 1);
    assert.equal(shown[j], attacked ? AUTO_MARK : EMPTY, `칸 ${jr},${jc}`);
  }
  // 자동 X 칸은 한 번 탭하면 바로 화분
  const j = at(p, r, (c + 1) % p.size);
  s.tap(j); assert.equal(s.cells[j], POT);
  s.undo();
  s.tap(i); // 화분 → 빈칸
  assert.ok(s.displayStates().every((v) => v !== AUTO_MARK));
});

test('붙어 있거나 같은 줄·화단인 화분은 시든다', () => {
  const p = getStagePuzzle(1, 1);
  const s = new BoardState(p);
  const a = at(p, 0, p.solution[0]);
  s.cells[a] = POT;
  assert.equal(s.analyze().wilted.size, 0);
  const b = at(p, 1, p.solution[0]); // 바로 아래 칸
  s.cells[b] = POT;
  assert.deepEqual([...s.analyze().wilted].sort(), [a, b].sort());
});

test('팻말 숫자보다 화분이 많으면 넘침', () => {
  let p;
  for (let st = 1; st <= 20 && !p; st++) {
    const q = getStagePuzzle(2, st);
    if (q.clues.some((k) => k.value === 0)) p = q;
  }
  assert.ok(p, '0 팻말이 있는 스테이지가 필요');
  const s = new BoardState(p);
  const idx = p.clues.findIndex((k) => k.value === 0);
  const k = p.clues[idx];
  const r = k.r > 0 ? k.r - 1 : k.r + 1;
  s.cells[at(p, r, k.c)] = POT;
  assert.ok(s.analyze().overClues.has(idx));
});

test('정답대로 놓으면 완성, 하나라도 빠지면 미완성', () => {
  for (const [ch, st] of [[1, 1], [2, 5], [6, 20]]) {
    const p = getStagePuzzle(ch, st);
    const s = new BoardState(p);
    p.solution.forEach((c, r) => { s.cells[at(p, r, c)] = POT; });
    assert.equal(s.analyze().solved, true);
    s.cells[at(p, 0, p.solution[0])] = EMPTY;
    assert.equal(s.analyze().solved, false);
  }
});
