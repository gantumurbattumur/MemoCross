"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Flashcards, { FlashcardNavigation } from "@/components/Flashcards";
import Sidebar from "@/components/Sidebar";

type Language = "es" | "fr" | null;
type Level = "a1" | "a2" | "b1" | "b2" | null;

function LearnPageContent() {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordsReady, setWordsReady] = useState(false);
  const generatingRef = useRef(false);
  const initialWordsRef = useRef<any[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get language and level from URL params or localStorage
    const langParam = searchParams.get("lang") as Language;
    const levelParam = searchParams.get("level") as Level;
    const savedLang = localStorage.getItem("learning_language") as Language;
    const savedLevel = localStorage.getItem("learning_level") as Level;
    
    const lang = langParam || (savedLang && (savedLang === "es" || savedLang === "fr") ? savedLang : null);
    const level = levelParam || (savedLevel && (savedLevel === "a1" || savedLevel === "a2" || savedLevel === "b1" || savedLevel === "b2") ? savedLevel : null);
    
    if (lang) {
      setSelectedLanguage(lang);
      localStorage.setItem("learning_language", lang);
    } else {
      // No language selected, redirect to dashboard
      router.push("/dashboard");
      return;
    }
    
    if (level) {
      setSelectedLevel(level);
      localStorage.setItem("learning_level", level);
    } else {
      // No level selected, redirect to dashboard
      router.push("/dashboard");
      return;
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!selectedLanguage || !selectedLevel) return;

    const loadData = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        console.log("API URL:", API_BASE_URL);
        console.log("Request:", { level: selectedLevel, limit: 10 });
        
        const data = await api("/words/daily", {
          method: "POST",
          body: JSON.stringify({
            level: selectedLevel,
            limit: 10,
          }),
        });

        console.log("API Response:", data);
        
        // backend returns DailyWordsResponse with { date, count, words }
        // Extract the words array from the response
        const wordsData = data?.words || [];
        console.log("Words data:", wordsData.length, "words");
        setWords(wordsData);
        
        // Store initial words for reference
        initialWordsRef.current = wordsData;
        
        // Store words in localStorage for crossword to use
        localStorage.setItem("flashcard_words", JSON.stringify(wordsData));
        
        setWordsReady(true);
      } catch (err: any) {
        console.error("Error loading daily words:", err);
        console.error("Error details:", err.message);
        setError(err.message || "Failed to load words");
        setWords([]);
        setWordsReady(false);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedLanguage, selectedLevel]);

  // Images are generated on-demand when user clicks "Generate Sound-a-like" button
  // This provides better UX - no waiting, no storage quota issues

  if (!selectedLanguage || !selectedLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-800">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">Please select a language and level first</p>
          <a
            href="/dashboard"
            className="px-6 py-2 bg-pink-200 dark:bg-pink-300 text-gray-900 dark:text-gray-900 rounded-lg hover:bg-pink-300 dark:hover:bg-pink-400 border border-pink-300 dark:border-pink-400 transition-colors font-semibold"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Loading today's words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 p-6">
        <div className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[100rem] mx-auto">
          {/* Flashcards Section */}
          <div className="flex justify-center items-start gap-8">
            {/* Left: Flashcards */}
            <div className="flex-shrink-0">
              <Flashcards 
                words={words} 
                language={selectedLanguage} 
                onIndexChange={setCurrentIndex}
                currentIndex={currentIndex}
                onIndexSet={setCurrentIndex}
              />
            </div>

            {/* Right: Info Panel */}
            <div className="flex-1 max-w-sm">
              <div className="bg-white rounded-xl shadow-lg p-5 space-y-5 flex flex-col h-full">
                {/* Progress Card */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Today's Progress
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {words.length > 0 ? currentIndex + 1 : 0} / {words.length}
                    </span>
                  </div>
                </div>

                {/* Language Info */}
                <div className="text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Learning:</span>{" "}
                    {selectedLanguage === "es" ? "Spanish" : "French"} → English
                  </p>
                </div>

                {/* Completion Message */}
                {currentIndex === words.length - 1 && words.length === 10 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Great Job!
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Once you've completed all 10 flashcards for today, play the crossword to ensure your memorization!
                    </p>
                  </div>
                )}

                {/* Navigation Buttons at Bottom */}
                <div className="mt-auto">
                  <FlashcardNavigation
                    index={currentIndex}
                    total={words.length}
                    onPrev={() => {
                      if (currentIndex > 0) {
                        setCurrentIndex(currentIndex - 1);
                      }
                    }}
                    onNext={() => {
                      if (currentIndex < words.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                      }
                    }}
                    onCrossword={() => {
                      window.location.href = "/crossword";
                    }}
                    isLast={currentIndex === words.length - 1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <LearnPageContent />
    </Suspense>
  );
}
