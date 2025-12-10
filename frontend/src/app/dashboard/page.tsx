"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import OnboardingModal from "@/components/OnboardingModal";
import ProgressRing from "@/components/ProgressRing";
import StatsCard from "@/components/StatsCard";

type Language = "es" | "fr" | null;
type Level = "a1" | "a2" | "b1" | "b2" | null;

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState({
    wordsToday: 0,
    totalWords: 0,
    streak: 0,
    xp: 0,
    level: 1,
  });
  const router = useRouter();

  useEffect(() => {
    // Check for first-time user - show onboarding
    const hasSeenOnboarding = localStorage.getItem("has_seen_onboarding");
    if (!hasSeenOnboarding) {
      // Wait a bit before showing onboarding
      setTimeout(() => setShowOnboarding(true), 500);
    }

    // Check if language and level are already selected in localStorage
    const savedLanguage = localStorage.getItem("learning_language") as Language;
    const savedLevel = localStorage.getItem("learning_level") as Level;
    if (savedLanguage && (savedLanguage === "es" || savedLanguage === "fr")) {
      setSelectedLanguage(savedLanguage);
    }
    if (savedLevel && (savedLevel === "a1" || savedLevel === "a2" || savedLevel === "b1" || savedLevel === "b2")) {
      setSelectedLevel(savedLevel);
    }

    // Try to get user info (optional, won't break if not logged in)
    const token = localStorage.getItem("access_token");
    if (token) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // Only try to get user if logged in
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((userData) => {
          setUser(userData);
          // Load stats
          if (userData) {
            loadUserStats(userData.id, token);
          }
        })
        .catch(() => {
          // User not logged in or invalid token, that's okay
          setUser(null);
        });
    }

    // Load basic stats from localStorage for guest users
    loadLocalStats();
  }, []);

  const loadLocalStats = () => {
    try {
      const history = JSON.parse(localStorage.getItem("word_history") || "[]");
      const today = new Date().toISOString().split("T")[0];
      const wordsToday = history.filter((w: any) => w.date?.startsWith(today)).length;
      
      setStats({
        wordsToday,
        totalWords: history.length,
        streak: parseInt(localStorage.getItem("streak") || "0"),
        xp: parseInt(localStorage.getItem("xp") || "0"),
        level: Math.floor(parseInt(localStorage.getItem("xp") || "0") / 100) + 1,
      });
    } catch (e) {
      console.error("Error loading local stats:", e);
    }
  };

  const loadUserStats = async (userId: number, token: string) => {
    try {
      // TODO: Create stats endpoint
      // For now, use user data
      if (user) {
        setStats(prev => ({
          ...prev,
          streak: user.streak_count || 0,
        }));
      }
    } catch (e) {
      console.error("Error loading user stats:", e);
    }
  };

  const handleLanguageSelect = (lang: "es" | "fr") => {
    setSelectedLanguage(lang);
    localStorage.setItem("learning_language", lang);
    // Don't navigate yet - wait for level selection
  };

  const handleLevelSelect = (level: "a1" | "a2" | "b1" | "b2") => {
    setSelectedLevel(level);
    localStorage.setItem("learning_level", level);
    // Navigate to learn page with both language and level
    if (selectedLanguage) {
      router.push(`/learn?lang=${selectedLanguage}&level=${level}`);
    }
  };

  const todayProgress = Math.min((stats.wordsToday / 10) * 100, 100);
  const nextLevelXP = stats.level * 100;
  const xpProgress = ((stats.xp % 100) / 100) * 100;

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-800">
      <Sidebar />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      
      <div className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section with CTA */}
          <div className="mb-8 animate-fadeIn">
            {user ? (
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                  Welcome back, {user.name}! 👋
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Ready to learn something new today?
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                  Start Your Learning Journey 🚀
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Learn 10 new words every day with AI-powered memory techniques
                </p>
              </div>
            )}
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slideUp">
            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-600 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Today's Goal
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.wordsToday} / 10
                  </p>
                </div>
                <ProgressRing
                  progress={todayProgress}
                  size={80}
                  strokeWidth={6}
                  label={stats.wordsToday.toString()}
                  subtitle="words"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats.wordsToday >= 10 ? "🎉 Goal completed!" : `${10 - stats.wordsToday} more to go`}
              </p>
            </div>

            <StatsCard
              icon="🔥"
              label="Streak"
              value={stats.streak}
              subtitle="days in a row"
              color="rose"
            />

            <StatsCard
              icon="⭐"
              label="XP"
              value={stats.xp}
              subtitle={`Level ${stats.level}`}
              color="yellow"
            />

            <StatsCard
              icon="📚"
              label="Words Learned"
              value={stats.totalWords}
              subtitle="total words"
              color="blue"
            />
          </div>

          {/* Main CTA Card */}
          {(!selectedLanguage || !selectedLevel) && (
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl shadow-xl p-8 mb-8 border-2 border-rose-200 dark:border-rose-800 animate-scaleIn">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {stats.wordsToday > 0 ? "Continue Learning" : "Start Learning Today"} →
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                  Select your language and level below to begin your daily word session
                </p>
              </div>
            </div>
          )}

        {/* How It Works Section - Collapsible */}
        <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-lg mb-6 border border-gray-200 dark:border-slate-600 overflow-hidden card-hover">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-200"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              How It Works
            </h2>
            <span className="text-2xl transition-transform duration-300 text-gray-600 dark:text-gray-400">
              {showHowItWorks ? "−" : "+"}
            </span>
          </button>

          {showHowItWorks && (
            <div className="p-8 border-t border-gray-200 dark:border-gray-700">
              {/* Interactive Flashcard Demo */}
              <div className="flex flex-col lg:flex-row items-center justify-center gap-12 mb-8">
                <div className="flex-shrink-0">
                  <div
                    className="relative w-[350px] h-[450px] cursor-pointer perspective"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div
                      className={`absolute inset-0 transition-transform duration-500 preserve-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                    >
                      {/* Front */}
                      <div className="absolute inset-0 bg-white border-2 border-gray-300 rounded-2xl shadow-xl px-8 py-10 flex flex-col items-center justify-center backface-hidden">
                        <div className="text-center mb-6 pb-6 border-b-2 border-gray-200 w-full">
                          <h3 className="text-4xl font-extrabold text-gray-900 mb-2">
                            plato
                          </h3>
                          <p className="text-sm text-gray-500">[pla-to]</p>
                        </div>
                        <div className="text-center">
                          <h4 className="text-2xl font-bold text-gray-800 mb-2">
                            plate
                          </h4>
                          <p className="text-gray-600 text-sm mb-4">
                            A flat dish for serving food
                          </p>
                          <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm border border-gray-300">
                            Click to flip
                          </div>
                        </div>
                      </div>

                      {/* Back */}
                      <div className="absolute inset-0 bg-white border-2 border-gray-300 rounded-2xl shadow-xl px-8 py-8 flex flex-col items-center justify-center rotate-y-180 backface-hidden">
                        <div className="text-center mb-4 w-full">
                          <h3 className="text-5xl font-extrabold text-gray-900 mb-2">
                            plato
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">[pla-to]</p>
                        </div>
                        
                        {showImage ? (
                          <div className="mb-4 w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                            <div className="text-gray-600 text-center">
                              <div className="text-2xl mb-2 font-semibold">Image</div>
                              <p className="text-sm">AI-Generated Visual Aid</p>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4 w-full h-48 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                            <div className="text-gray-500 text-center">
                              <div className="animate-spin text-2xl mb-2 font-semibold">⟳</div>
                              <p className="text-sm">Generating image...</p>
                            </div>
                          </div>
                        )}

                        <div className="text-center">
                          <p className="text-gray-700 text-sm mb-2">
                            <span className="font-semibold">Sound-a-like:</span>{" "}
                            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">"plate-o"</span>
                          </p>
                          <p className="text-gray-500 text-xs">
                            Think of a plate with an "o" - a plate-o!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-1 max-w-md">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 animate-fadeIn">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg text-2xl">
                        🔊
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Sound-a-like Words
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          Connect new words to familiar sounds. "Plato" sounds like "plate-o" - a plate with an O!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg text-2xl">
                        🖼️
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          AI-Generated Images
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          Visual memory aids created by AI to help you remember words faster and more effectively.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg text-2xl">
                        🧩
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Crossword Puzzles
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          Test your memorization with fun crossword challenges using the words you've learned.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                      <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg text-2xl">
                        📊
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Track Progress
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          Sign in to track your learning streak, view word history, and see your improvement over time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
                  Pro Tips
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-gray-700 dark:text-blue-400 font-bold">RR</span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm">Review Regularly</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      Come back daily to review words
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-gray-700 dark:text-purple-400 font-bold">SL</span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm">Use Sound-a-likes</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      Create strong mental connections
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-gray-700 dark:text-green-400 font-bold">CW</span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm">Practice with Puzzles</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      Complete crosswords to reinforce learning
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-700 rounded-2xl shadow-lg p-6 md:p-8 mb-6 border border-gray-200 dark:border-slate-600 animate-fadeIn">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center text-gray-900 dark:text-gray-100">
            Select Your Learning Language
          </h2>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 text-center mb-8">
            Choose your language and level to get started
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Spanish Option */}
            <button
              onClick={() => handleLanguageSelect("es")}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedLanguage === "es"
                  ? "border-gray-900 dark:border-blue-500 bg-white dark:bg-blue-900/30"
                  : "border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-blue-900/20"
              }`}
            >
              <div className="text-5xl mb-3 animate-scaleIn">🇪🇸</div>
              <h3 className={`text-2xl md:text-3xl font-bold mb-2 ${
                selectedLanguage === "es"
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-gray-900 dark:text-gray-100"
              }`}>Spanish</h3>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                Learn English words with Spanish translations
              </p>
            </button>

            {/* French Option */}
            <button
              onClick={() => handleLanguageSelect("fr")}
              className={`p-6 md:p-8 rounded-xl border-2 transition-all card-hover ${
                selectedLanguage === "fr"
                  ? "border-rose-500 dark:border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 shadow-lg scale-[1.02]"
                  : "border-gray-300 dark:border-slate-600 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              }`}
            >
              <div className="text-5xl mb-3 animate-scaleIn">🇫🇷</div>
              <h3 className={`text-2xl md:text-3xl font-bold mb-2 ${
                selectedLanguage === "fr"
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-gray-900 dark:text-gray-100"
              }`}>French</h3>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                Learn English words with French translations
              </p>
            </button>
          </div>

          {selectedLanguage && (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Selected: <span className="font-bold text-gray-900 dark:text-blue-300">
                  {selectedLanguage === "es" ? "Spanish" : "French"}
                </span>
              </p>
              
              {/* Level Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Select Your Level
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(["a1", "a2", "b1", "b2"] as const).map((level) => {
                    const levelNames: Record<string, string> = {
                      a1: "Beginner",
                      a2: "Elementary",
                      b1: "Intermediate",
                      b2: "Upper Intermediate",
                    };
                    const levelColors: Record<string, string> = {
                      a1: "from-green-400 to-emerald-500",
                      a2: "from-blue-400 to-cyan-500",
                      b1: "from-purple-400 to-pink-500",
                      b2: "from-orange-400 to-red-500",
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => handleLevelSelect(level)}
                        className={`p-5 rounded-xl border-2 transition-all card-hover ${
                          selectedLevel === level
                            ? `border-rose-500 bg-gradient-to-br ${levelColors[level]} text-white shadow-lg scale-[1.05] font-bold`
                            : "border-gray-300 dark:border-slate-600 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-700"
                        }`}
                      >
                        <div className={`text-3xl font-bold mb-2 ${
                          selectedLevel === level ? "text-white" : "text-gray-900 dark:text-gray-300"
                        }`}>
                          {level.toUpperCase()}
                        </div>
                        <div className={`text-xs font-medium ${
                          selectedLevel === level ? "text-white/90" : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {levelNames[level]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedLevel && (
                <a
                  href={`/learn?lang=${selectedLanguage}&level=${selectedLevel}`}
                  className="inline-block px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 animate-pulse-slow"
                >
                  Start Learning →
                </a>
              )}
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/crossword"
                className="px-6 py-2 bg-pink-200 dark:bg-pink-300 text-gray-900 dark:text-gray-900 rounded-lg hover:bg-pink-300 dark:hover:bg-pink-400 border border-pink-300 dark:border-pink-400 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Today's Crossword Challenge
              </a>
              {!user && (
                <a
                  href="/login"
                  className="px-6 py-2 bg-pink-200 dark:bg-pink-300 text-gray-900 dark:text-gray-900 rounded-lg hover:bg-pink-300 dark:hover:bg-pink-400 border border-pink-300 dark:border-pink-400 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  Sign in to Track Progress
                </a>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
