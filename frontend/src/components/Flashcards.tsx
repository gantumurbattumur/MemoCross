"use client";

import { useEffect, useState } from "react";
import {useRouter} from "next/navigation";

interface Word {
  id: number;
  word: string;
  definition: string;
  translation_es?: string;
  translation_fr?: string;
  mnemonic_word?: string;
  mnemonic_sentence?: string;
  image_url?: string;
}

export default function Flashcards({ words }: { words: Word[] }) {
  const [cards, setCards] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loadingMnemonic, setLoadingMnemonic] = useState(false);
  const [crosswordMode, setCrosswordMode] = useState(false);

  const router = useRouter();
  // Load words
  useEffect(() => {
    setCards(words || []);
  }, [words]);

  if (cards.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <span className="text-gray-700 text-lg font-medium">
          Loading cards…
        </span>
      </div>
    );
  }

  const card = cards[index];

  const next = () => {
    if (index < cards.length - 1) {
      setIndex(prev => prev + 1);
      setFlipped(false);
    } else {
      router.push("/crossword");
    }
  };

  const prev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setFlipped(false);
    }
  };


  // Generate mnemonic
  async function generateMnemonic(e: React.MouseEvent) {
    e.stopPropagation(); // prevents flip

    setLoadingMnemonic(true);

    try {
      const res = await fetch("http://localhost:8000/mnemonic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: card.word,
          definition: card.definition,
        }),
      });

      if (!res.ok) {
        console.error(await res.text());
        setLoadingMnemonic(false);
        return;
      }

      const data = await res.json();

      const updated = [...cards];
      updated[index] = {
        ...card,
        mnemonic_word: data.mnemonic_word,
        mnemonic_sentence: data.mnemonic_sentence,
        image_url: `data:image/png;base64,${data.image_base64}`,
      };
      setCards(updated);

      // Flip automatically when mnemonic is ready
      setFlipped(true);
    } catch (err) {
      console.error("Mnemonic error:", err);
    }

    setLoadingMnemonic(false);
  }

  return (
    <div className="flex flex-col items-center gap-6 mt-10">

      {/* ===== CARD WRAPPER (handles 3D flip) ===== */}
      <div
        className="relative w-[420px] h-[520px] cursor-pointer perspective"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`absolute inset-0 transition-transform duration-500 preserve-3d ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* ===== FRONT ===== */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-xl px-8 py-10 flex flex-col items-center backface-hidden"
          >
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
              {card.word}
            </h1>

            <p className="text-center text-gray-700 text-lg max-w-[320px] leading-relaxed mb-4">
              {card.definition}
            </p>

            <p className="text-gray-500 text-sm mb-6">
              {card.translation_es} {card.translation_es && card.translation_fr && "/"}{" "}
              {card.translation_fr}
            </p>

            <button
              onClick={generateMnemonic}
              disabled={loadingMnemonic}
              className="mt-4 px-6 py-3 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 disabled:opacity-50"
            >
              {loadingMnemonic ? "Generating…" : "Generate Mnemonic"}
            </button>
          </div>

          {/* ===== BACK ===== */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-xl px-8 py-10 flex flex-col items-center rotate-y-180 backface-hidden"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Mnemonic</h2>

            <p className="text-gray-700 mb-2">
              <span className="font-semibold">Word:</span>{" "}
              {card.mnemonic_word || "—"}
            </p>

            {card.image_url && (
              <img
                src={card.image_url}
                className="w-64 h-64 object-cover rounded-xl shadow mb-4"
              />
            )}

            {card.mnemonic_sentence && (
              <p className="text-center text-gray-700 text-md max-w-[320px] leading-relaxed">
                {card.mnemonic_sentence}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== NAVIGATION ===== */}
      <div className="flex items-center gap-4 mt-4">
      <button
        onClick={prev}
        disabled={index === 0}
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl disabled:opacity-40"
      >
        ◀ Prev
      </button>

      <span className="text-gray-800 font-medium">
        {index + 1} / {cards.length}
      </span>

      {index === cards.length - 1 ? (
        <button
          onClick={() => router.push("/crossword")}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl disabled:opacity-40"
        >
          Crossword
        </button>
      ) : (
        <button
          onClick={next}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl disabled:opacity-40"
        >
          Next ▶
        </button>
      )}
      </div>
    </div>
  );
}
