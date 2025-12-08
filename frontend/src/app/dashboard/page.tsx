"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Language = "es" | "fr" | null;

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if language is already selected in localStorage
    const savedLanguage = localStorage.getItem("learning_language") as Language;
    if (savedLanguage && (savedLanguage === "es" || savedLanguage === "fr")) {
      setSelectedLanguage(savedLanguage);
    }

    // Try to get user info (optional, won't break if not logged in)
    const token = localStorage.getItem("access_token");
    if (token) {
      // Only try to get user if logged in
      fetch("http://localhost:8000/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.ok ? res.json() : null)
        .then(setUser)
        .catch(() => {
          // User not logged in or invalid token, that's okay
          setUser(null);
        });
    }
  }, []);

  const handleLanguageSelect = (lang: "es" | "fr") => {
    setSelectedLanguage(lang);
    localStorage.setItem("learning_language", lang);
    // Navigate immediately - no pre-generation to slow things down
    router.push(`/learn?lang=${lang}`);
  };

  return (
    <div className="p-8 min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full">
        {user ? (
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
            Welcome back, {user.name}! 👋
          </h1>
        ) : (
          <h1 className="text-3xl font-bold mb-2 text-center text-gray-900">
            Welcome to EaseeVocab! 🎓
          </h1>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
            Select Your Learning Language
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Choose the language you want to memorize words in. You can start learning immediately without signing up!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Spanish Option */}
            <button
              onClick={() => handleLanguageSelect("es")}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedLanguage === "es"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <div className="text-4xl mb-3">🇪🇸</div>
              <h3 className="text-xl font-bold mb-2">Spanish</h3>
              <p className="text-gray-600 text-sm">
                Learn English words with Spanish translations
              </p>
            </button>

            {/* French Option */}
            <button
              onClick={() => handleLanguageSelect("fr")}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedLanguage === "fr"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <div className="text-4xl mb-3">🇫🇷</div>
              <h3 className="text-xl font-bold mb-2">French</h3>
              <p className="text-gray-600 text-sm">
                Learn English words with French translations
              </p>
            </button>
          </div>

          {selectedLanguage && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Selected: <span className="font-bold">
                  {selectedLanguage === "es" ? "Spanish" : "French"}
                </span>
              </p>
              <a
                href="/learn"
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Learning →
              </a>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/crossword"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                🧩 Crossword Challenge
              </a>
              {!user && (
                <a
                  href="/login"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Sign in to Track Progress
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-lg mb-2">Interactive Flashcards</h3>
            <p className="text-sm text-gray-600">
              Learn with sound-a-like words and AI-generated images
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">🧩</div>
            <h3 className="font-bold text-lg mb-2">Crossword Puzzles</h3>
            <p className="text-sm text-gray-600">
              Test your memorization with fun crossword challenges
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-bold text-lg mb-2">Word History</h3>
            <p className="text-sm text-gray-600">
              Track all the words you've memorized
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
