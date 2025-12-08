"use client";

import { useEffect } from "react";
import { authenticateWithGoogle } from "@/lib/auth";

export default function GoogleLoginButton() {
  useEffect(() => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: authenticateWithGoogle,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("google-login"),
      { theme: "outline", size: "large", width: "280" }
    );
  }, []);

  return <div id="google-login" />;
}
