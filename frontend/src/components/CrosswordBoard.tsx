"use client";

export default function CrosswordBoard({
  grid,
  onChange,
}: {
  grid: any[][];
  onChange: (r: number, c: number, v: string) => void;
}) {
  function getCellStyles(cell: any) {
    const isBlock = cell.letter === null || cell.is_block;

    // BLOCK = white always
    if (isBlock) {
      return "bg-white";
    }

    // CHECKED
    if (cell.correct === true) {
      return "bg-green-300";
    }
    if (cell.correct === false) {
      return "bg-gray-400";
    }

    // PLAYABLE default (before submit)
    return "bg-gray-200";
  }

  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${grid[0].length}, 38px)` }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const isBlock = cell.letter === null || cell.is_block;
          const styles = getCellStyles(cell);

          if (isBlock) {
            return (
              <div
                key={`${r}-${c}`}
                className={`w-[38px] h-[38px] border border-gray-300 ${styles}`}
              />
            );
          }

          return (
            <div key={`${r}-${c}`} className="relative">
              {cell.number && (
                <div className="absolute top-0 left-0 text-[10px] text-gray-600 pointer-events-none z-10">
                  {cell.number}
                </div>
              )}

              <input
                type="text"
                maxLength={1}
                value={cell.input ?? ""}
                onChange={(e) =>
                  onChange(r, c, e.target.value.toUpperCase())
                }
                className={`w-[38px] h-[38px] border border-gray-300 text-center text-lg uppercase focus:outline-none ${styles}`}
                autoComplete="off"
                spellCheck={false}
                style={{ paddingTop: "6px" }}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
