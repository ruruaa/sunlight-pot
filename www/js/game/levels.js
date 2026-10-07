// 챕터·스테이지·데일리 챌린지를 퍼즐 설정으로 바꿔준다.
// 화면 코드는 이 파일만 부르면 되고, 생성 방식은 몰라도 된다.

import { generatePuzzle } from '../core/generator.js';

export const STAGES_PER_CHAPTER = 20;

// 챕터 1은 팻말 없이 기본 규칙만, 챕터 2부터 팻말 등장
export const CHAPTERS = [
  { id: 1, size: 5, withClues: false },
  { id: 2, size: 6, withClues: true },
  { id: 3, size: 7, withClues: true },
  { id: 4, size: 8, withClues: true },
  { id: 5, size: 9, withClues: true },
  { id: 6, size: 10, withClues: true },
];

export const DAILY_SIZE = 8;

// 챕터 안에서 뒤로 갈수록 여분 팻말을 줄여 어렵게 한다.
// 1~5스테이지: +3, 6~10: +2, 11~15: +1, 16~20: +0 (최소 팻말)
export function extraCluesFor(stage) {
  return Math.max(0, 3 - Math.floor((stage - 1) / 5));
}

export function stageConfig(chapterId, stage) {
  const chapter = CHAPTERS.find((ch) => ch.id === chapterId);
  if (!chapter) throw new Error(`없는 챕터: ${chapterId}`);
  if (stage < 1 || stage > STAGES_PER_CHAPTER) throw new Error(`없는 스테이지: ${stage}`);
  return {
    size: chapter.size,
    seed: `stage-${chapterId}-${stage}`,
    withClues: chapter.withClues,
    extraClues: chapter.withClues ? extraCluesFor(stage) : 0,
  };
}

// dateKey: "2026-10-07" 형식 (기기 현지 날짜)
export function dailyConfig(dateKey) {
  return { size: DAILY_SIZE, seed: `daily-${dateKey}`, withClues: true, extraClues: 1 };
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getStagePuzzle(chapterId, stage) {
  return generatePuzzle(stageConfig(chapterId, stage));
}

export function getDailyPuzzle(dateKey = todayKey()) {
  return generatePuzzle(dailyConfig(dateKey));
}
