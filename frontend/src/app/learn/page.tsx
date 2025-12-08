"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Flashcards from "@/components/Flashcards";

export default function LearnPage() {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api("/words/daily", {
          method: "POST"
        });

        // backend returns an array already
        setWords(data || []);
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
      <div className="p-6">Loading today's words...</div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-center p-4">
      <Flashcards words={words} />
    </div>
  );
}
