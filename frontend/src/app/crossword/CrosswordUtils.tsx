export type PlacedWord = {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
};

export type Crossword = {
  grid: string[][];
  words: PlacedWord[];
};

const GRID_SIZE = 25;

// Create empty grid
function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "")
  );
}

// Try to overlap two words
function findOverlapPosition(
  grid: string[][],
  existing: PlacedWord,
  newWord: string
) {
  for (let i = 0; i < existing.word.length; i++) {
    for (let j = 0; j < newWord.length; j++) {
      if (existing.word[i] === newWord[j]) {
        let row = existing.row;
        let col = existing.col;

        if (existing.direction === "across") {
          // place new word vertically
          row = existing.row - j;
          col = existing.col + i;
          return { row, col, direction: "down", match: true };
        } else {
          // place new word horizontally
          row = existing.row + i;
          col = existing.col - j;
          return { row, col, direction: "across", match: true };
        }
      }
    }
  }

  return null;
}

// Check if word fits without conflicts
function canPlaceWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
) {
  for (let k = 0; k < word.length; k++) {
    const r = row + (direction === "down" ? k : 0);
    const c = col + (direction === "across" ? k : 0);

    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r][c] && grid[r][c] !== word[k]) return false;
  }
  return true;
}

// Actually place the word
function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
) {
  for (let k = 0; k < word.length; k++) {
    const r = row + (direction === "down" ? k : 0);
    const c = col + (direction === "across" ? k : 0);
    grid[r][c] = word[k];
  }
}

export function generateCrossword(words: { word: string; clue: string }[]): Crossword {
  const grid = createEmptyGrid();
  const placed: PlacedWord[] = [];

  // Place first word in the center
  const first = words[0];
  const mid = Math.floor(GRID_SIZE / 2);

  placeWord(grid, first.word.toUpperCase(), mid, mid - Math.floor(first.word.length / 2), "across");
  placed.push({
    word: first.word.toUpperCase(),
    clue: first.clue,
    row: mid,
    col: mid - Math.floor(first.word.length / 2),
    direction: "across",
  });

  // Try placing each next word
  for (let i = 1; i < words.length; i++) {
    const newWord = words[i].word.toUpperCase();
    const newClue = words[i].clue;

    let placedSuccessfully = false;

    for (const existing of placed) {
      const overlap = findOverlapPosition(grid, existing, newWord);

      if (!overlap) continue;

      const { row, col, direction } = overlap;
      if (canPlaceWord(grid, newWord, row, col, direction)) {
        placeWord(grid, newWord, row, col, direction);
        placed.push({ word: newWord, clue: newClue, row, col, direction });
        placedSuccessfully = true;
        break;
      }
    }

    // If no overlap possible, place word randomly (fallback)
    if (!placedSuccessfully) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlaceWord(grid, newWord, r, c, "across")) {
            placeWord(grid, newWord, r, c, "across");
            placed.push({ word: newWord, clue: newClue, row: r, col: c, direction: "across" });
            placedSuccessfully = true;
            break;
          }
        }
        if (placedSuccessfully) break;
      }
    }
  }

  return { grid, words: placed };
}
