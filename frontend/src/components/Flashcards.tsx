"use client";

import { useEffect, useState } from "react";
import {useRouter} from "next/navigation";
import { api } from "@/lib/api";
import ErrorToast from "./ErrorToast";

type Language = "es" | "fr";

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

interface FlashcardsProps {
  words: Word[];
  language: Language;
  onIndexChange?: (index: number) => void;
  currentIndex?: number;
  onIndexSet?: (index: number) => void;
}

export default function Flashcards({ words, language, onIndexChange, currentIndex, onIndexSet }: FlashcardsProps) {
  const [cards, setCards] = useState<Word[]>([]);
  const [internalIndex, setInternalIndex] = useState(0);
  
  // Use external index if provided, otherwise use internal
  const index = currentIndex !== undefined ? currentIndex : internalIndex;
  
  const setIndex = (newIndex: number) => {
    if (onIndexSet) {
      onIndexSet(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  };
  const [flipped, setFlipped] = useState(false);
  const [loadingMnemonic, setLoadingMnemonic] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [crosswordMode, setCrosswordMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  // Load words and pre-generated images for first 3 cards
  useEffect(() => {
    setCards(words || []);
    const resetIndex = 0;
    if (onIndexSet) {
      onIndexSet(resetIndex);
    } else {
      setInternalIndex(resetIndex);
    }

    // Auto-load pre-generated images for first 3 cards
    if (words && words.length > 0) {
      const loadPreGeneratedImages = async () => {
        const firstThree = words.slice(0, 3);
        const updatedCards = [...words];

        for (let i = 0; i < firstThree.length; i++) {
          const card = firstThree[i];
          const translation = language === "es" ? card.translation_es : card.translation_fr;
          
          if (!translation) continue;

          try {
            // First check if text is cached
            const textData = await api("/mnemonic/generate-text", {
              method: "POST",
              body: JSON.stringify({
                word: translation,
                definition: card.definition,
                language: language,
              }),
            });

            // If text is cached, check for image
            if (textData.cached && textData.mnemonic_sentence) {
              try {
                const imageData = await api("/mnemonic/generate-image", {
                  method: "POST",
                  body: JSON.stringify({
                    word: translation,
                    definition: card.definition,
                    mnemonic_sentence: textData.mnemonic_sentence,
                    language: language,
                  }),
                });

                // Update card with both text and image if available
                updatedCards[i] = {
                  ...card,
                  mnemonic_word: textData.mnemonic_word,
                  mnemonic_sentence: textData.mnemonic_sentence,
                  image_url: imageData.image_base64 
                    ? `data:image/png;base64,${imageData.image_base64}`
                    : undefined,
                };
              } catch (imgErr) {
                // Image not cached, but text is - still load text
                updatedCards[i] = {
                  ...card,
                  mnemonic_word: textData.mnemonic_word,
                  mnemonic_sentence: textData.mnemonic_sentence,
                };
              }
            }
          } catch (err) {
            // If not cached or error, that's fine - user can generate manually
            console.log(`Pre-generated content not found for card ${i}, will generate on demand`);
          }
        }

        // Only update if we found any pre-generated content
        const hasUpdates = updatedCards.some((card, i) => 
          i < 3 && (card.mnemonic_word || card.image_url)
        );

        if (hasUpdates) {
          setCards(updatedCards);
        }
      };

      loadPreGeneratedImages();
    }
  }, [words, onIndexSet, language]);

  // Reset flipped state when index changes
  useEffect(() => {
    setFlipped(false);
  }, [index]);

  // Notify parent of index changes
  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(index);
    }
  }, [index, onIndexChange]);

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
  
  // Safety check: ensure card exists before rendering
  if (!card) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <span className="text-gray-700 text-lg font-medium">
          No card data available
        </span>
      </div>
    );
  }

  const next = () => {
    if (index < cards.length - 1) {
      setIndex(index + 1);
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


  // Get the translation based on selected language
  const getTranslation = () => {
    if (language === "es") return card.translation_es;
    if (language === "fr") return card.translation_fr;
    return null;
  };

  const translation = getTranslation();

  // Generate mnemonic for the selected language word
  async function generateMnemonic(e: React.MouseEvent) {
    e.stopPropagation(); // prevents flip

    if (!translation) {
      setError(`No ${language === "es" ? "Spanish" : "French"} translation available for this word.`);
      return;
    }

    setLoadingMnemonic(true);

    try {
      // Step 1: Generate text first (fast, ~2 seconds)
      const textData = await api("/mnemonic/generate-text", {
        method: "POST",
        body: JSON.stringify({
          word: translation, // The foreign language word
          definition: card.definition, // English definition
          language: language, // Pass language for caching
        }),
      });

      // Update card immediately with text (fast)
      const updated = [...cards];
      updated[index] = {
        ...card,
        mnemonic_word: textData.mnemonic_word,
        mnemonic_sentence: textData.mnemonic_sentence,
        // Image will be added separately
      };
      setCards(updated);
      
      // Store text data in sessionStorage
      try {
        const cacheKey = `mnemonic_text_${card.id}_${language}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({
          mnemonic_word: textData.mnemonic_word,
          mnemonic_sentence: textData.mnemonic_sentence,
        }));
      } catch (e) {
        console.warn("Could not cache mnemonic text:", e);
      }
      
      // Flip automatically when mnemonic text is ready
      setFlipped(true);
      setLoadingMnemonic(false); // Text generation complete

      // Save to word history when mnemonic is generated
      const historyItem = {
        word: card.word,
        translation: translation,
        definition: card.definition,
        language: language === "es" ? "Spanish" : "French", // Keep display name for UI
        languageCode: language, // Store code for API lookup
        date: new Date().toISOString(),
      };
      
      // Save to localStorage (always, for guest users and fallback)
      const existingHistory = localStorage.getItem("word_history");
      let history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Check if word already exists in history
      const exists = history.some((h: any) => 
        h.word === historyItem.word && h.translation === historyItem.translation
      );
      
      if (!exists) {
        history.unshift(historyItem); // Add to beginning
        // Keep only last 100 words
        if (history.length > 100) {
          history = history.slice(0, 100);
        }
        localStorage.setItem("word_history", JSON.stringify(history));
        
        // If user is logged in, try to sync with backend (non-blocking)
        const token = localStorage.getItem("access_token");
        if (token) {
          // Note: Backend API endpoint for word history sync would go here
          // For now, we keep localStorage as the source of truth
          // This can be implemented when backend endpoint is ready
        }
      }

      // Step 2: Generate image separately (slower, ~8 seconds)
      setGeneratingImage(true);
      
      try {
        const imageData = await api("/mnemonic/generate-image", {
          method: "POST",
          body: JSON.stringify({
            word: translation,
            definition: card.definition,
            mnemonic_sentence: textData.mnemonic_sentence,
            language: language,
          }),
        });

        // Update card with image when ready
        const updatedWithImage = [...cards];
        updatedWithImage[index] = {
          ...updated[index],
          image_url: imageData.image_base64 
            ? `data:image/png;base64,${imageData.image_base64}`
            : undefined,
        };
        setCards(updatedWithImage);
      } catch (imgErr) {
        console.error("Image generation error:", imgErr);
        // Image generation failure is not critical, continue without image
      } finally {
        setGeneratingImage(false);
      }
    } catch (err) {
      console.error("Mnemonic error:", err);
      setError("Failed to generate mnemonic. Please try again.");
      setLoadingMnemonic(false);
      setGeneratingImage(false);
    }
  }

  // Generate pronunciation guide (simple syllable splitting)
  const getPronunciation = (word: string, lang: Language): string => {
    if (!word) return "";
    const lower = word.toLowerCase();
    
    if (lang === "es") {
      // Simple Spanish syllable splitting (basic version)
      // Split by vowels, but keep consonant clusters together
      const syllables = lower.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouáéíóúü]+[bcdfghjklmnpqrstvwxyz]*/gi) || [];
      return syllables.length > 0 ? `[${syllables.join("-")}]` : `[${lower}]`;
    } else if (lang === "fr") {
      // Simple French syllable splitting (basic version)
      const syllables = lower.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouàâäéèêëïîôùûüÿ]+[bcdfghjklmnpqrstvwxyz]*/gi) || [];
      return syllables.length > 0 ? `[${syllables.join("-")}]` : `[${lower}]`;
    }
    return `[${lower}]`;
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full animate-fadeIn">
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
      {/* ===== CARD WRAPPER (handles 3D flip) ===== */}
      <div
        className="relative w-full max-w-[90vw] h-[500px] sm:w-[480px] sm:h-[580px] md:w-[550px] md:h-[660px] lg:w-[650px] lg:h-[780px] xl:w-[750px] xl:h-[900px] 2xl:w-[850px] 2xl:h-[1020px] cursor-pointer perspective mx-auto"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`absolute inset-0 transition-transform duration-500 preserve-3d ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* ===== FRONT ===== */}
          <div
            className="absolute inset-0 bg-white dark:bg-slate-700 rounded-2xl shadow-2xl px-8 py-10 md:px-10 md:py-12 lg:px-12 lg:py-14 xl:px-14 xl:py-16 2xl:px-16 2xl:py-[72px] flex flex-col items-center justify-center backface-hidden overflow-hidden border border-gray-100 dark:border-slate-600"
          >
            {/* Spanish/French Section - Top Half */}
            <div className="flex flex-col items-center mb-6 pb-6 border-b-4 border-rose-200 dark:border-rose-700 w-full">
              {/* Selected Language Translation (Top) */}
              {translation ? (
                <>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-extrabold text-rose-600 dark:text-rose-400 mb-2">
                    {translation}
                  </h1>
                  {/* Pronunciation guide */}
                  <p className="text-xs md:text-sm lg:text-base text-gray-500 dark:text-gray-400 font-medium mb-3">
                    {getPronunciation(translation, language)}
                  </p>
                </>
              ) : (
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-extrabold text-gray-400 dark:text-gray-500 mb-3">
                  No translation
                </h1>
              )}
              <p className="text-xs md:text-sm lg:text-base text-rose-500 dark:text-rose-400 font-semibold uppercase tracking-wide">
                {language === "es" ? "Spanish" : "French"}
              </p>
            </div>

            {/* English Section - Bottom Half */}
            <div className="flex flex-col items-center">
              {/* English Word (Middle) */}
              <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-800 mb-2">
                {card.word}
              </h2>
              <p className="text-xs md:text-sm lg:text-base text-gray-500 font-semibold uppercase tracking-wide mb-3">
                English
              </p>

              {/* English Definition (Bottom) */}
              <p className="text-center text-gray-700 text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl max-w-[320px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[600px] 2xl:max-w-[700px] leading-relaxed mb-4">
                {card.definition}
              </p>

              {/* Always show generate button - user can regenerate if needed */}
              <button
                onClick={generateMnemonic}
                disabled={(loadingMnemonic || generatingImage) || !translation}
                className="px-5 py-2 md:px-6 md:py-3 lg:px-7 lg:py-3 xl:px-8 xl:py-4 2xl:px-10 2xl:py-5 bg-pink-200 dark:bg-pink-300 text-gray-900 dark:text-gray-900 rounded-xl shadow hover:bg-pink-300 dark:hover:bg-pink-400 border border-pink-300 dark:border-pink-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl transition-all"
              >
                {generatingImage 
                  ? "Generating image…" 
                  : loadingMnemonic 
                    ? "Generating text…" 
                    : "Generate Sound-a-like"}
              </button>
            </div>
          </div>

          {/* ===== BACK ===== */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-2xl px-8 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12 xl:px-14 xl:py-14 2xl:px-16 2xl:py-16 flex flex-col items-center justify-center rotate-y-180 backface-hidden overflow-hidden border border-rose-200 dark:border-slate-600"
          >
            {/* Translated word with pronunciation guide - Reduced size */}
            {translation && (
              <div className="w-full flex items-center justify-between mb-2">
                <p className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-extrabold text-rose-600 dark:text-rose-400">
                  {translation}
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {getPronunciation(translation, language)}
                </p>
              </div>
            )}

            {/* Sound-a-like word - Compact */}
            {card.mnemonic_word && (
              <div className="mb-3 w-full bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 md:p-3 border-2 border-rose-300 dark:border-rose-600 shadow-md animate-scaleIn">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="text-lg">🧠</span>
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Memory Technique
                  </p>
                </div>
                <p className="text-gray-800 dark:text-gray-200 text-xs md:text-sm text-center mb-1">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">Sound-a-like:</span>
                </p>
                <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-rose-600 dark:text-rose-400 text-center">
                  "{card.mnemonic_word}"
                </p>
              </div>
            )}

            {/* Mnemonic sentence - Compact */}
            {card.mnemonic_sentence && (
              <div className="text-center mb-2 max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[700px] 2xl:max-w-[800px]">
                <p className="text-gray-800 dark:text-gray-100 text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl leading-tight font-medium">
                  {card.mnemonic_sentence}
                </p>
              </div>
            )}

            {/* Visual Memory Aid Badge - Removed to save space */}

            {/* Large Image - Takes up remaining space */}
            {card.image_url ? (
              <div className="flex-1 w-full flex items-center justify-center mb-2 min-h-0 overflow-hidden">
                <div className="relative group w-full h-full">
                  <img
                    src={card.image_url}
                    className="w-full h-full max-w-full max-h-[500px] md:max-h-[600px] lg:max-h-[700px] xl:max-h-[800px] 2xl:max-h-[900px] object-contain rounded-xl shadow-xl border-2 border-rose-200 dark:border-rose-800 image-fade-in"
                    alt="Visual memory aid illustration"
                  />
                </div>
              </div>
            ) : generatingImage ? (
              <div className="flex-1 w-full flex flex-col items-center justify-center mb-3 min-h-0 bg-gradient-to-br from-gray-50 to-rose-50 dark:from-gray-800 dark:to-rose-900/20 rounded-xl border-2 border-dashed border-rose-300 dark:border-rose-600">
                <div className="flex flex-col items-center gap-3 px-4">
                  {/* Animated spinner */}
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-rose-200 dark:border-rose-700 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-rose-600 dark:border-rose-400 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold animate-pulse">
                    🎨 Generating image...
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs text-center max-w-[220px] leading-relaxed">
                    Creating a visual memory aid for you
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
}

// Navigation buttons component to be used in parent
export function FlashcardNavigation({
  index,
  total,
  onPrev,
  onNext,
  onCrossword,
  isLast,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onCrossword: () => void;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-4 w-full pt-4 border-t border-gray-200">
      <button
        onClick={onPrev}
        disabled={index === 0}
        className="px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl shadow-md hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100"
      >
        ◀ Prev
      </button>

      <div className="flex flex-col items-center">
        <span className="text-gray-800 dark:text-gray-200 font-bold text-lg min-w-[80px] text-center">
          {index + 1} / {total}
        </span>
        <div className="w-24 h-1 bg-gray-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {isLast ? (
        <button
          onClick={onCrossword}
          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl border border-rose-400 dark:border-rose-500 font-bold transition-all transform hover:scale-105"
        >
          🧩 Crossword →
        </button>
      ) : (
        <button
          onClick={onNext}
          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl border border-rose-400 dark:border-rose-500 font-bold transition-all transform hover:scale-105"
        >
          Next ▶
        </button>
      )}
    </div>
  );
}
