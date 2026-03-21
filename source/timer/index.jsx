#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

// ── Layout ─────────────────────────────────────────────────────────────────────

const TERM_W   = process.stdout.columns || 80;
const W        = Math.floor((TERM_W - 2) / 2); // inner width in cells (each = ██)
const BAR_ROWS = 5;                             // height of the block bar
const DIGIT_H  = 7;                             // pixel digit height
const DIGIT_W  = 5;                             // pixel digit width
const DISPLAY_W = 25; // total display width: d d . d d (4 digits + colon + gaps)

// ── Pixel digit sprites (5 wide × 7 tall) ─────────────────────────────────────

const D = (top, tl, tr, mid, bl, br, bot) => [
  [0, top, top, top, 0],
  [tl,  0,  0,  0, tr],
  [tl,  0,  0,  0, tr],
  [0, mid, mid, mid, 0],
  [bl,  0,  0,  0, br],
  [bl,  0,  0,  0, br],
  [0, bot, bot, bot, 0],
];

const DIGITS = [
  D(1,1,1,0,1,1,1), // 0
  [                  // 1 — full-height stroke with base serif
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  D(1,0,1,1,1,0,1), // 2
  D(1,0,1,1,0,1,1), // 3
  D(0,1,1,1,0,1,0), // 4
  D(1,1,0,1,0,1,1), // 5
  D(1,1,0,1,1,1,1), // 6
  D(1,0,1,0,0,1,0), // 7
  D(1,1,1,1,1,1,1), // 8
  D(1,1,1,1,0,1,1), // 9
];

// Colon: 1 wide × 7 tall
const COLON = [[0],[0],[1],[0],[1],[0],[0]];

// Build 7-row × 25-col display grid for MM:SS
// Layout cols: [0-4]=d1 [5]=gap [6-10]=d2 [11]=gap [12]=colon [13]=gap [14-18]=d3 [19]=gap [20-24]=d4
const buildDisplayGrid = (secs) => {
  const mm = Math.min(99, Math.floor(secs / 60));
  const ss = secs % 60;
  const ds = [Math.floor(mm / 10), mm % 10, Math.floor(ss / 10), ss % 10];
  const positions = [0, 6, 14, 20];

  const grid = Array.from({ length: DIGIT_H }, () => new Array(DISPLAY_W).fill(0));

  ds.forEach((d, i) => {
    const sprite = DIGITS[d];
    for (let r = 0; r < DIGIT_H; r++)
      for (let c = 0; c < DIGIT_W; c++)
        grid[r][positions[i] + c] = sprite[r][c];
  });

  for (let r = 0; r < DIGIT_H; r++) grid[r][12] = COLON[r][0];

  return grid;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const timerColor = (remaining, total) => {
  if (total === 0) return 'green';
  const pct = remaining / total;
  if (pct > 0.5) return 'green';
  if (pct > 0.2) return 'yellow';
  return 'red';
};

const parseInput = (str) => {
  str = str.trim();
  if (!str) return null;
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const [m, s] = parts.map(Number);
    if (isNaN(m) || isNaN(s) || s >= 60) return null;
    return m * 60 + s;
  }
  const n = Number(str);
  if (isNaN(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
};

// ── Border helpers ─────────────────────────────────────────────────────────────

const EmptyRow = () => (
  <Text><Text color="gray">│</Text>{'  '.repeat(W)}<Text color="gray">│</Text></Text>
);

// ── App ────────────────────────────────────────────────────────────────────────

const App = () => {
  const { exit } = useApp();

  const [mode,       setMode]       = useState('input');   // input | running | paused | done
  const [inputText,  setInputText]  = useState('');
  const [inputError, setInputError] = useState('');
  const [total,      setTotal]      = useState(0);
  const [remaining,  setRemaining]  = useState(0);
  const [flash,      setFlash]      = useState(false);

  // Flash tick (500ms) — drives blinking effects
  useEffect(() => {
    const id = setInterval(() => setFlash(f => !f), 500);
    return () => clearInterval(id);
  }, []);

  // Countdown tick (1000ms)
  useEffect(() => {
    if (mode !== 'running') return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setMode('done');
          process.stdout.write('\x07'); // terminal bell
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // ── Input handling ───────────────────────────────────────────────────────────
  useInput((char, key) => {
    if (char === 'q' || char === 'Q') { exit(); return; }

    if (mode === 'input') {
      if (key.return) {
        const secs = parseInput(inputText);
        if (secs) {
          setTotal(secs);
          setRemaining(secs);
          setMode('running');
          setInputText('');
          setInputError('');
        } else {
          setInputError('Please enter seconds (e.g. 90) or MM:SS (e.g. 1:30)');
        }
        return;
      }
      if (key.backspace || key.delete) { setInputText(s => s.slice(0, -1)); setInputError(''); return; }
      if (/[0-9:]/.test(char))         { setInputText(s => s + char);       setInputError(''); return; }
      return;
    }

    if (char === ' ' && mode === 'running') { setMode('paused');  return; }
    if (char === ' ' && mode === 'paused')  { setMode('running'); return; }

    if ((char === 'r' || char === 'R') && mode !== 'input') {
      setMode('input');
      setInputText('');
      setInputError('');
    }
  });

  // ── Render: input screen ─────────────────────────────────────────────────────
  if (mode === 'input') {
    return (
      <Box flexDirection="column">
        <Box gap={3}>
          <Text bold color="cyan">TIMER</Text>
          <Text dimColor>Q to quit</Text>
        </Box>
        <Text color="gray">{'┌' + '─'.repeat(W * 2) + '┐'}</Text>
        <EmptyRow /><EmptyRow /><EmptyRow />

        {/* Input row */}
        <Text>
          <Text color="gray">│</Text>
          <Text>{'    '}</Text>
          <Text bold color="white">Set timer › </Text>
          <Text bold color="cyan">{inputText}</Text>
          <Text bold color={flash ? 'cyan' : 'gray'}>█</Text>
          {'  '.repeat(Math.max(0, W - 6 - inputText.length - 1))}
          <Text color="gray">│</Text>
        </Text>
        <EmptyRow />

        {/* Hint */}
        <Text>
          <Text color="gray">│</Text>
          <Text>{'    '}</Text>
          <Text dimColor>Seconds (90) · Minutes:seconds (1:30) · then Enter</Text>
          {'  '.repeat(Math.max(0, W - 4 - 26))}
          <Text color="gray">│</Text>
        </Text>

        {/* Error */}
        <Text>
          <Text color="gray">│</Text>
          <Text>{'    '}</Text>
          <Text color="red">{inputError}</Text>
          {'  '.repeat(Math.max(0, W - 4 - inputError.length))}
          <Text color="gray">│</Text>
        </Text>

        {Array.from({ length: DIGIT_H + BAR_ROWS - 2 }, (_, i) => <EmptyRow key={i} />)}
        <Text color="gray">{'└' + '─'.repeat(W * 2) + '┘'}</Text>
      </Box>
    );
  }

  // ── Render: timer screen ─────────────────────────────────────────────────────
  const isDone    = mode === 'done';
  const isPaused  = mode === 'paused';
  const color     = isDone ? (flash ? 'white' : 'gray') : timerColor(remaining, total);
  const showSecs  = remaining;

  const displayGrid = buildDisplayGrid(showSecs);
  const leftPad  = Math.floor((W - DISPLAY_W) / 2);
  const rightPad = W - DISPLAY_W - leftPad;
  const fillCells = isDone ? 0 : Math.round(remaining / total * W);

  return (
    <Box flexDirection="column">
      <Box gap={3}>
        <Text bold color="cyan">TIMER</Text>
        <Text dimColor>
          {isDone   ? 'R to reset · Q to quit' :
           isPaused ? 'PAUSED — Space to resume · R to reset · Q to quit' :
                      'Space to pause · R to reset · Q to quit'}
        </Text>
      </Box>

      <Text color="gray">{'┌' + '─'.repeat(W * 2) + '┐'}</Text>
      <EmptyRow />

      {/* Digit display */}
      {displayGrid.map((row, r) => {
        const segs = [];
        if (leftPad > 0) segs.push({ text: '  '.repeat(leftPad), color: undefined });

        let run = '', runFilled = null;
        const flush = (filled) => {
          if (run) segs.push({ text: run, color: filled ? color : undefined, bold: filled });
          run = '';
        };
        for (let c = 0; c < DISPLAY_W; c++) {
          const filled = row[c] === 1;
          if (filled !== runFilled) { flush(runFilled); runFilled = filled; }
          run += filled ? '██' : '  ';
        }
        flush(runFilled);

        if (rightPad > 0) segs.push({ text: '  '.repeat(rightPad), color: undefined });

        return (
          <Text key={r}>
            <Text color="gray">│</Text>
            {segs.map((seg, i) => (
              <Text key={i} color={seg.color} bold={seg.bold}>{seg.text}</Text>
            ))}
            <Text color="gray">│</Text>
          </Text>
        );
      })}

      <EmptyRow />

      {/* Block bar */}
      {Array.from({ length: BAR_ROWS }, (_, i) => (
        <Text key={i}>
          <Text color="gray">│</Text>
          {fillCells > 0 && <Text color={color} bold>{'██'.repeat(fillCells)}</Text>}
          {fillCells < W && <Text color="gray" dimColor>{'░░'.repeat(W - fillCells)}</Text>}
          <Text color="gray">│</Text>
        </Text>
      ))}

      <EmptyRow />
      <Text color="gray">{'└' + '─'.repeat(W * 2) + '┘'}</Text>

      {isDone && <Text bold color="yellow">  ★  Time's up!</Text>}
    </Box>
  );
};

render(<App />);
