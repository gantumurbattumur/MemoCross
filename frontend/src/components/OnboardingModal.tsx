"use client";

import { useState, useEffect } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem("has_seen_onboarding");
    if (!hasSeenOnboarding && isOpen) {
      // First time - show onboarding
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem("has_seen_onboarding", "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("has_seen_onboarding", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          {/* Step 1: Daily Batch */}
          {step === 1 && (
            <div className="text-center animate-fadeIn">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-4xl">📚</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Daily Word Batch
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Every day, you'll get 10 new words to learn. These are carefully selected based on your level.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  <span>10</span>
                  <span className="text-lg">words/day</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Consistent daily learning for better retention
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Memory Techniques */}
          {step === 2 && (
            <div className="text-center animate-fadeIn">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-4xl">🧠</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Memory Palace Technique
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Learn through sound-a-like words and AI-generated visual mnemonics that help you remember faster.
              </p>
              <div className="space-y-4 mb-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🔊</span>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Sound-a-like Words</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 ml-9">
                    "Plato" sounds like "plate-o" - a plate with an O!
                  </p>
                </div>
                <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🖼️</span>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">AI-Generated Images</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 ml-9">
                    Visual memory aids created by AI to make learning unforgettable
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review Process */}
          {step === 3 && (
            <div className="text-center animate-fadeIn">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-4xl">🔄</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Practice & Review
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                After learning words, test yourself with fun crossword puzzles. Track your progress and build streaks!
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="text-3xl mb-2">📖</div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">Learn</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">10 words/day</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="text-3xl mb-2">🧩</div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">Practice</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Crossword puzzles</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                  <div className="text-3xl mb-2">🔥</div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">Streak</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Daily progress</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
            >
              Skip
            </button>
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    s === step
                      ? "bg-rose-500 w-8"
                      : s < step
                      ? "bg-rose-300 dark:bg-rose-600"
                      : "bg-gray-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {step === totalSteps ? "Get Started!" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

