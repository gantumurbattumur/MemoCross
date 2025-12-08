"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  locked?: boolean;
  tooltip?: string;
}

export default function Sidebar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      setIsAuthenticated(!!token);
    };

    // Check on mount
    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener("storage", checkAuth);

    // Also check periodically in case of same-tab login
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener("storage", checkAuth);
      clearInterval(interval);
    };
  }, []);

  const menuItems: MenuItem[] = [
    {
      name: "Flashcards",
      href: "/learn",
      icon: "📚",
      locked: false,
    },
    {
      name: "Crossword",
      href: "/crossword",
      icon: "🧩",
      locked: false,
    },
    {
      name: "Word History",
      href: "/words/history",
      icon: "📝",
      locked: false,
    },
    {
      name: "Connection",
      href: "/games/connection",
      icon: "🔗",
      locked: true,
      tooltip: "Coming soon",
    },
    {
      name: "Wordle",
      href: "/games/wordle",
      icon: "🎯",
      locked: true,
      tooltip: "Coming soon",
    },
    {
      name: "Streak",
      href: "/stats/streak",
      icon: "🔥",
      locked: true,
      tooltip: "Feature improvement",
    },
    {
      name: "Leaderboard",
      href: "/stats/leaderboard",
      icon: "🏆",
      locked: true,
      tooltip: "Feature improvement",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/learn") {
      return pathname?.startsWith("/learn");
    }
    return pathname === href;
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-16 z-40 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 px-2">Menu</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isLocked = item.locked; // Always locked if marked as locked
            const active = isActive(item.href);

            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed relative group"
                  title="Feature improvement"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  <span className="text-sm">🔒</span>
                  {/* Tooltip */}
                  {item.tooltip && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.tooltip}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sound-a-like Word Help Section */}
        <div className="mt-8 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span>💡</span> What is a Sound-a-like Word?
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            A sound-a-like word is a memory technique that helps you remember words by
            connecting them to something familiar that sounds similar. For example, to remember
            "tocar" (touch), think of a "toe car" - a car shaped like a toe!
          </p>
        </div>
      </div>
    </aside>
  );
}

