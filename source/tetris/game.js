import { BOARD_W, BOARD_H, TETROMINOES, PIECE_KEYS } from './constants.js';

export const emptyBoard = () =>
  Array.from({ length: BOARD_H }, () => Array(BOARD_W).fill(null));

export const randomPiece = () => {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { key, rotation: 0, x: 3, y: 0 };
};

export const getCells = (piece) => {
  const { key, rotation, x, y } = piece;
  return TETROMINOES[key].shapes[rotation].map(([cx, cy]) => ({ x: x + cx, y: y + cy }));
};

export const isValid = (piece, board) =>
  getCells(piece).every(({ x, y }) =>
    x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H && board[y][x] === null
  );

export const placePiece = (piece, board) => {
  const next = board.map(row => [...row]);
  getCells(piece).forEach(({ x, y }) => {
    next[y][x] = TETROMINOES[piece.key].color;
  });
  return next;
};

export const clearLines = (board) => {
  const remaining = board.filter(row => row.some(cell => cell === null));
  const cleared   = BOARD_H - remaining.length;
  const empty     = Array.from({ length: cleared }, () => Array(BOARD_W).fill(null));
  return { board: [...empty, ...remaining], cleared };
};

export const hardDrop = (piece, board) => {
  let p = piece;
  while (isValid({ ...p, y: p.y + 1 }, board)) p = { ...p, y: p.y + 1 };
  return p;
};

export const initState = () => {
  const board   = emptyBoard();
  const current = randomPiece();
  const next    = randomPiece();
  return { board, current, next, score: 0, level: 1, lines: 0, status: 'playing', highScore: 0 };
};
