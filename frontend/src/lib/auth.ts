"use client";

export async function authenticateWithGoogle(googleUser: any) {
  const id_token = googleUser.credential;

  const res = await fetch("http://localhost:8000/auth/google/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token }),
  });

  if (!res.ok) {
    alert("Login failed");
    return;
  }

  const data = await res.json();

  // store token locally (temporary storage)
  localStorage.setItem("access_token", data.token);

  // redirect to learning
  window.location.href = "/learn";
}
