"use client";

import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-lg text-center">

        <h1 className="text-4xl font-extrabold mb-4">
          Sign in to MemoCross
        </h1>

        <p className="text-gray-600 mb-10">
          Boost your memory with powerful AI flashcards.
        </p>

        {/* 🔥 render Google button here */}
        <div className="flex justify-center mb-6">
          <GoogleLoginButton />
        </div>

        <p className="text-sm text-gray-500">
          By continuing, you agree to our{" "}
          <span className="underline">Terms of Service</span> and{" "}
          <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
