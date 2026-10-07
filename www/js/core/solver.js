// 풀이기: 퍼즐의 정답이 몇 개인지 센다.
//
// 퍼즐 형식 (generator.js와 공용)
//   size     N (격자 한 변)
//   regions  길이 N*N 배열. regions[r*N + c] = 그 칸의 화단 번호 (0..N-1)
//   clues    [{ r, c, value }] 숫자 팻말 목록
// 정답 형식
//   solution 길이 N 배열. solution[r] = r행 화분이 놓인 열 번호
//
// 규칙: 각 행·열·화단에 화분 1개, 화분끼리 8방향으로 붙지 않음,
//       팻말 칸에는 화분 없음, 팻말 숫자 = 주변 8칸 화분 수.

// 정답을 최대 limit개까지 찾아서 { count, solutions }로 돌려준다.
// "정답이 하나인가?"만 궁금하면 limit=2면 충분하다 (2개 찾는 순간 멈춤).
export function solve(puzzle, limit = 2) {
  const n = puzzle.size;
  const regions = puzzle.regions;
  const clues = puzzle.clues || [];

  const isClue = new Uint8Array(n * n);
  const clueValue = clues.map((k) => k.value);
  const clueCount = new Int8Array(clues.length);
  // 팻말에 닿는 마지막 행. 이 행까지 채우면 팻말 숫자가 확정된다.
  const clueLastRow = clues.map((k) => Math.min(k.r + 1, n - 1));
  // 칸마다 주변 팻말 번호 목록
  const cluesNear = Array.from({ length: n * n }, () => []);
  clues.forEach((k, i) => {
    isClue[k.r * n + k.c] = 1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = k.r + dr, c = k.c + dc;
        if (r >= 0 && r < n && c >= 0 && c < n) cluesNear[r * n + c].push(i);
      }
    }
  });

  // 화단마다 가장 아래 행. 그 행을 지나도록 화분이 없으면 막힌 길이다.
  const regionLastRow = new Int8Array(n);
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    if (r > regionLastRow[regions[i]]) regionLastRow[regions[i]] = r;
  }

  const colUsed = new Uint8Array(n);
  const regionUsed = new Uint8Array(n);
  const current = new Int8Array(n);
  const solutions = [];

  // r행까지 채운 상태가 아직 가능성이 있는지
  function stillPossible(r) {
    for (let reg = 0; reg < n; reg++) {
      if (!regionUsed[reg] && regionLastRow[reg] <= r) return false;
    }
    for (let i = 0; i < clues.length; i++) {
      const remainingRows = clueLastRow[i] - r; // 팻말 주변에 남은 행 수 (행마다 화분 최대 1개)
      if (remainingRows <= 0) {
        if (clueCount[i] !== clueValue[i]) return false;
      } else if (clueCount[i] + remainingRows < clueValue[i]) {
        return false;
      }
    }
    return true;
  }

  function place(r) {
    if (r === n) {
      solutions.push(Array.from(current));
      return solutions.length >= limit;
    }
    for (let c = 0; c < n; c++) {
      if (colUsed[c]) continue;
      if (r > 0 && Math.abs(current[r - 1] - c) <= 1) continue; // 윗줄 화분과 붙음
      const idx = r * n + c;
      if (isClue[idx]) continue;
      const reg = regions[idx];
      if (regionUsed[reg]) continue;

      const near = cluesNear[idx];
      let over = false;
      for (const k of near) if (++clueCount[k] > clueValue[k]) over = true;

      if (!over) {
        colUsed[c] = 1;
        regionUsed[reg] = 1;
        current[r] = c;
        const done = stillPossible(r) && place(r + 1);
        colUsed[c] = 0;
        regionUsed[reg] = 0;
        if (done) {
          for (const k of near) clueCount[k]--;
          return true;
        }
      }
      for (const k of near) clueCount[k]--;
    }
    return false;
  }

  place(0);
  return { count: solutions.length, solutions };
}

export function countSolutions(puzzle, limit = 2) {
  return solve(puzzle, limit).count;
}

export function hasUniqueSolution(puzzle) {
  return countSolutions(puzzle, 2) === 1;
}

// 정답이 규칙을 모두 지키는지 직접 확인한다 (테스트·디버그용).
export function isValidSolution(puzzle, solution) {
  const n = puzzle.size;
  if (solution.length !== n) return false;
  const cols = new Set(solution);
  if (cols.size !== n) return false;
  const regs = new Set(solution.map((c, r) => puzzle.regions[r * n + c]));
  if (regs.size !== n) return false;
  for (let r = 1; r < n; r++) if (Math.abs(solution[r] - solution[r - 1]) <= 1) return false;
  for (const k of puzzle.clues || []) {
    if (solution[k.r] === k.c) return false;
    if (clueValueFor(n, solution, k.r, k.c) !== k.value) return false;
  }
  return true;
}

// 정답 기준으로 (r, c) 칸 주변 8칸의 화분 수
export function clueValueFor(n, solution, r, c) {
  let count = 0;
  for (let rr = Math.max(0, r - 1); rr <= Math.min(n - 1, r + 1); rr++) {
    const cc = solution[rr];
    if (Math.abs(cc - c) <= 1 && !(rr === r && cc === c)) count++;
  }
  return count;
}
