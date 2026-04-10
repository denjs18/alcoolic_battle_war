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

  const [game, setGame] = useState<GameData | null>(null);
  const [myTeam, setMyTeam] = useState<TeamId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drink notification state — track seen IDs to avoid re-showing
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

    const unsub = subscribeToGame(gameId, (data) => {
      setGame(data);
      setLoading(false);

      // Show drink notification if new and not seen
      if (data.drinkNotification) {
        const notif = data.drinkNotification;
        if (!seenNotifIds.current.has(notif.id)) {
          seenNotifIds.current.add(notif.id);
          setActiveNotif(notif);
        }
      }
    });

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
        <a href="/" className="text-cyan-400 underline">
          Retour à l&apos;accueil
        </a>
      </div>
    );
  }

  const myData = game[myTeam];
  const opponentTeam: TeamId = myTeam === "team1" ? "team2" : "team1";
  const opponentData = game[opponentTeam];

  return (
    <>
      {/* WAITING: team2 hasn't joined yet */}
      {game.status === "waiting" && (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="text-5xl">⚓</div>
          <div>
            <h2 className="text-2xl font-black text-cyan-400">En attente...</h2>
            <p className="text-slate-400 mt-1">
              Donne ce code à l&apos;autre équipe :
            </p>
          </div>
          <div className="bg-ocean-mid border-2 border-cyan-600 rounded-2xl px-10 py-6">
            <p className="text-5xl font-black text-white tracking-widest font-mono">
              {gameId}
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            L&apos;autre équipe entre ce code sur son téléphone
          </p>
        </div>
      )}

      {/* PLACING: both teams place ships */}
      {game.status === "placing" && !myData.ready && (
        <PlacementScreen teamName={myData.name} onReady={handleReady} />
      )}

      {game.status === "placing" && myData.ready && (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl animate-bounce">⏳</div>
          <h2 className="text-2xl font-black text-cyan-400">Bateaux placés !</h2>
          <p className="text-slate-400">
            En attente de {opponentData.name || "l'adversaire"}...
          </p>
          {!opponentData.name && (
            <p className="text-slate-600 text-sm">
              (L&apos;adversaire doit rejoindre avec le code <strong className="text-white font-mono">{gameId}</strong>)
            </p>
          )}
        </div>
      )}

      {/* PLAYING / FINISHED */}
      {(game.status === "playing" || game.status === "finished") && (
        <BattleScreen game={game} gameId={gameId} myTeam={myTeam} />
      )}

      {/* Drink notification overlay */}
      {activeNotif && (
        <DrinkAlert
          notification={activeNotif}
          myTeam={myTeam}
          onDismiss={dismissNotif}
        />
      )}
    </>
  );
}
