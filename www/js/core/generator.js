// 퍼즐 생성기.
//
// 순서 (기획서 5번)
//   1) 정답 화분 위치를 먼저 정한다 (행·열 1개씩, 서로 안 붙게).
//   2) 각 화분에서 화단을 무작위로 넓혀 N개 구역으로 나눈다.
//   3) 풀이기로 정답이 하나인지 검사한다.
//      - 팻말 없는 챕터: 정답이 하나가 될 때까지 1)~2)를 다시 한다.
//      - 팻말 있는 챕터: 다른 정답을 막는 칸에 팻말을 하나씩 추가한다.
//        그다음 빼도 정답이 하나로 유지되는 팻말은 다시 뺀다 (최소 팻말 = 가장 어려움).
//   4) 난이도 조절용으로 여분 팻말(extraClues)을 더 꽂는다. 많을수록 쉽다.
//
// 같은 seed면 항상 같은 퍼즐이 나온다.
// ⚠ 출시 후 이 파일의 로직을 바꾸면 모든 스테이지 문제가 바뀐다.
//   바꿔야 하면 GENERATOR_VERSION을 올리고 옛 버전을 따로 남겨둘 것.

import { createRng } from './rng.js';
import { solve, clueValueFor } from './solver.js';

export const GENERATOR_VERSION = 1;

/**
 * @param {object} opts
 * @param {number} opts.size        격자 크기 N (5~10)
 * @param {string|number} opts.seed 시드 (예: "stage-2-7", "daily-2026-10-07")
 * @param {boolean} [opts.withClues=true] 팻말을 쓸지 (챕터 1은 false)
 * @param {number} [opts.extraClues=0]    최소 팻말 위에 더 꽂을 여분 팻말 수
 * @param {number} [opts.maxAttempts=5000]
 * @returns {{size:number, seed:string, regions:number[], clues:{r:number,c:number,value:number}[],
 *            solution:number[], attempts:number, version:number}}
 */
export function generatePuzzle({ size, seed, withClues = true, extraClues = 0, maxAttempts = 5000 }) {
  if (!Number.isInteger(size) || size < 4 || size > 12) throw new Error(`지원하지 않는 크기: ${size}`);
  const rng = createRng(`v${GENERATOR_VERSION}|${size}|${withClues ? 'c' : 'n'}|${seed}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const solution = placePots(size, rng);
    const regions = growRegions(size, solution, rng);
    const base = { size, regions, clues: [] };

    let clues;
    if (withClues) {
      clues = placeClues(base, solution, rng);
      clues = minimizeClues({ ...base, clues }, rng);
      clues = addExtraClues({ ...base, clues }, solution, extraClues, rng);
    } else {
      if (solve(base, 2).count !== 1) continue;
      clues = [];
    }

    clues.sort((a, b) => a.r - b.r || a.c - b.c);
    return { size, seed: String(seed), regions, clues, solution, attempts: attempt, version: GENERATOR_VERSION };
  }
  throw new Error(`퍼즐 생성 실패 (size=${size}, seed=${seed})`);
}

// 1) 정답 화분 배치: 행마다 열 하나씩, 위아래 행과 열 차이가 2 이상.
function placePots(n, rng) {
  const solution = new Array(n);
  const used = new Array(n).fill(false);

  function fill(r) {
    if (r === n) return true;
    const cols = rng.shuffle([...Array(n).keys()]);
    for (const c of cols) {
      if (used[c]) continue;
      if (r > 0 && Math.abs(solution[r - 1] - c) <= 1) continue;
      used[c] = true;
      solution[r] = c;
      if (fill(r + 1)) return true;
      used[c] = false;
    }
    return false;
  }

  fill(0);
  return solution;
}

// 2) 화단 나누기: 화분 칸에서 시작해 상하좌우로 한 칸씩 무작위로 넓힌다.
function growRegions(n, solution, rng) {
  const regions = new Array(n * n).fill(-1);
  const frontier = Array.from({ length: n }, () => []);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const claim = (reg, r, c) => {
    regions[r * n + c] = reg;
    for (const [dr, dc] of dirs) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) frontier[reg].push(rr * n + cc);
    }
  };

  solution.forEach((c, r) => claim(r, r, c));

  let left = n * n - n;
  while (left > 0) {
    // 넓힐 수 있는 화단 중 하나를 고르고, 그 경계에서 빈 칸 하나를 가져간다
    const growable = [];
    for (let reg = 0; reg < n; reg++) {
      frontier[reg] = frontier[reg].filter((i) => regions[i] === -1);
      if (frontier[reg].length) growable.push(reg);
    }
    const reg = rng.pick(growable);
    const idx = rng.pick(frontier[reg]);
    claim(reg, Math.floor(idx / n), idx % n);
    left--;
  }
  return regions;
}

// 3) 팻말 추가: 다른 정답이 있으면, 그 정답을 탈락시키는 칸 중 하나에 팻말을 꽂는다.
//    탈락시키는 칸 = 정답 화분이 아닌 칸 중에서
//      - 다른 정답에서는 거기 화분이 있거나 (팻말 칸엔 화분 금지)
//      - 주변 화분 수가 진짜 정답과 다른 칸
function placeClues(base, solution, rng) {
  const n = base.size;
  const clues = [];
  const taken = new Set();

  for (;;) {
    const puzzle = { ...base, clues };
    const { count, solutions } = solve(puzzle, 2);
    if (count === 1) return clues;

    const other = solutions.find((s) => s.some((c, r) => c !== solution[r]));
    const candidates = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (solution[r] === c || taken.has(r * n + c)) continue;
        if (other[r] === c || clueValueFor(n, other, r, c) !== clueValueFor(n, solution, r, c)) {
          candidates.push(r * n + c);
        }
      }
    }
    const idx = rng.pick(candidates);
    const r = Math.floor(idx / n), c = idx % n;
    taken.add(idx);
    clues.push({ r, c, value: clueValueFor(n, solution, r, c) });
  }
}

// 빼도 정답이 하나로 유지되는 팻말은 뺀다.
function minimizeClues(puzzle, rng) {
  let clues = puzzle.clues.slice();
  for (const clue of rng.shuffle(puzzle.clues.slice())) {
    const without = clues.filter((k) => k !== clue);
    if (solve({ ...puzzle, clues: without }, 2).count === 1) clues = without;
  }
  return clues;
}

// 난이도용 여분 팻말 (정답 화분이 아닌 빈 칸에 무작위로)
function addExtraClues(puzzle, solution, extra, rng) {
  const n = puzzle.size;
  const clues = puzzle.clues.slice();
  if (extra <= 0) return clues;
  const taken = new Set(clues.map((k) => k.r * n + k.c));
  const free = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (solution[r] !== c && !taken.has(r * n + c)) free.push(r * n + c);
    }
  }
  rng.shuffle(free);
  for (const idx of free.slice(0, extra)) {
    const r = Math.floor(idx / n), c = idx % n;
    clues.push({ r, c, value: clueValueFor(n, solution, r, c) });
  }
  return clues;
}
