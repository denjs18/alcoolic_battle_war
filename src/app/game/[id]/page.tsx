"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { GameData, TeamId, PlacedShip, DrinkNotification } from "@/types/game";
import { subscribeToGame, placeShips } from "@/lib/gameService";
import PlacementScreen from "@/components/PlacementScreen";
import BattleScreen from "@/components/BattleScreen";
import DrinkAlert from "@/components/DrinkAlert";

export default function GamePage() {
  const params = useParams();
  const gameId = (params.id as string).toUpperCase();

  const [game, setGame]       = useState<GameData | null>(null);
  const [myTeam, setMyTeam]   = useState<TeamId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [connected, setConnected] = useState(true);

  const [activeNotif, setActiveNotif] = useState<DrinkNotification | null>(null);
  const seenNotifIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(`abw_${gameId}`) as TeamId | null;
    if (!stored) {
      setError("Partie introuvable. Retourne à l'accueil.");
      setLoading(false);
      return;
    }
    setMyTeam(stored);

    const unsub = subscribeToGame(
      gameId,
      (data) => {
        setGame(data);
        setLoading(false);
        setConnected(true);

        if (data.drinkNotification) {
          const notif = data.drinkNotification;
          if (!seenNotifIds.current.has(notif.id)) {
            seenNotifIds.current.add(notif.id);
            setActiveNotif(notif);
          }
        }
      },
      (isConnected) => setConnected(isConnected)
    );

    return () => unsub();
  }, [gameId]);

  const handleReady = useCallback(
    async (ships: PlacedShip[]) => {
      if (!myTeam) return;
      await placeShips(gameId, myTeam, ships);
    },
    [gameId, myTeam]
  );

  const dismissNotif = useCallback(() => setActiveNotif(null), []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">Connexion...</div>
      </div>
    );
  }

  if (error || !game || !myTeam) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-red-400 text-center">{error || "Erreur inattendue"}</div>
        <a href="/" className="text-cyan-400 underline">Retour à l&apos;accueil</a>
      </div>
    );
  }

  const myData       = game[myTeam];
  const opponentTeam: TeamId = myTeam === "team1" ? "team2" : "team1";
  const opponentData = game[opponentTeam];

  return (
    <>
      {/* Indicateur de connexion Supabase */}
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-orange-900/90 text-orange-200 text-xs text-center py-1.5 font-mono animate-alert-flash">
          ⚠ Reconnexion en cours...
        </div>
      )}

      {/* WAITING */}
      {game.status === "waiting" && (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="text-5xl">⚓</div>
          <div>
            <h2 className="text-2xl font-black text-cyan-400">En attente...</h2>
            <p className="text-slate-400 mt-1">Donne ce code à l&apos;autre équipe :</p>
          </div>
          <div className="bg-slate-900 border-2 border-cyan-600 rounded-2xl px-10 py-6">
            <p className="text-5xl font-black text-white tracking-widest font-mono">{gameId}</p>
          </div>
          <p className="text-slate-500 text-sm">
            L&apos;autre équipe entre ce code sur son téléphone
          </p>
        </div>
      )}

      {/* PLACING — pas encore prêt */}
      {game.status === "placing" && !myData.ready && (
        <PlacementScreen teamName={myData.name} onReady={handleReady} />
      )}

      {/* PLACING — prêt, attente adversaire */}
      {game.status === "placing" && myData.ready && (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl animate-bounce">⏳</div>
          <h2 className="text-2xl font-black text-cyan-400">Bateaux placés !</h2>
          <p className="text-slate-400">
            En attente de {opponentData.name || "l'adversaire"}...
          </p>
          {/* Indicateur si l'adversaire a aussi placé ses bateaux */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-3 h-3 rounded-full ${myData.ready ? "bg-green-500" : "bg-slate-600"}`} />
            <span className="text-slate-400 text-sm">{myData.name} — prêt</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${opponentData.ready ? "bg-green-500" : "bg-slate-600"}`} />
            <span className="text-slate-400 text-sm">
              {opponentData.name || "Adversaire"} — {opponentData.ready ? "prêt" : "place ses bateaux..."}
            </span>
          </div>
        </div>
      )}

      {/* PLAYING / FINISHED */}
      {(game.status === "playing" || game.status === "finished") && (
        <BattleScreen game={game} gameId={gameId} myTeam={myTeam} />
      )}

      {/* Drink notification */}
      {activeNotif && (
        <DrinkAlert notification={activeNotif} myTeam={myTeam} onDismiss={dismissNotif} />
      )}
    </>
  );
}
