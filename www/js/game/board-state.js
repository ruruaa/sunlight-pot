// 플레이 중인 판의 상태. 화면 코드와 분리된 순수 로직이라 node 테스트로 검사한다.
//
// 칸에 저장되는 값은 세 가지다: 빈칸, X(빈 땅 표시), 화분.
// "자동 X"는 저장하지 않고 화분 위치에서 매번 계산한다.
// 그래서 화분을 빼면 그 화분이 찍은 자동 X도 같이 사라진다.

export const EMPTY = 0;
export const MARK = 1; // 직접 찍은 X
export const POT = 2;
export const AUTO_MARK = 3; // 화면 표시 전용: 자동으로 찍힌 X

export class BoardState {
  constructor(puzzle, { autoMark = false } = {}) {
    this.puzzle = puzzle;
    this.n = puzzle.size;
    this.autoMark = autoMark;
    this.cells = new Uint8Array(this.n * this.n);
    this.history = [];
    this.clueAt = new Map(puzzle.clues.map((k, i) => [k.r * this.n + k.c, i]));
  }

  isClue(i) {
    return this.clueAt.has(i);
  }

  potIndices() {
    const out = [];
    this.cells.forEach((v, i) => { if (v === POT) out.push(i); });
    return out;
  }

  // 화분 때문에 화분을 놓을 수 없게 된 칸 (같은 행·열·화단, 주변 8칸)
  blockedByPots() {
    const { n } = this;
    const regions = this.puzzle.regions;
    const blocked = new Uint8Array(n * n);
    for (const p of this.potIndices()) {
      const pr = Math.floor(p / n), pc = p % n;
      for (let i = 0; i < n * n; i++) {
        if (i === p) continue;
        const r = Math.floor(i / n), c = i % n;
        if (r === pr || c === pc || regions[i] === regions[p] ||
            (Math.abs(r - pr) <= 1 && Math.abs(c - pc) <= 1)) blocked[i] = 1;
      }
    }
    return blocked;
  }

  // 화면에 보일 상태 (팻말 칸은 null)
  displayStates() {
    const blocked = this.autoMark ? this.blockedByPots() : null;
    return Array.from(this.cells, (v, i) => {
      if (this.isClue(i)) return null;
      if (v === EMPTY && blocked && blocked[i]) return AUTO_MARK;
      return v;
    });
  }

  // 탭: 빈칸 → X → 화분 → 빈칸. 자동 X 칸은 이미 X가 보이므로 바로 화분이 된다.
  tap(i) {
    if (this.isClue(i)) return false;
    const shown = this.displayStates()[i];
    const next = shown === EMPTY ? MARK : (shown === MARK || shown === AUTO_MARK) ? POT : EMPTY;
    this.history.push(this.cells.slice());
    this.cells[i] = next;
    return true;
  }

  undo() {
    if (!this.history.length) return false;
    this.cells = this.history.pop();
    return true;
  }

  canUndo() {
    return this.history.length > 0;
  }

  // 처음부터 다시. 이것도 되돌리기로 취소할 수 있다.
  reset() {
    if (this.cells.every((v) => v === EMPTY)) return false;
    this.history.push(this.cells.slice());
    this.cells = new Uint8Array(this.n * this.n);
    return true;
  }

  // 규칙 검사: 시든 화분, 숫자가 넘친 팻말, 완성 여부
  analyze() {
    const { n } = this;
    const regions = this.puzzle.regions;
    const pots = this.potIndices();
    const wilted = new Set();

    for (let a = 0; a < pots.length; a++) {
      for (let b = a + 1; b < pots.length; b++) {
        const p = pots[a], q = pots[b];
        const pr = Math.floor(p / n), pc = p % n, qr = Math.floor(q / n), qc = q % n;
        if (pr === qr || pc === qc || regions[p] === regions[q] ||
            (Math.abs(pr - qr) <= 1 && Math.abs(pc - qc) <= 1)) {
          wilted.add(p);
          wilted.add(q);
        }
      }
    }

    const clueCounts = this.puzzle.clues.map((k) => {
      let count = 0;
      for (let r = k.r - 1; r <= k.r + 1; r++) {
        for (let c = k.c - 1; c <= k.c + 1; c++) {
          if (r >= 0 && r < n && c >= 0 && c < n && this.cells[r * n + c] === POT) count++;
        }
      }
      return count;
    });
    const overClues = new Set();
    clueCounts.forEach((count, i) => { if (count > this.puzzle.clues[i].value) overClues.add(i); });

    const solved = pots.length === n && wilted.size === 0 &&
      clueCounts.every((count, i) => count === this.puzzle.clues[i].value);

    return { wilted, overClues, clueCounts, solved };
  }
}
