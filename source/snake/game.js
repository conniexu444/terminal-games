import { BOARD_WIDTH, BOARD_HEIGHT, DIR } from './constants.js';

export const randomFood = (snake) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_WIDTH),
      y: Math.floor(Math.random() * BOARD_HEIGHT),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
};

export const initialState = () => {
  const snake = [
    { x: 15, y: 10 },
    { x: 14, y: 10 },
    { x: 13, y: 10 },
  ];
  return {
    snake,
    food:      randomFood(snake),
    dir:       DIR.RIGHT,
    nextDir:   DIR.RIGHT,
    score:     0,
    status:    'playing',
    highScore: 0,
  };
};
