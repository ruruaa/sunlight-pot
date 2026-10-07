import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../www/js/core/rng.js';
import { solve, isValidSolution, clueValueFor } from '../www/js/core/solver.js';
import { generatePuzzle } from '../www/js/core/generator.js';
import { CHAPTERS, STAGES_PER_CHAPTER, stageConfig, dailyConfig, getStagePuzzle } from '../www/js/game/levels.js';

// 풀이기와 무관한 무식한 방법: 가능한 모든 배치를 다 세어본다.
function bruteForceCount(puzzle) {
  const n = puzzle.size;
  let count = 0;
  const perm = [];
  const used = new Array(n).fill(false);
  (function rec(r) {
    if (r === n) { if (isValidSolution(puzzle, perm)) count++; return; }
    for (let c = 0; c < n; c++) {
      if (used[c]) continue;
      used[c] = true; perm[r] = c; rec(r + 1); used[c] = false;
    }
  })(0);
  return count;
}

test('같은 시드는 같은 난수, 다른 시드는 다른 난수', () => {
  const a = createRng('x'), b = createRng('x'), c = createRng('y');
  const sa = Array.from({ length: 5 }, a.next);
  assert.deepEqual(sa, Array.from({ length: 5 }, b.next));
  assert.notDeepEqual(sa, Array.from({ length: 5 }, c.next));
});

test('풀이기 정답 개수가 무식한 방법과 일치한다 (무작위 퍼즐 300개)', () => {
  const rng = createRng('solver-check');
  for (let i = 0; i < 300; i++) {
    const n = 5 + rng.int(2);
    const regions = Array.from({ length: n * n }, () => rng.int(n));
    for (let k = 0; k < n; k++) regions[k * n + rng.int(n)] = k; // 모든 화단 번호가 최소 1칸
    const clues = [];
    for (let k = rng.int(4); k > 0; k--) clues.push({ r: rng.int(n), c: rng.int(n), value: rng.int(3) });
    const puzzle = { size: n, regions, clues };
    assert.equal(solve(puzzle, 1000).count, bruteForceCount(puzzle), `퍼즐 ${i}`);
  }
});

test('모든 스테이지: 정답이 정확히 하나이고, 규칙을 지킨다', () => {
  for (const ch of CHAPTERS) {
    for (let s = 1; s <= STAGES_PER_CHAPTER; s++) {
      const p = getStagePuzzle(ch.id, s);
      const label = `챕터 ${ch.id} 스테이지 ${s}`;
      assert.equal(p.size, ch.size, label);
      assert.ok(isValidSolution(p, p.solution), `${label} 정답이 규칙 위반`);
      const { count, solutions } = solve(p, 2);
      assert.equal(count, 1, `${label} 정답 ${count}개`);
      assert.deepEqual(solutions[0], p.solution, label);
      if (!ch.withClues) assert.equal(p.clues.length, 0, `${label} 챕터 1에 팻말`);
    }
  }
});

test('화단: N개, 각 화단은 이어져 있고 정답 화분을 하나씩 품는다', () => {
  for (const ch of CHAPTERS) {
    const p = getStagePuzzle(ch.id, 1);
    const n = p.size;
    for (let reg = 0; reg < n; reg++) {
      const cells = p.regions.map((v, i) => (v === reg ? i : -1)).filter((i) => i >= 0);
      assert.ok(cells.length > 0);
      const seen = new Set([cells[0]]);
      const stack = [cells[0]];
      while (stack.length) {
        const i = stack.pop(), r = Math.floor(i / n), c = i % n;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc, j = rr * n + cc;
          if (rr >= 0 && rr < n && cc >= 0 && cc < n && p.regions[j] === reg && !seen.has(j)) { seen.add(j); stack.push(j); }
        }
      }
      assert.equal(seen.size, cells.length, `화단 ${reg}가 끊어져 있음`);
    }
  }
});

test('팻말: 화분 없는 칸에만, 숫자는 0~2이고 정답과 맞는다', () => {
  for (const ch of CHAPTERS.filter((c) => c.withClues)) {
    for (let s = 1; s <= STAGES_PER_CHAPTER; s++) {
      const p = getStagePuzzle(ch.id, s);
      const keys = new Set();
      for (const k of p.clues) {
        assert.notEqual(p.solution[k.r], k.c);
        assert.ok(k.value >= 0 && k.value <= 2);
        assert.equal(k.value, clueValueFor(p.size, p.solution, k.r, k.c));
        keys.add(k.r * p.size + k.c);
      }
      assert.equal(keys.size, p.clues.length, '팻말 위치 중복');
    }
  }
});

test('같은 스테이지는 언제 만들어도 같은 문제', () => {
  assert.deepEqual(getStagePuzzle(3, 7), getStagePuzzle(3, 7));
  assert.notDeepEqual(getStagePuzzle(3, 7).regions, getStagePuzzle(3, 8).regions);
  assert.deepEqual(generatePuzzle(dailyConfig('2026-10-07')), generatePuzzle(dailyConfig('2026-10-07')));
});

test('뒤 스테이지일수록 여분 팻말이 적다', () => {
  assert.ok(stageConfig(2, 1).extraClues > stageConfig(2, 20).extraClues);
  assert.equal(stageConfig(2, 20).extraClues, 0);
  assert.equal(stageConfig(1, 1).extraClues, 0);
});

test('데일리 챌린지 365일치 모두 8×8, 정답 하나', () => {
  const start = new Date(2026, 0, 1);
  for (let d = 0; d < 365; d++) {
    const date = new Date(start); date.setDate(d + 1);
    const key = date.toISOString().slice(0, 10);
    const p = generatePuzzle(dailyConfig(key));
    assert.equal(p.size, 8);
    assert.equal(solve(p, 2).count, 1, key);
  }
});
