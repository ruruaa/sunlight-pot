// 기기 저장소. 화면·게임 코드는 이 파일의 함수만 쓴다.
//
// 지금은 웹용(localStorage). 앱으로 바꿀 때는 이 파일만
// Capacitor Preferences로 바꾸면 된다. 그래서 처음부터 비동기(Promise) 함수로 둔다.

const PREFIX = 'sunlight-pot:';

export async function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 저장이 막힌 환경(사생활 보호 모드 등)에서는 조용히 넘어간다
  }
}
