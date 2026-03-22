import React from 'react';
import { Box, Text } from 'ink';
import { BOARD_WIDTH, BOARD_HEIGHT } from './constants.js';

export const Board = ({ snake, food, score, highScore, status }) => {
  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
  const head = snake[0];

  const rows = Array.from({ length: BOARD_HEIGHT }, (_, y) =>
    Array.from({ length: BOARD_WIDTH }, (_, x) => {
      const key = `${x},${y}`;
      if (x === head.x && y === head.y) return 'head';
      if (snakeSet.has(key))            return 'body';
      if (x === food.x && y === food.y) return 'food';
      return 'empty';
    })
  );

  return (
    <Box flexDirection="column">
      <Box gap={4} marginBottom={0}>
        <Text bold color="green">🐍 SNAKE</Text>
        <Text color="white">Score: <Text bold color="yellow">{score}</Text></Text>
        <Text color="white">Best:  <Text bold color="cyan">{highScore}</Text></Text>
      </Box>

      <Text color="gray">{'┌' + '─'.repeat(BOARD_WIDTH * 2) + '┐'}</Text>

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

      <Text color="gray">{'└' + '─'.repeat(BOARD_WIDTH * 2) + '┘'}</Text>

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

export const StartScreen = () => (
  <Box flexDirection="column" gap={1} padding={2}>
    <Text bold color="green">🐍 TERMINAL SNAKE</Text>
    <Text color="white">Arrow keys — move</Text>
    <Text color="white">Q — quit</Text>
    <Text color="white">R — restart (after game over)</Text>
    <Text bold color="yellow">Press any arrow key to start!</Text>
  </Box>
);
