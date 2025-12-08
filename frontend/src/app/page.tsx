export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-4xl font-bold mb-6">Welcome to EaseeVocab</h1>
      <p className="text-lg mb-4">Learn faster with sound-a-like words + AI-generated puzzles.</p>
      <p className="text-gray-600 mb-8 text-base">
        No sign-up required! Start learning immediately, or sign in to track your progress.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="/dashboard"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
        >
          Start Learning (No Sign-up) →
        </a>
        <a
          href="/login"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
        >
          Sign in to Track Progress
        </a>
      </div>
    </div>
  );
}
