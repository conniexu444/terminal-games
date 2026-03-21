#!/usr/bin/env node
import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

// ─── Constants ───────────────────────────────────────────────────────────────

const BOARD_W = 10;
const BOARD_H = 20;

const TETROMINOES = {
  I: { color: 'cyan',    shapes: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]], [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]] },
  O: { color: 'yellow',  shapes: [[[1,0],[2,0],[1,1],[2,1]]] },
  T: { color: 'magenta', shapes: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]] },
  S: { color: 'green',   shapes: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]]] },
  Z: { color: 'red',     shapes: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]]] },
  J: { color: 'blue',    shapes: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]] },
  L: { color: 'white',   shapes: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]] },
};

const PIECE_KEYS = Object.keys(TETROMINOES);

const POINTS = { 1: 100, 2: 300, 3: 500, 4: 800 };

const SPEEDS = [800, 650, 500, 380, 280, 200, 150, 100, 80, 60]; // ms per tick by level

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyBoard = () => Array.from({ length: BOARD_H }, () => Array(BOARD_W).fill(null));

const randomPiece = () => {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { key, rotation: 0, x: 3, y: 0 };
};

const getCells = (piece) => {
  const { key, rotation, x, y } = piece;
  return TETROMINOES[key].shapes[rotation].map(([cx, cy]) => ({ x: x + cx, y: y + cy }));
};

const isValid = (piece, board) => {
  return getCells(piece).every(({ x, y }) =>
    x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H && board[y][x] === null
  );
};

const placePiece = (piece, board) => {
  const next = board.map(row => [...row]);
  getCells(piece).forEach(({ x, y }) => {
    next[y][x] = TETROMINOES[piece.key].color;
  });
  return next;
};

const clearLines = (board) => {
  const remaining = board.filter(row => row.some(cell => cell === null));
  const cleared = BOARD_H - remaining.length;
  const empty = Array.from({ length: cleared }, () => Array(BOARD_W).fill(null));
  return { board: [...empty, ...remaining], cleared };
};

const hardDrop = (piece, board) => {
  let p = piece;
  while (isValid({ ...p, y: p.y + 1 }, board)) p = { ...p, y: p.y + 1 };
  return p;
};

// ─── Initial state ────────────────────────────────────────────────────────────

const initState = () => {
  const board = emptyBoard();
  const current = randomPiece();
  const next = randomPiece();
  return { board, current, next, score: 0, level: 1, lines: 0, status: 'playing', highScore: 0 };
};

// ─── Preview component ────────────────────────────────────────────────────────

const Preview = ({ piece }) => {
  const grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  TETROMINOES[piece.key].shapes[0].forEach(([cx, cy]) => {
    if (cy < 4 && cx < 4) grid[cy][cx] = TETROMINOES[piece.key].color;
  });

  return (
    <Box flexDirection="column">
      {grid.map((row, y) => (
        <Box key={y}>
          {row.map((cell, x) => (
            <Text key={x} color={cell || 'gray'} dimColor={!cell}>██</Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};

// ─── Board component ──────────────────────────────────────────────────────────

const Board = ({ board, current, next, score, highScore, level, lines, status }) => {
  // Overlay active piece (and ghost) onto board
  const ghost = hardDrop(current, board);
  const ghostCells = new Set(getCells(ghost).map(({ x, y }) => `${x},${y}`));
  const activeCells = new Map(getCells(current).map(({ x, y }) => [`${x},${y}`, TETROMINOES[current.key].color]));

  const renderBoard = board.map((row, y) =>
    row.map((cell, x) => {
      const key = `${x},${y}`;
      if (activeCells.has(key)) return activeCells.get(key);
      if (ghostCells.has(key) && !cell) return 'ghost';
      return cell;
    })
  );

  return (
    <Box gap={2}>
      {/* Main board */}
      <Box flexDirection="column">
        <Text color="gray">{'┌' + '──'.repeat(BOARD_W) + '┐'}</Text>
        {renderBoard.map((row, y) => (
          <Box key={y}>
            <Text color="gray">│</Text>
            {row.map((cell, x) => {
              if (cell === 'ghost') return <Text key={x} color="gray" dimColor>░░</Text>;
              if (cell) return <Text key={x} color={cell} bold>██</Text>;
              return <Text key={x} color="gray" dimColor>  </Text>;
            })}
            <Text color="gray">│</Text>
          </Box>
        ))}
        <Text color="gray">{'└' + '──'.repeat(BOARD_W) + '┘'}</Text>
      </Box>

      {/* Sidebar */}
      <Box flexDirection="column" gap={1} width={14}>
        <Text bold color="green">🟦 TETRIS</Text>

        <Box flexDirection="column">
          <Text dimColor>NEXT</Text>
          <Preview piece={next} />
        </Box>

        <Box flexDirection="column">
          <Text dimColor>SCORE</Text>
          <Text bold color="yellow">{score}</Text>
        </Box>

        <Box flexDirection="column">
          <Text dimColor>BEST</Text>
          <Text bold color="cyan">{highScore}</Text>
        </Box>

        <Box flexDirection="column">
          <Text dimColor>LEVEL</Text>
          <Text bold color="magenta">{level}</Text>
        </Box>

        <Box flexDirection="column">
          <Text dimColor>LINES</Text>
          <Text bold>{lines}</Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>← → move</Text>
          <Text dimColor>↑  rotate</Text>
          <Text dimColor>↓  soft drop</Text>
          <Text dimColor>space hard drop</Text>
          <Text dimColor>Q  quit</Text>
        </Box>

        {status === 'dead' && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="red">GAME OVER</Text>
            <Text color="white"><Text bold color="green">R</Text> restart</Text>
          </Box>
        )}
        {status === 'paused' && (
          <Box marginTop={1}>
            <Text bold color="yellow">PAUSED</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── App ─────────────────────────────────────────────────────────────────────

const App = () => {
  const { exit } = useApp();
  const [state, setState] = useState(initState);

  const tick = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing') return prev;

      const moved = { ...prev.current, y: prev.current.y + 1 };

      if (isValid(moved, prev.board)) {
        return { ...prev, current: moved };
      }

      // Lock piece
      const newBoard = placePiece(prev.current, prev.board);
      const { board: clearedBoard, cleared } = clearLines(newBoard);

      const newLines = prev.lines + cleared;
      const newLevel = Math.min(10, Math.floor(newLines / 10) + 1);
      const newScore = prev.score + (POINTS[cleared] || 0) * prev.level;

      const next = prev.next;
      const newCurrent = randomPiece();

      // Game over check
      if (!isValid(next, clearedBoard)) {
        return {
          ...prev,
          board: clearedBoard,
          score: newScore,
          lines: newLines,
          level: newLevel,
          status: 'dead',
          highScore: Math.max(newScore, prev.highScore),
        };
      }

      return {
        ...prev,
        board: clearedBoard,
        current: next,
        next: newCurrent,
        score: newScore,
        lines: newLines,
        level: newLevel,
        status: 'playing',
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
        status: prev.status === 'playing' ? 'paused' : prev.status === 'paused' ? 'playing' : prev.status,
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
        const rotated = { ...current, rotation: (current.rotation + 1) % rotations };
        // Wall kick: try center, then nudge left/right
        for (const dx of [0, 1, -1, 2, -2]) {
          const kicked = { ...rotated, x: rotated.x + dx };
          if (isValid(kicked, board)) return { ...prev, current: kicked };
        }
        return prev;
      }
      if (input === ' ') {
        const dropped = hardDrop(current, board);
        const newBoard = placePiece(dropped, board);
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
