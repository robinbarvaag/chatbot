"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } else {
      const data = await res.json();
      setError(data.error || "Noe gikk galt");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-8 border rounded bg-card">
      <h1 className="text-2xl font-bold mb-6">Registrer deg</h1>
      <form onSubmit={handleRegister} className="space-y-4">
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
        {success && <div className="text-green-600 text-sm">Bruker opprettet! Du sendes til innlogging...</div>}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Registrerer..." : "Registrer"}
        </Button>
      </form>
    </div>
  );
}
