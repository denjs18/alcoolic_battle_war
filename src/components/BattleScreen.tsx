"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Grid from "./Grid";
import {
  GameData, TeamId, Cell, LastShot,
  cellKey, isShipSunk, PlacedShip,
} from "@/types/game";
import { fireShot } from "@/lib/gameService";

interface BattleScreenProps {
  game: GameData;
  gameId: string;
  myTeam: TeamId;
}

type AnimatingCell = { key: string; result: "hit" | "miss" } | null;

export default function BattleScreen({ game, gameId, myTeam }: BattleScreenProps) {
  const opponentTeam: TeamId = myTeam === "team1" ? "team2" : "team1";
  const myData = game[myTeam];
  const opponentData = game[opponentTeam];

  const myShotsField   = myTeam === "team1" ? "byTeam1" : "byTeam2";
  const oppShotsField  = myTeam === "team1" ? "byTeam2" : "byTeam1";
  const myShots        = game.shots[myShotsField];
  const opponentShots  = game.shots[oppShotsField];

  const isMyTurn = game.currentTurn === myTeam;

  // ── View logic ─────────────────────────────────────────────────────────────
  // Base view = attack when my turn, defense when opponent's turn.
  // forcedView overrides temporarily (e.g. show defense right after incoming hit).
  const [forcedView, setForcedView] = useState<"attack" | "defense" | null>(null);
  const currentView = forcedView ?? (isMyTurn ? "attack" : "defense");

  // ── Shot animations (shooter side) ─────────────────────────────────────────
  const [targetingCell, setTargetingCell] = useState<string | null>(null);
  const [animAttack, setAnimAttack]       = useState<AnimatingCell>(null);

  // ── Incoming attack animations (receiver side) ──────────────────────────────
  const [incomingOverlay, setIncomingOverlay] = useState<LastShot | null>(null);
  const [incomingCell, setIncomingCell]       = useState<string | null>(null);
  const [animDefense, setAnimDefense]         = useState<AnimatingCell>(null);
  const lastSeenShot = useRef<number>(0);

  // ── Detect incoming attack ──────────────────────────────────────────────────
  useEffect(() => {
    const ls = game.lastShot;
    if (!ls) return;
    if (ls.timestamp <= lastSeenShot.current) return;
    if (ls.shooter === myTeam) return; // it was MY shot, already handled
    lastSeenShot.current = ls.timestamp;

    const key = cellKey({ row: ls.row, col: ls.col });

    // 1. Flash incoming overlay (1.2 s)
    setIncomingOverlay(ls);
    // 2. Force defense view during animation
    setForcedView("defense");
    setIncomingCell(key);

    const t1 = setTimeout(() => setIncomingOverlay(null), 1200);
    // 3. Play explosion/splash on defense grid
    const t2 = setTimeout(() => {
      setIncomingCell(null);
      setAnimDefense({ key, result: ls.result });
    }, 1200);
    // 4. Clear explosion, return to normal view (it's now my turn)
    const t3 = setTimeout(() => {
      setAnimDefense(null);
      setForcedView(null);
    }, 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [game.lastShot, myTeam]);

  // ── Fire a shot ─────────────────────────────────────────────────────────────
  const handleShot = useCallback(async (cell: Cell) => {
    if (!isMyTurn || targetingCell) return;
    const key = cellKey(cell);
    if (myShots[key]) return;

    // Start targeting animation
    setTargetingCell(key);

    // Fire to server
    await fireShot(gameId, myTeam, cell);

    // We'll detect the result via the next game state update in the parent.
    // For immediate local feedback, schedule the result animation after a short delay.
    // The actual result is in the incoming game prop update.
    const t = setTimeout(() => {
      setTargetingCell(null);
      // result will be in myShots after state update — detect it
    }, 800);
    return () => clearTimeout(t);
  }, [isMyTurn, targetingCell, myShots, gameId, myTeam]);

  // ── Detect result of MY shot ────────────────────────────────────────────────
  const prevMyShots = useRef<Record<string, "hit" | "miss">>({});
  useEffect(() => {
    const prev = prevMyShots.current;
    const newKeys = Object.keys(myShots).filter((k) => !prev[k]);
    if (newKeys.length > 0 && targetingCell && newKeys.includes(targetingCell)) {
      const result = myShots[targetingCell];
      setTargetingCell(null);
      setAnimAttack({ key: targetingCell, result });
      const t = setTimeout(() => setAnimAttack(null), 800);
      prevMyShots.current = myShots;
      return () => clearTimeout(t);
    }
    prevMyShots.current = myShots;
  }, [myShots, targetingCell]);

  // ── Computed sets ───────────────────────────────────────────────────────────
  const myShipCells = useMemo(
    () => new Set(myData.ships.flatMap((s: PlacedShip) => s.cells.map(cellKey))),
    [myData.ships]
  );

  const opponentSunkCells = useMemo(() => {
    const sunk = new Set<string>();
    for (const ship of opponentData.ships)
      if (isShipSunk(ship, myShots))
        ship.cells.forEach((c) => sunk.add(cellKey(c)));
    return sunk;
  }, [opponentData.ships, myShots]);

  const mySunkCells = useMemo(() => {
    const sunk = new Set<string>();
    for (const ship of myData.ships)
      if (isShipSunk(ship, opponentShots))
        ship.cells.forEach((c) => sunk.add(cellKey(c)));
    return sunk;
  }, [myData.ships, opponentShots]);

  const alreadyShotCells = useMemo(() => new Set(Object.keys(myShots)), [myShots]);

  const myHits    = Object.values(myShots).filter((v) => v === "hit").length;
  const totalOpp  = opponentData.ships.reduce((a: number, s: PlacedShip) => a + s.size, 0);

  // ── Game over ───────────────────────────────────────────────────────────────
  if (game.status === "finished") {
    const won = game.winner === myTeam;
    return (
      <div className={`min-h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center ocean-bg ${won ? "" : "animate-shake"}`}>
        <div className="text-8xl animate-drift">{won ? "🏆" : "💀"}</div>
        <div>
          <h2 className={`text-4xl font-black tracking-widest ${won ? "text-yellow-400" : "text-red-400"}`}>
            {won ? "VICTOIRE" : "DÉFAITE"}
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            {won
              ? "Vous avez coulé toute la flotte ennemie"
              : `${opponentData.name} a coulé toute votre flotte`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs text-sm">
          <div className="bg-ocean-mid/60 rounded-xl p-4 border border-ocean-light">
            <p className="text-slate-400 text-xs mb-1">VOS TOUCHES</p>
            <p className="text-2xl font-black text-cyan-400">{myHits}/{totalOpp}</p>
          </div>
          <div className="bg-ocean-mid/60 rounded-xl p-4 border border-ocean-light">
            <p className="text-slate-400 text-xs mb-1">FLOTTE</p>
            <p className="text-2xl font-black text-amber-400">
              {myData.ships.filter((s: PlacedShip) => !isShipSunk(s, opponentShots)).length}/{myData.ships.length}
            </p>
          </div>
        </div>
        <a href="/" className="mt-4 px-8 py-3 rounded-xl bg-cyan-700 font-bold text-white">
          Nouvelle partie
        </a>
      </div>
    );
  }

  // ── ROWS labels helper ──────────────────────────────────────────────────────
  const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];

  return (
    <div className="flex flex-col min-h-dvh ocean-bg relative">

      {/* ── INCOMING ATTACK overlay ─────────────────────────────────────── */}
      {incomingOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="text-center animate-incoming-alert rounded-2xl p-8">
            <div className="text-6xl mb-3">💥</div>
            <p className="text-3xl font-black text-red-300 tracking-widest animate-alert-flash">
              ATTAQUE !
            </p>
            <p className="text-red-400 mt-2 text-lg font-mono">
              Case&nbsp;
              <span className="text-white font-black">
                {ROW_LABELS[incomingOverlay.row]}{incomingOverlay.col + 1}
              </span>
            </p>
            <p className="mt-3 text-xl font-black">
              {incomingOverlay.result === "hit"
                ? <span className="text-red-300">TOUCHÉ 🔥</span>
                : <span className="text-blue-300">À L&apos;EAU 🌊</span>}
            </p>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        {/* Turn indicator */}
        <div
          className={`rounded-xl px-4 py-3 text-center border transition-all duration-500 ${
            isMyTurn
              ? "bg-emerald-950/60 border-emerald-600 animate-turn-alert"
              : "bg-red-950/40 border-red-800"
          }`}
        >
          {isMyTurn ? (
            <p className="text-emerald-300 font-black text-lg tracking-widest animate-alert-flash">
              🎯 À VOUS DE JOUER
            </p>
          ) : (
            <p className="text-red-400 font-bold text-base tracking-widest">
              ⏳ {opponentData.name} vise...
            </p>
          )}
        </div>

        {/* Score bar */}
        <div className="flex justify-between items-center mt-2 px-1 text-xs font-mono text-slate-500">
          <span className="text-cyan-600">{myData.name}</span>
          <span>
            <span className="text-red-400 font-bold">{myHits}</span>
            <span className="text-slate-600">/{totalOpp} touchés</span>
          </span>
          <span className="text-slate-600">{opponentData.name}</span>
        </div>
      </div>

      {/* ── View label ──────────────────────────────────────────────────── */}
      <div
        key={currentView}
        className="flex-shrink-0 text-center py-1 animate-slide-up"
      >
        <span className={`text-xs font-bold uppercase tracking-widest ${
          currentView === "attack" ? "text-cyan-600" : "text-amber-600"
        }`}>
          {currentView === "attack"
            ? `⚡ Grille ennemie — ${opponentData.name}`
            : `🛡 Votre flotte — ${myData.name}`}
        </span>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div key={currentView + "-grid"} className="flex-1 px-3 pb-2 flex flex-col gap-3 animate-slide-up">
        {currentView === "attack" ? (
          <>
            <Grid
              shots={myShots}
              sunkCells={opponentSunkCells}
              shotCells={alreadyShotCells}
              targetingCell={targetingCell}
              animatingCell={animAttack}
              onCellClick={isMyTurn && !targetingCell ? handleShot : undefined}
              disabled={!isMyTurn || !!targetingCell}
            />

            {isMyTurn && !targetingCell && (
              <p className="text-center text-cyan-700 text-xs font-bold tracking-widest animate-alert-flash">
                CHOISISSEZ UNE CASE ET TIREZ
              </p>
            )}
            {targetingCell && (
              <p className="text-center text-red-400 text-xs font-bold tracking-widest animate-alert-flash">
                TIR EN COURS...
              </p>
            )}

            {/* Legend */}
            <div className="flex gap-4 justify-center text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-900 border border-red-500 inline-block" />
                Touché
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-600 inline-block" />
                À l&apos;eau
              </span>
            </div>
          </>
        ) : (
          <>
            <Grid
              shipCells={myShipCells}
              sunkCells={mySunkCells}
              shots={opponentShots}
              incomingCell={incomingCell ?? undefined}
              animatingCell={animDefense}
              disabled
            />

            {/* Fleet status */}
            <div className="flex flex-col gap-1.5 mt-1">
              {myData.ships.map((ship: PlacedShip) => {
                const sunk = isShipSunk(ship, opponentShots);
                return (
                  <div
                    key={ship.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                      sunk
                        ? "bg-red-950/50 border border-red-800"
                        : "bg-ocean-mid/60 border border-ocean-light"
                    }`}
                  >
                    <span className={`font-bold font-mono ${sunk ? "text-red-400 line-through" : "text-slate-200"}`}>
                      {sunk ? "💥" : "🚢"} {ship.name}
                    </span>
                    <span className="flex items-center gap-1">
                      {ship.cells.map((c, i) => (
                        <span
                          key={i}
                          className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                            opponentShots[cellKey(c)] === "hit" ? "bg-red-600" : "bg-slate-500"
                          }`}
                        />
                      ))}
                      <span className="text-amber-500 ml-1">{ship.size}🥃</span>
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
