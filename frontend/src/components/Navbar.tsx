"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setUser({}); // User is logged in
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  };

  return (
    <nav className="w-full bg-white shadow-sm h-14 flex items-center px-6 fixed top-0 left-0 z-50">
      <div className="flex justify-between w-full">
        <Link href="/" className="text-xl font-bold text-green-600">
          EaseeVocab
        </Link>

        <div className="flex gap-6 text-gray-700 font-medium items-center">
          <Link href="/learn" className="hover:text-green-600">
            Learn
          </Link>
          <Link href="/crossword" className="hover:text-green-600">
            Crossword
          </Link>

          {/* Login / Logout */}
          {!user ? (
            <Link
              href="/login"
              className="bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700"
            >
              Login
            </Link>
          ) : (
            <button
              onClick={logout}
              className="bg-gray-200 px-3 py-1 rounded-lg hover:bg-gray-300"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
