def generate_crossword(words):
    """
    words = [
      { "word": "ABOVE", "clue": "..." },
      { "word": "ACTION", "clue": "..." },
      ...
    ]

    returns:
    {
      "grid": [...],
      "placements": [...]
    }
    """

    SIZE = 10
    grid = [["" for _ in range(SIZE)] for _ in range(SIZE)]
    placements = []

    def can_place_horizontal(word, row, col):
        if col + len(word) > SIZE:
            return False
        for i, ch in enumerate(word):
            if grid[row][col + i] not in ("", ch):
                return False
        return True

    def can_place_vertical(word, row, col):
        if row + len(word) > SIZE:
            return False
        for i, ch in enumerate(word):
            if grid[row + i][col] not in ("", ch):
                return False
        return True

    def place_horizontal(word, row, col):
        for i, ch in enumerate(word):
            grid[row][col + i] = ch
        placements.append({
            "word": word,
            "row": row,
            "col": col,
            "direction": "ACROSS"
        })

    def place_vertical(word, row, col):
        for i, ch in enumerate(word):
            grid[row + i][col] = ch
        placements.append({
            "word": word,
            "row": row,
            "col": col,
            "direction": "DOWN"
        })

    # place first word in the center horizontally
    first = words[0]["word"]
    start_col = (SIZE - len(first)) // 2
    start_row = SIZE // 2
    place_horizontal(first, start_row, start_col)

    # place remaining
    for w in words[1:]:
        word = w["word"]
        placed = False

        # try intersections first
        for p in placements:
            pw = p["word"]

            for i, ch1 in enumerate(word):
                for j, ch2 in enumerate(pw):
                    if ch1 != ch2:
                        continue

                    # intersection location
                    if p["direction"] == "ACROSS":
                        row = p["row"] - i
                        col = p["col"] + j

                        if 0 <= row < SIZE and 0 <= col < SIZE:
                            if can_place_vertical(word, row, col):
                                place_vertical(word, row, col)
                                placed = True
                                break

                    else:  # DOWN
                        row = p["row"] + j
                        col = p["col"] - i

                        if 0 <= row < SIZE and 0 <= col < SIZE:
                            if can_place_horizontal(word, row, col):
                                place_horizontal(word, row, col)
                                placed = True
                                break

                if placed:
                    break
            if placed:
                break

        # fallback: place vertically anywhere
        if not placed:
            for r in range(SIZE):
                for c in range(SIZE):
                    if can_place_vertical(word, r, c):
                        place_vertical(word, r, c)
                        placed = True
                        break
                if placed:
                    break

    # FINAL PROCESSING – return structured grid
    output_grid = []
    for r in range(SIZE):
        row = []
        for c in range(SIZE):
            cell = grid[r][c]
            if cell == "":
                row.append({
                    "letter": None,
                    "is_block": True
                })
            else:
                row.append({
                    "letter": cell,
                    "is_block": False,
                    "input": ""
                })
        output_grid.append(row)

    return {
        "grid": output_grid,
        "placements": placements
    }
