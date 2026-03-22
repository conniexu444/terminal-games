import React from 'react';
import { Box, Text } from 'ink';
import { BOARD_W, TETROMINOES } from './constants.js';
import { getCells, hardDrop } from './game.js';

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

export const Board = ({ board, current, next, score, highScore, level, lines, status }) => {
  const ghost       = hardDrop(current, board);
  const ghostCells  = new Set(getCells(ghost).map(({ x, y }) => `${x},${y}`));
  const activeCells = new Map(getCells(current).map(({ x, y }) => [`${x},${y}`, TETROMINOES[current.key].color]));

  const renderBoard = board.map((row, y) =>
    row.map((cell, x) => {
      const key = `${x},${y}`;
      if (activeCells.has(key))          return activeCells.get(key);
      if (ghostCells.has(key) && !cell)  return 'ghost';
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
              if (cell)            return <Text key={x} color={cell} bold>██</Text>;
              return               <Text key={x} color="gray" dimColor>  </Text>;
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
