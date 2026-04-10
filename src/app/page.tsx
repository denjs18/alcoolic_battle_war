"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGame, joinGame } from "@/lib/gameService";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [teamName, setTeamName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!teamName.trim()) return setError("Entre un nom d'équipe");
    setLoading(true);
    setError("");
    try {
      const gameId = await createGame(teamName.trim());
      // Remember we're team1
      localStorage.setItem(`abw_${gameId}`, "team1");
      router.push(`/game/${gameId}`);
    } catch {
      setError("Erreur lors de la création. Vérifie ta connexion.");
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!teamName.trim()) return setError("Entre un nom d'équipe");
    if (!gameCode.trim()) return setError("Entre le code de la partie");
    setLoading(true);
    setError("");
    const id = gameCode.trim().toUpperCase();
    try {
      const ok = await joinGame(id, teamName.trim());
      if (!ok) {
        setError("Code invalide ou partie déjà commencée");
        setLoading(false);
        return;
      }
      localStorage.setItem(`abw_${id}`, "team2");
      router.push(`/game/${id}`);
    } catch {
      setError("Erreur. Vérifie le code et ta connexion.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 gap-8">
      {/* Logo */}
      <div className="text-center">
        <div className="text-6xl mb-3">🚢</div>
        <h1 className="text-3xl font-black tracking-tight text-cyan-400">
          ALCOOLIC
        </h1>
        <h2 className="text-xl font-bold text-slate-300">BATTLE WAR</h2>
        <p className="text-slate-500 text-sm mt-1">Touché Coulé — édition shots</p>
      </div>

      {mode === "home" && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setMode("create")}
            className="btn-primary py-4 text-lg font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 transition-colors"
          >
            Créer une partie
          </button>
          <button
            onClick={() => setMode("join")}
            className="py-4 text-lg font-bold rounded-xl border-2 border-cyan-700 text-cyan-400 hover:bg-cyan-900 active:bg-cyan-800 transition-colors"
          >
            Rejoindre une partie
          </button>
        </div>
      )}

      {(mode === "create" || mode === "join") && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => { setMode("home"); setError(""); setTeamName(""); setGameCode(""); }}
            className="text-slate-400 text-sm self-start"
          >
            ← Retour
          </button>

          <h3 className="text-xl font-bold text-white">
            {mode === "create" ? "Nouvelle partie" : "Rejoindre"}
          </h3>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nom de ton équipe"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={20}
              className="bg-ocean-mid border border-ocean-light rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            {mode === "join" && (
              <input
                type="text"
                placeholder="Code de la partie (ex: AB3K7F)"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-ocean-mid border border-ocean-light rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 tracking-widest font-mono text-center text-lg uppercase"
              />
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={mode === "create" ? handleCreate : handleJoin}
              disabled={loading}
              className="py-4 text-lg font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Chargement..." : mode === "create" ? "Créer" : "Rejoindre"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
