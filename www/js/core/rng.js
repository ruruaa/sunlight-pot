// 시드 난수 생성기.
// 같은 시드를 넣으면 어느 기기·브라우저에서든 똑같은 수열이 나온다.
// (Math.random은 쓰지 않는다. 쓰면 같은 스테이지가 사람마다 달라진다.)

// 문자열/숫자 시드를 32비트 정수로 바꾼다 (FNV-1a).
export function hashSeed(seed) {
  const str = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: 작고 빠르며 정수 연산만 써서 엔진 간 결과가 같다.
export function createRng(seed) {
  let state = hashSeed(seed);

  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // 0 이상 n 미만 정수
  function int(n) {
    return Math.floor(next() * n);
  }

  function pick(arr) {
    return arr[int(arr.length)];
  }

  // 배열을 제자리에서 섞고 그대로 돌려준다.
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { next, int, pick, shuffle };
}
