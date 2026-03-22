export const DIGIT_H   = 7; // pixel digit height
export const DIGIT_W   = 5; // pixel digit width
export const DISPLAY_W = 25; // total display width: d d : d d (4 digits + colon + gaps)

// Builds a 7-row segment sprite from 7 segment flags
const D = (top, tl, tr, mid, bl, br, bot) => [
  [0, top, top, top, 0],
  [tl,  0,  0,  0, tr],
  [tl,  0,  0,  0, tr],
  [0, mid, mid, mid, 0],
  [bl,  0,  0,  0, br],
  [bl,  0,  0,  0, br],
  [0, bot, bot, bot, 0],
];

export const DIGITS = [
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
export const COLON = [[0],[0],[1],[0],[1],[0],[0]];

// Build 7-row × 25-col display grid for MM:SS
// Layout cols: [0-4]=d1 [5]=gap [6-10]=d2 [11]=gap [12]=colon [13]=gap [14-18]=d3 [19]=gap [20-24]=d4
export const buildDisplayGrid = (secs) => {
  const mm  = Math.min(99, Math.floor(secs / 60));
  const ss  = secs % 60;
  const ds  = [Math.floor(mm / 10), mm % 10, Math.floor(ss / 10), ss % 10];
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
