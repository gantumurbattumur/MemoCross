"use client";

import { useEffect, useState } from "react";
import CrosswordBoard from "@/components/CrosswordBoard";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ErrorToast from "@/components/ErrorToast";

export default function CrosswordPage() {
  const [data, setData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        
        // Get words from flashcards (stored in localStorage)
        const storedWords = localStorage.getItem("flashcard_words");
        let wordsToUse = [];
        
        if (storedWords) {
          try {
            wordsToUse = JSON.parse(storedWords);
          } catch (e) {
            console.error("Error parsing stored words:", e);
          }
        }
        
        // If no stored words, fetch new ones
        if (wordsToUse.length === 0) {
          const savedLevel = localStorage.getItem("learning_level") || "a1";
          const wordsData = await api("/words/daily", {
            method: "POST",
            body: JSON.stringify({
              level: savedLevel,
              limit: 10,
            }),
          });
          wordsToUse = wordsData?.words || [];
          localStorage.setItem("flashcard_words", JSON.stringify(wordsToUse));
        }
        
        // Get selected language
        const selectedLanguage = localStorage.getItem("learning_language") || "es";
        
        // Generate crossword using translated words (Spanish/French) instead of English
        // This tests the user's memorization of the foreign words
        // Take exactly 10 words and ensure they have translations
        const wordsWithTranslations = wordsToUse.slice(0, 10)
          .map((w: any) => {
            const translation = selectedLanguage === "es" ? w.translation_es : w.translation_fr;
            return {
              word: translation || w.word, // Use translation, fallback to English if no translation
              englishWord: w.word,
              definition: w.definition,
              translation: translation,
              hasTranslation: !!translation
            };
          })
          .filter((w: any) => w.word && w.word.length <= 10); // Filter out words without translations and words too long
        
        if (wordsWithTranslations.length === 0) {
          setError("No translated words available. Please complete flashcards first.");
          setLoading(false);
          return;
        }
        
        // Use translated words for the crossword
        const translatedWordList = wordsWithTranslations.map((w: any) => w.word.toUpperCase());
        
        // Create clues mapping (English definition as clue for translated words)
        const cluesMap: { [key: string]: string } = {};
        wordsWithTranslations.forEach((w: any) => {
          cluesMap[w.word.toUpperCase()] = w.definition; // English definition as clue
        });
        
        // Call crossword API with translated words and clues
        const json = await api("/crossword/today", {
          method: "POST",
          body: JSON.stringify({
            words: translatedWordList,
            clues: cluesMap,
          }),
        });

        // ensure basic fields
        json.grid = json.grid.map((row: any[]) =>
          row.map((cell: any) => ({
            ...cell,
            is_block: cell.is_block ?? false,
            input: cell.input ?? "",
            number: cell.number ?? null,
          }))
        );

        // clue numbers - handle shared starting cells
        const cellNumbers: { [key: string]: number } = {};
        json.words.forEach((w: any) => {
          const cellKey = `${w.row}-${w.col}`;
          if (json.grid[w.row] && json.grid[w.row][w.col]) {
            // If multiple words start at same cell, they share the same number
            if (!cellNumbers[cellKey]) {
              cellNumbers[cellKey] = w.number;
            }
            json.grid[w.row][w.col].number = cellNumbers[cellKey];
          }
        });

        setData(json);
      } catch (err: any) {
        console.error("Error loading crossword:", err);
        setError(err.message || "Failed to load crossword");
      } finally {
        setLoading(false);
      }
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
    try {
      const check = await api("/crossword/check", {
        method: "POST",
        body: JSON.stringify({
          grid: data.grid,
          words: data.words,
        }),
      });

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
    } catch (err: any) {
      console.error("Error submitting crossword:", err);
      setError("Failed to submit crossword. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-white dark:bg-slate-800">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center pt-16 lg:pt-0">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 text-lg">Loading crossword…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-white dark:bg-slate-800">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center pt-16 lg:pt-0">
          <div className="text-center bg-white dark:bg-slate-700 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-slate-600">
            <p className="text-red-600 dark:text-red-400 mb-4 text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-pink-200 dark:bg-pink-300 text-gray-900 dark:text-gray-900 rounded-xl font-semibold hover:bg-pink-300 dark:hover:bg-pink-400 border border-pink-300 dark:border-pink-400 transition-all shadow-lg hover:shadow-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex bg-white dark:bg-slate-800">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center pt-16 lg:pt-0">
          <div className="text-center bg-white dark:bg-slate-700 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-slate-600">
            <p className="text-gray-600 dark:text-gray-300 text-lg">No crossword data available</p>
          </div>
        </div>
      </div>
    );
  }

  const across = data.words.filter((w: any) => w.direction === "across");
  const down = data.words.filter((w: any) => w.direction === "down");

  const correctCount = result ? result.results.filter((r: any) => r.correct).length : 0;
  const totalCount = result ? result.results.length : data.words.length;

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 p-4 lg:p-6 pt-16 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-slate-600">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Today's Crossword Challenge
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Fill in the crossword using the words you memorized today
              </p>
              {result && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Score: {correctCount} / {totalCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {correctCount === totalCount 
                        ? "Perfect! You've mastered all the words!" 
                        : `Great progress! ${totalCount - correctCount} more to go!`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* LEFT - Crossword Board */}
            <div className="flex-1">
              <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-slate-600">
                <div className="flex justify-center mb-6">
                  <CrosswordBoard grid={data.grid} onChange={updateCell} />
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={submit}
                    className="px-8 py-3 bg-pink-200 dark:bg-pink-300 text-gray-900 dark:text-gray-900 rounded-xl font-semibold text-lg hover:bg-pink-300 dark:hover:bg-pink-400 border border-pink-300 dark:border-pink-400 transition-all shadow-lg hover:shadow-xl"
                  >
                    Check Answers
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT - Clues Panel */}
            <div className="w-full lg:w-96">
              <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-slate-600 sticky top-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Clues
                  </h2>
                  
                  {/* Across Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b-2 border-gray-200 dark:border-slate-600">
                      Across
                    </h3>
                    <div className="space-y-2">
                      {across.map((w: any) => {
                        const wordResult = result?.results.find((r: any) => r.number === w.number);
                        const isCorrect = wordResult?.correct;
                        return (
                          <div 
                            key={w.number} 
                            className={`p-2 rounded-lg transition-all ${
                              result 
                                ? isCorrect 
                                  ? "bg-gray-50 dark:bg-green-900/30 border border-gray-200 dark:border-green-700" 
                                  : "bg-gray-50 dark:bg-red-900/30 border border-gray-200 dark:border-red-700"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            <span className="font-bold text-gray-900 dark:text-blue-400">{w.number}.</span>{" "}
                            <span className={result ? (isCorrect ? "text-gray-900 dark:text-green-300" : "text-gray-900 dark:text-red-300") : "text-gray-700 dark:text-gray-300"}>
                              {w.clue}
                            </span>
                            {result && (
                              <span className="ml-2 text-sm font-bold">
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Down Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b-2 border-gray-200 dark:border-slate-600">
                      Down
                    </h3>
                    <div className="space-y-2">
                      {down.map((w: any) => {
                        const wordResult = result?.results.find((r: any) => r.number === w.number);
                        const isCorrect = wordResult?.correct;
                        return (
                          <div 
                            key={w.number} 
                            className={`p-2 rounded-lg transition-all ${
                              result 
                                ? isCorrect 
                                  ? "bg-gray-50 dark:bg-green-900/30 border border-gray-200 dark:border-green-700" 
                                  : "bg-gray-50 dark:bg-red-900/30 border border-gray-200 dark:border-red-700"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            <span className="font-bold text-gray-900 dark:text-blue-400">{w.number}.</span>{" "}
                            <span className={result ? (isCorrect ? "text-gray-900 dark:text-green-300" : "text-gray-900 dark:text-red-300") : "text-gray-700 dark:text-gray-300"}>
                              {w.clue}
                            </span>
                            {result && (
                              <span className="ml-2 text-sm font-bold">
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
