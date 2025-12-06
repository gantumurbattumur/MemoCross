"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import { api } from "@/lib/api";

export default function LearnPage() {
  const [words, setWords] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // STEP 1 — Get current user
        const userInfo = await api("/auth/me");
        setUser(userInfo);

        // STEP 2 — Fetch daily word batch
        const data = await api("/words/daily", {
          method: "POST",
          body: JSON.stringify({
            user_id: userInfo.id,
            level: "a1",
            limit: 10,
          }),
        });

        setWords(data.words || []);
      } catch (err) {
        console.error("Error loading daily words:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <ProtectedPage>
        <div className="p-6">Loading today's words...</div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Today's Words</h1>

        {words.length === 0 && <p>No words assigned today.</p>}

        {words.map((w) => (
          <div key={w.id} className="border rounded p-4 shadow-sm">
            <div className="font-bold text-lg">{w.word}</div>
            <div>{w.definition}</div>
            <div className="text-gray-500 text-sm">
              {w.translation_es} / {w.translation_fr}
            </div>
          </div>
        ))}
      </div>
    </ProtectedPage>
  );
}
