#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, useInput, useApp } from 'ink';

import { BOARD_WIDTH, BOARD_HEIGHT, TICK_MS, DIR } from './constants.js';
import { randomFood, initialState } from './game.js';
import { Board, StartScreen } from './Board.jsx';

const App = () => {
  const { exit } = useApp();
  const [state, setState] = useState({ ...initialState(), status: 'start' });

  // Game tick
  useEffect(() => {
    if (state.status !== 'playing') return;

    const id = setInterval(() => {
      setState(prev => {
        if (prev.status !== 'playing') return prev;

        const dir  = prev.nextDir;
        const head = { x: prev.snake[0].x + dir.x, y: prev.snake[0].y + dir.y };

        // Wall collision
        if (head.x < 0 || head.x >= BOARD_WIDTH || head.y < 0 || head.y >= BOARD_HEIGHT) {
          return { ...prev, status: 'dead', highScore: Math.max(prev.score, prev.highScore) };
        }

        // Self collision (skip tail since it will move)
        if (prev.snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) {
          return { ...prev, status: 'dead', highScore: Math.max(prev.score, prev.highScore) };
        }

        const ateFood  = head.x === prev.food.x && head.y === prev.food.y;
        const newSnake = ateFood
          ? [head, ...prev.snake]
          : [head, ...prev.snake.slice(0, -1)];

        return {
          ...prev,
          snake: newSnake,
          food:  ateFood ? randomFood(newSnake) : prev.food,
          score: ateFood ? prev.score + 10 : prev.score,
          dir,
        };
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [state.status]);

  useInput((input, key) => {
    if (input === 'q' || input === 'Q') { exit(); return; }

    if ((input === 'r' || input === 'R') && state.status === 'dead') {
      setState(prev => ({ ...initialState(), highScore: prev.highScore }));
      return;
    }

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
