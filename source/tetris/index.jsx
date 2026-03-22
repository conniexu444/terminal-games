#!/usr/bin/env node
import React, { useState, useEffect, useCallback } from 'react';
import { render, useInput, useApp } from 'ink';

import { TETROMINOES, POINTS, SPEEDS } from './constants.js';
import { isValid, placePiece, clearLines, hardDrop, randomPiece, initState } from './game.js';
import { Board } from './Board.jsx';

const App = () => {
  const { exit } = useApp();
  const [state, setState] = useState(initState);

  const tick = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing') return prev;

      const moved = { ...prev.current, y: prev.current.y + 1 };
      if (isValid(moved, prev.board)) return { ...prev, current: moved };

      // Lock piece
      const newBoard              = placePiece(prev.current, prev.board);
      const { board: clearedBoard, cleared } = clearLines(newBoard);
      const newLines  = prev.lines + cleared;
      const newLevel  = Math.min(10, Math.floor(newLines / 10) + 1);
      const newScore  = prev.score + (POINTS[cleared] || 0) * prev.level;

      // Game over check
      if (!isValid(prev.next, clearedBoard)) {
        return {
          ...prev,
          board: clearedBoard,
          score: newScore, lines: newLines, level: newLevel,
          status: 'dead',
          highScore: Math.max(newScore, prev.highScore),
        };
      }

      return {
        ...prev,
        board:   clearedBoard,
        current: prev.next,
        next:    randomPiece(),
        score:   newScore,
        lines:   newLines,
        level:   newLevel,
        status:  'playing',
      };
    });
  }, []);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const speed = SPEEDS[Math.min(state.level - 1, SPEEDS.length - 1)];
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [state.status, state.level, tick]);

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') { exit(); return; }

    if ((input === 'r' || input === 'R') && state.status === 'dead') {
      setState(prev => ({ ...initState(), highScore: prev.highScore }));
      return;
    }

    if (input === 'p' || input === 'P') {
      setState(prev => ({
        ...prev,
        status: prev.status === 'playing' ? 'paused'
              : prev.status === 'paused'  ? 'playing'
              : prev.status,
      }));
      return;
    }

    if (state.status !== 'playing') return;

    setState(prev => {
      const { current, board } = prev;

      if (key.leftArrow) {
        const moved = { ...current, x: current.x - 1 };
        return isValid(moved, board) ? { ...prev, current: moved } : prev;
      }
      if (key.rightArrow) {
        const moved = { ...current, x: current.x + 1 };
        return isValid(moved, board) ? { ...prev, current: moved } : prev;
      }
      if (key.downArrow) {
        const moved = { ...current, y: current.y + 1 };
        return isValid(moved, board) ? { ...prev, current: moved } : prev;
      }
      if (key.upArrow) {
        const rotations = TETROMINOES[current.key].shapes.length;
        const rotated   = { ...current, rotation: (current.rotation + 1) % rotations };
        // Wall kick: try center, then nudge left/right
        for (const dx of [0, 1, -1, 2, -2]) {
          const kicked = { ...rotated, x: rotated.x + dx };
          if (isValid(kicked, board)) return { ...prev, current: kicked };
        }
        return prev;
      }
      if (input === ' ') {
        const dropped               = hardDrop(current, board);
        const newBoard              = placePiece(dropped, board);
        const { board: clearedBoard, cleared } = clearLines(newBoard);
        const newLines = prev.lines + cleared;
        const newLevel = Math.min(10, Math.floor(newLines / 10) + 1);
        const newScore = prev.score + (POINTS[cleared] || 0) * prev.level;

        if (!isValid(prev.next, clearedBoard)) {
          return { ...prev, board: clearedBoard, score: newScore, lines: newLines, level: newLevel, status: 'dead', highScore: Math.max(newScore, prev.highScore) };
        }
        return { ...prev, board: clearedBoard, current: prev.next, next: randomPiece(), score: newScore, lines: newLines, level: newLevel };
      }

      return prev;
    });
  });

  return (
    <Board
      board={state.board}
      current={state.current}
      next={state.next}
      score={state.score}
      highScore={state.highScore}
      level={state.level}
      lines={state.lines}
      status={state.status}
    />
  );
};

render(<App />);
