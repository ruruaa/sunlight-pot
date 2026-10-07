// 앱 시작점. 화면들을 연결한다.

import { CHAPTERS, STAGES_PER_CHAPTER, getStagePuzzle } from './game/levels.js';
import { createPlayScreen, formatTime } from './ui/play-screen.js';
import * as storage from './platform/storage.js';

const $ = (sel) => document.querySelector(sel);
const chapterSel = $('#chapter');
const stageSel = $('#stage');
const autoMarkBox = $('#auto-mark');
const clearEl = $('#clear');

CHAPTERS.forEach((ch) => chapterSel.add(new Option(`${ch.id}장 · ${ch.size}×${ch.size}`, ch.id)));
for (let s = 1; s <= STAGES_PER_CHAPTER; s++) stageSel.add(new Option(`${s}스테이지`, s));

const play = createPlayScreen({
  boardEl: $('#board'),
  timerEl: $('#timer'),
  undoBtn: $('#undo'),
  resetBtn: $('#reset'),
  onSolved({ timeMs }) {
    $('#clear-detail').textContent = `${chapterSel.value}장 ${stageSel.value}스테이지 · ⏱ ${formatTime(timeMs)}`;
    const last = Number(chapterSel.value) === CHAPTERS.length && Number(stageSel.value) === STAGES_PER_CHAPTER;
    $('#clear-next').hidden = last;
    // 화분이 피어나는 모습을 잠깐 보여준 뒤 창을 띄운다
    setTimeout(() => { clearEl.hidden = false; }, 700);
  },
});

function startStage() {
  clearEl.hidden = true;
  const puzzle = getStagePuzzle(Number(chapterSel.value), Number(stageSel.value));
  play.load(puzzle, { autoMark: autoMarkBox.checked });
}

function nextStage() {
  let ch = Number(chapterSel.value), st = Number(stageSel.value) + 1;
  if (st > STAGES_PER_CHAPTER) { ch++; st = 1; }
  if (ch > CHAPTERS.length) return;
  chapterSel.value = ch;
  stageSel.value = st;
  startStage();
}

chapterSel.addEventListener('change', () => { stageSel.value = 1; startStage(); });
stageSel.addEventListener('change', startStage);
autoMarkBox.addEventListener('change', () => {
  play.setAutoMark(autoMarkBox.checked);
  storage.save('settings.autoMark', autoMarkBox.checked);
});
$('#clear-next').addEventListener('click', nextStage);
$('#clear-close').addEventListener('click', () => { clearEl.hidden = true; });

autoMarkBox.checked = await storage.load('settings.autoMark', false);
startStage();
