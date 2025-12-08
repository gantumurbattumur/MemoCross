"use client";

import { useEffect, useState } from "react";
import CrosswordBoard from "@/components/CrosswordBoard";

export default function CrosswordPage() {
  const [data, setData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("http://localhost:8000/crossword/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          level: "a1",
          limit: 10,
        }),
      });

      const json = await res.json();

      // ensure basic fields
      json.grid = json.grid.map((row: any[]) =>
        row.map((cell: any) => ({
          ...cell,
          is_block: cell.is_block ?? false,
          input: cell.input ?? "",
          number: cell.number ?? null,
        }))
      );

      // clue numbers
      json.words.forEach((w: any) => {
        if (json.grid[w.row] && json.grid[w.row][w.col]) {
          json.grid[w.row][w.col].number = w.number;
        }
      });

      setData(json);
    }

    load();
  }, []);

  function updateCell(r: number, c: number, val: string) {
    const updated = { ...data };
    updated.grid = updated.grid.map((row: any[], rr: number) =>
      row.map((cell: any, cc: number) =>
        rr === r && cc === c ? { ...cell, input: val } : cell
      )
    );
    setData(updated);
  }

  async function submit() {
    const res = await fetch("http://localhost:8000/crossword/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grid: data.grid,
        words: data.words,
      }),
    });

    const check = await res.json();
    setResult(check);

    // clone grid
    const updated = { ...data };
    updated.grid = updated.grid.map((row: any[]) => row.map((c: any) => ({ ...c })));

    check.results.forEach((w: any) => {
      const word = data.words.find((x: any) => x.number === w.number);
      if (!word) return;

      const { row, col, direction, answer } = word;
      [...answer].forEach((_, i) => {
        const r = direction === "across" ? row : row + i;
        const c = direction === "across" ? col + i : col;

        updated.grid[r][c].correct = w.correct;
      });
    });

    setData(updated);
  }

  if (!data) {
    return <div className="mt-10 text-center">Loading…</div>;
  }

  const across = data.words.filter((w: any) => w.direction === "across");
  const down = data.words.filter((w: any) => w.direction === "down");

  return (
    <div className="flex flex-row gap-12 mt-10 px-10">
      {/* LEFT */}
      <div>
        <h1 className="text-3xl font-bold mb-6">Crossword</h1>

        <CrosswordBoard grid={data.grid} onChange={updateCell} />

        <button
          onClick={submit}
          className="mt-6 px-5 py-2 bg-green-600 text-white rounded-lg"
        >
          Submit
        </button>

        {result && (
          <div className="mt-4 text-xl font-bold">
            Score: {result.results.filter((r: any) => r.correct).length} /{" "}
            {result.results.length}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="max-w-[350px]">
        <h2 className="font-bold text-2xl mb-4">Clues</h2>

        <h3 className="font-bold">Across</h3>
        {across.map((w: any) => (
          <div key={w.number} className="mb-2">
            <strong>{w.number}</strong>. {w.clue}
          </div>
        ))}

        <h3 className="font-bold mt-6">Down</h3>
        {down.map((w: any) => (
          <div key={w.number} className="mb-2">
            <strong>{w.number}</strong>. {w.clue}
          </div>
        ))}
      </div>
    </div>
  );
}
