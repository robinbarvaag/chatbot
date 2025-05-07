"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false
    });
    setLoading(false);
    if (res?.error) setError("Ugyldig brukernavn eller passord");
    if (res?.ok) window.location.href = "/";
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-8 border rounded bg-card">
      <h1 className="text-2xl font-bold mb-6">Logg inn</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          placeholder="Brukernavn"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="Passord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Logger inn..." : "Logg inn"}
        </Button>
      </form>
    </div>
  );
}
