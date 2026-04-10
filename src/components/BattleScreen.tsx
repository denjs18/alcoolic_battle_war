"use client";

import { useState, useMemo } from "react";
import Grid from "./Grid";
import { GameData, TeamId, Cell, cellKey, isShipSunk, PlacedShip } from "@/types/game";
import { fireShot } from "@/lib/gameService";

interface BattleScreenProps {
  game: GameData;
  gameId: string;
  myTeam: TeamId;
}

export default function BattleScreen({ game, gameId, myTeam }: BattleScreenProps) {
  const [tab, setTab] = useState<"attack" | "defense">("attack");
  const [firing, setFiring] = useState(false);

  const opponentTeam: TeamId = myTeam === "team1" ? "team2" : "team1";
  const myData = game[myTeam];
  const opponentData = game[opponentTeam];

  // Shots I fired at opponent
  const myShotsField = myTeam === "team1" ? "byTeam1" : "byTeam2";
  const myShots = game.shots[myShotsField];

  // Shots opponent fired at me
  const opponentShotsField = myTeam === "team1" ? "byTeam2" : "byTeam1";
  const opponentShots = game.shots[opponentShotsField];

  const isMyTurn = game.currentTurn === myTeam;

  // My ship cells
  const myShipCells = useMemo(
    () => new Set(myData.ships.flatMap((s: PlacedShip) => s.cells.map(cellKey))),
    [myData.ships]
  );

  // Opponent sunk cells (for attack grid display)
  const opponentSunkCells = useMemo(() => {
    const sunk = new Set<string>();
    for (const ship of opponentData.ships) {
      if (isShipSunk(ship, myShots)) {
        ship.cells.forEach((c) => sunk.add(cellKey(c)));
      }
    }
    return sunk;
  }, [opponentData.ships, myShots]);

  // My sunk cells (for defense grid)
  const mySunkCells = useMemo(() => {
    const sunk = new Set<string>();
    for (const ship of myData.ships) {
      if (isShipSunk(ship, opponentShots)) {
        ship.cells.forEach((c) => sunk.add(cellKey(c)));
      }
    }
    return sunk;
  }, [myData.ships, opponentShots]);

  const alreadyShotCells = useMemo(() => new Set(Object.keys(myShots)), [myShots]);

  async function handleShot(cell: Cell) {
    if (!isMyTurn || firing) return;
    if (alreadyShotCells.has(cellKey(cell))) return;
    setFiring(true);
    try {
      await fireShot(gameId, myTeam, cell);
    } finally {
      setFiring(false);
    }
  }

  const myScore = Object.values(myShots).filter((v) => v === "hit").length;
  const totalOpponentCells = opponentData.ships.reduce((acc: number, s: PlacedShip) => acc + s.size, 0);

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className={`p-4 text-center border-b border-slate-700 ${isMyTurn ? "bg-cyan-900/30" : "bg-slate-900/30"}`}>
        {game.status === "finished" ? (
          <div>
            <span className="text-2xl font-black text-yellow-400">
              {game.winner === myTeam ? "VICTOIRE !" : "DÉFAITE..."}
            </span>
            <p className="text-slate-400 text-sm mt-1">
              {game.winner === myTeam
                ? "Vous avez coulé tous les bateaux adverses"
                : `${opponentData.name} a coulé tous vos bateaux`}
            </p>
          </div>
        ) : (
          <div>
            <span className={`text-lg font-black ${isMyTurn ? "text-cyan-300" : "text-slate-400"}`}>
              {isMyTurn ? "A VOUS DE JOUER" : `Tour de ${opponentData.name}...`}
            </span>
            <div className="flex justify-center gap-6 mt-2 text-xs text-slate-400">
              <span>Touchés : <strong className="text-white">{myScore}/{totalOpponentCells}</strong></span>
              <span>{myData.name} vs {opponentData.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setTab("attack")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            tab === "attack"
              ? "text-cyan-400 border-b-2 border-cyan-500 bg-cyan-900/20"
              : "text-slate-400"
          }`}
        >
          ATTAQUE
        </button>
        <button
          onClick={() => setTab("defense")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            tab === "defense"
              ? "text-cyan-400 border-b-2 border-cyan-500 bg-cyan-900/20"
              : "text-slate-400"
          }`}
        >
          DÉFENSE
        </button>
      </div>

      {/* Grid area */}
      <div className="flex-1 p-3 flex flex-col gap-4">
        {tab === "attack" ? (
          <>
            <div className="text-center text-xs text-slate-400 uppercase tracking-widest">
              Grille de {opponentData.name}
            </div>
            <Grid
              shots={myShots}
              sunkCells={opponentSunkCells}
              shotCells={alreadyShotCells}
              onCellClick={isMyTurn && !firing ? handleShot : undefined}
              disabled={!isMyTurn || firing}
            />
            <div className="flex flex-wrap gap-2 justify-center text-xs">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-sm bg-red-600 inline-block" /> Touché
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-sm bg-slate-700 inline-block" /> À l&apos;eau
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-sm bg-ocean-mid border border-ocean-light inline-block" /> Non tiré
              </span>
            </div>
            {isMyTurn && !firing && game.status === "playing" && (
              <p className="text-center text-cyan-400 text-sm font-bold animate-pulse">
                Tapez une case pour tirer !
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-center text-xs text-slate-400 uppercase tracking-widest">
              Votre grille — {myData.name}
            </div>
            <Grid
              shipCells={myShipCells}
              sunkCells={mySunkCells}
              shots={opponentShots}
              disabled
            />
            <div className="flex flex-col gap-2 mt-2">
              {myData.ships.map((ship: PlacedShip) => {
                const sunk = isShipSunk(ship, opponentShots);
                const hits = ship.cells.filter((c) => opponentShots[cellKey(c)] === "hit").length;
                return (
                  <div
                    key={ship.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      sunk ? "bg-red-900/50 border border-red-700" : "bg-ocean-mid border border-ocean-light"
                    }`}
                  >
                    <span className={sunk ? "text-red-300 line-through" : "text-slate-200"}>
                      {ship.name}
                    </span>
                    <span className="flex items-center gap-2">
                      {ship.cells.map((c, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded-sm ${
                            opponentShots[cellKey(c)] === "hit"
                              ? "bg-red-600"
                              : "bg-slate-500"
                          }`}
                        />
                      ))}
                      <span className="text-shot text-xs ml-1">{ship.size}🥃</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
