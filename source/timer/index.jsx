#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

import { DIGIT_H, DISPLAY_W, buildDisplayGrid } from './digits.js';

// ── Layout ─────────────────────────────────────────────────────────────────────

const TERM_W   = process.stdout.columns || 80;
const W        = Math.floor((TERM_W - 2) / 2); // inner width in cells (each = ██)
const BAR_ROWS = 5;

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

  // ── Input screen ─────────────────────────────────────────────────────────────
  if (mode === 'input') {
    return (
      <Box flexDirection="column">
        <Box gap={3}>
          <Text bold color="cyan">TIMER</Text>
          <Text dimColor>Q to quit</Text>
        </Box>
        <Text color="gray">{'┌' + '─'.repeat(W * 2) + '┐'}</Text>
        <EmptyRow /><EmptyRow /><EmptyRow />

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

        <Text>
          <Text color="gray">│</Text>
          <Text>{'    '}</Text>
          <Text dimColor>Seconds (90) · Minutes:seconds (1:30) · then Enter</Text>
          {'  '.repeat(Math.max(0, W - 4 - 26))}
          <Text color="gray">│</Text>
        </Text>

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

  // ── Timer screen ─────────────────────────────────────────────────────────────
  const isDone   = mode === 'done';
  const isPaused = mode === 'paused';
  const color    = isDone ? (flash ? 'white' : 'gray') : timerColor(remaining, total);

  const displayGrid = buildDisplayGrid(remaining);
  const leftPad     = Math.floor((W - DISPLAY_W) / 2);
  const rightPad    = W - DISPLAY_W - leftPad;
  const fillCells   = isDone ? 0 : Math.round(remaining / total * W);

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
