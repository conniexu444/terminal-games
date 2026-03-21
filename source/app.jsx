#!/usr/bin/env node
import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

// ─── Constants ───────────────────────────────────────────────────────────────

const BOARD_WIDTH = 30;
const BOARD_HEIGHT = 20;
const TICK_MS = 120;

const DIR = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const randomFood = (snake) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_WIDTH),
      y: Math.floor(Math.random() * BOARD_HEIGHT),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
};

const initialState = () => {
  const snake = [
    { x: 15, y: 10 },
    { x: 14, y: 10 },
    { x: 13, y: 10 },
  ];
  return {
    snake,
    food: randomFood(snake),
    dir: DIR.RIGHT,
    nextDir: DIR.RIGHT,
    score: 0,
    status: 'playing', // 'playing' | 'dead' | 'start'
    highScore: 0,
  };
};

// ─── Board component ─────────────────────────────────────────────────────────

const Board = ({ snake, food, score, highScore, status }) => {
  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
  const head = snake[0];

  const rows = Array.from({ length: BOARD_HEIGHT }, (_, y) =>
    Array.from({ length: BOARD_WIDTH }, (_, x) => {
      const key = `${x},${y}`;
      if (x === head.x && y === head.y) return 'head';
      if (snakeSet.has(key)) return 'body';
      if (x === food.x && y === food.y) return 'food';
      return 'empty';
    })
  );

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box gap={4} marginBottom={0}>
        <Text bold color="green">🐍 SNAKE</Text>
        <Text color="white">Score: <Text bold color="yellow">{score}</Text></Text>
        <Text color="white">Best:  <Text bold color="cyan">{highScore}</Text></Text>
      </Box>

      {/* Top border */}
      <Text color="gray">{'┌' + '─'.repeat(BOARD_WIDTH * 2) + '┐'}</Text>

      {/* Board rows */}
      {rows.map((row, y) => (
        <Box key={y}>
          <Text color="gray">│</Text>
          {row.map((cell, x) => {
            if (cell === 'head') return <Text key={x} color="green" bold>██</Text>;
            if (cell === 'body') return <Text key={x} color="greenBright">██</Text>;
            if (cell === 'food') return <Text key={x} color="red" bold>██</Text>;
            return <Text key={x} color="gray" dimColor>  </Text>;
          })}
          <Text color="gray">│</Text>
        </Box>
      ))}

      {/* Bottom border */}
      <Text color="gray">{'└' + '─'.repeat(BOARD_WIDTH * 2) + '┘'}</Text>

      {/* Footer */}
      {status === 'playing' && (
        <Text dimColor>Arrow keys to move · Q to quit</Text>
      )}
      {status === 'dead' && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">  Game Over!</Text>
          <Text color="white">  Press <Text bold color="green">R</Text> to restart · <Text bold color="red">Q</Text> to quit</Text>
        </Box>
      )}
    </Box>
  );
};

// ─── Start screen ─────────────────────────────────────────────────────────────

const StartScreen = () => (
  <Box flexDirection="column" gap={1} padding={2}>
    <Text bold color="green">🐍 TERMINAL SNAKE</Text>
    <Text color="white">Arrow keys — move</Text>
    <Text color="white">Q — quit</Text>
    <Text color="white">R — restart (after game over)</Text>
    <Text bold color="yellow">Press any arrow key to start!</Text>
  </Box>
);

// ─── App ─────────────────────────────────────────────────────────────────────

const App = () => {
  const { exit } = useApp();
  const [state, setState] = useState({ ...initialState(), status: 'start' });

  // Game tick
  useEffect(() => {
    if (state.status !== 'playing') return;

    const id = setInterval(() => {
      setState(prev => {
        if (prev.status !== 'playing') return prev;

        const dir = prev.nextDir;
        const head = { x: prev.snake[0].x + dir.x, y: prev.snake[0].y + dir.y };

        // Wall collision
        if (head.x < 0 || head.x >= BOARD_WIDTH || head.y < 0 || head.y >= BOARD_HEIGHT) {
          return { ...prev, status: 'dead', highScore: Math.max(prev.score, prev.highScore) };
        }

        // Self collision (skip tail since it will move)
        if (prev.snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) {
          return { ...prev, status: 'dead', highScore: Math.max(prev.score, prev.highScore) };
        }

        const ateFood = head.x === prev.food.x && head.y === prev.food.y;
        const newSnake = ateFood
          ? [head, ...prev.snake]
          : [head, ...prev.snake.slice(0, -1)];

        return {
          ...prev,
          snake: newSnake,
          food: ateFood ? randomFood(newSnake) : prev.food,
          score: ateFood ? prev.score + 10 : prev.score,
          dir,
        };
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [state.status]);

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') {
      exit();
      return;
    }

    if ((input === 'r' || input === 'R') && state.status === 'dead') {
      setState(prev => ({ ...initialState(), highScore: prev.highScore }));
      return;
    }

    // Start game on first arrow key
    if (state.status === 'start') {
      if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
        setState(prev => ({ ...prev, status: 'playing' }));
      }
    }

    if (state.status !== 'playing') return;

    setState(prev => {
      const { dir } = prev;
      if (key.upArrow    && dir !== DIR.DOWN)  return { ...prev, nextDir: DIR.UP };
      if (key.downArrow  && dir !== DIR.UP)    return { ...prev, nextDir: DIR.DOWN };
      if (key.leftArrow  && dir !== DIR.RIGHT) return { ...prev, nextDir: DIR.LEFT };
      if (key.rightArrow && dir !== DIR.LEFT)  return { ...prev, nextDir: DIR.RIGHT };
      return prev;
    });
  });

  if (state.status === 'start') return <StartScreen />;

  return (
    <Board
      snake={state.snake}
      food={state.food}
      score={state.score}
      highScore={state.highScore}
      status={state.status}
    />
  );
};

render(<App />);
