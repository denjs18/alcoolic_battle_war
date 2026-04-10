"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Grid from "./Grid";
import {
  GameData, TeamId, Cell, LastShot,
  cellKey, isShipSunk, PlacedShip,
} from "@/types/game";
import { fireShot } from "@/lib/gameService";

// ── Timing constants (ms) ─────────────────────────────────────────────────────
const TARGETING_MS  = 1600; // crosshair animation before impact
const ANIMATION_MS  = 2200; // explosion / wave animation
const GRACE_MS      = 1800; // pause after animation before switching to defense

interface BattleScreenProps {
  game: GameData;
  gameId: string;
  myTeam: TeamId;
}

export default function BattleScreen({ game, gameId, myTeam }: BattleScreenProps) {
  const opponentTeam: TeamId = myTeam === "team1" ? "team2" : "team1";
  const myData       = game[myTeam];
  const opponentData = game[opponentTeam];

  const myShotsField  = myTeam === "team1" ? "byTeam1" : "byTeam2";
  const oppShotsField = myTeam === "team1" ? "byTeam2" : "byTeam1";
  const myShots       = game.shots[myShotsField];
  const opponentShots = game.shots[oppShotsField];

  const isMyTurn = game.currentTurn === myTeam;

  // ── View: attack when my turn, defense otherwise.
  //    forcedView overrides this for animation sequences.
  const [forcedView, setForcedView] = useState<"attack" | "defense" | null>(null);
  const currentView = forcedView ?? (isMyTurn ? "attack" : "defense");

  // ── Shooter-side animation state ──────────────────────────────────────────
  const [targetingCell, setTargetingCell] = useState<string | null>(null);
  const [animAttack, setAnimAttack]       = useState<{ key: string; result: "hit" | "miss" } | null>(null);
  const [waveSource, setWaveSource]       = useState<Cell | null>(null);
  const [resultLabel, setResultLabel]     = useState<"hit" | "miss" | null>(null);

  // ── Receiver-side animation state ─────────────────────────────────────────
  const [incomingOverlay, setIncomingOverlay] = useState<LastShot | null>(null);
  const [incomingCell, setIncomingCell]       = useState<string | null>(null);
  const [animDefense, setAnimDefense]         = useState<{ key: string; result: "hit" | "miss" } | null>(null);
  const [waveDefense, setWaveDefense]         = useState<Cell | null>(null);
  const lastSeenShot = useRef<number>(0);

  // ── Fire a shot ───────────────────────────────────────────────────────────
  const handleShot = useCallback(async (cell: Cell) => {
    if (!isMyTurn || targetingCell) return;
    const key = cellKey(cell);
    if (myShots[key]) return;

    // Lock attack view for entire animation sequence
    setForcedView("attack");
    setTargetingCell(key);
    setResultLabel(null);
    setAnimAttack(null);
    setWaveSource(null);

    // Fire to server + minimum crosshair duration run in parallel
    const [result] = await Promise.all([
      fireShot(gameId, myTeam, cell),
      new Promise<void>((r) => setTimeout(r, TARGETING_MS)),
    ]);

    // Targeting done — play result animation
    setTargetingCell(null);

    if (!result) {
      setForcedView(null);
      return;
    }

    setResultLabel(result);
    setAnimAttack({ key, result });

    if (result === "miss") {
      setWaveSource(cell); // ripple from this cell
    }

    // After animation, clear wave but keep result label for grace period
    await new Promise<void>((r) => setTimeout(r, ANIMATION_MS));
    setWaveSource(null);
    setAnimAttack(null);

    // Grace period — player reads the result before view switches
    await new Promise<void>((r) => setTimeout(r, GRACE_MS));
    setResultLabel(null);
    setForcedView(null); // now auto-switch to defense (it's opponent's turn)
  }, [isMyTurn, targetingCell, myShots, gameId, myTeam]);

  // ── Detect incoming attack (receiver side) ───────────────────────────────
  useEffect(() => {
    const ls = game.lastShot;
    if (!ls) return;
    if (ls.timestamp <= lastSeenShot.current) return;
    if (ls.shooter === myTeam) return; // my own shot, already handled
    lastSeenShot.current = ls.timestamp;

    const key = cellKey({ row: ls.row, col: ls.col });
    const cell: Cell = { row: ls.row, col: ls.col };

    let t1: NodeJS.Timeout, t2: NodeJS.Timeout, t3: NodeJS.Timeout, t4: NodeJS.Timeout;

    // 1. Full-screen incoming overlay (1.3s)
    setIncomingOverlay(ls);
    setForcedView("defense");

    t1 = setTimeout(() => {
      setIncomingOverlay(null);
      // 2. Targeting crosshair on defense grid (0.8s)
      setIncomingCell(key);

      t2 = setTimeout(() => {
        setIncomingCell(null);
        // 3. Explosion / wave animation on defense grid
        setAnimDefense({ key, result: ls.result });
        if (ls.result === "miss") setWaveDefense(cell);

        t3 = setTimeout(() => {
          setWaveDefense(null);
          setAnimDefense(null);

          // 4. Grace before returning to attack view
          t4 = setTimeout(() => setForcedView(null), GRACE_MS);
        }, ANIMATION_MS);
      }, 800);
    }, 1300);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [game.lastShot, myTeam]);

  // ── Computed sets ─────────────────────────────────────────────────────────
  const myShipCells = useMemo(
    () => new Set(myData.ships.flatMap((s: PlacedShip) => s.cells.map(cellKey))),
    [myData.ships]
  );

  const opponentSunkCells = useMemo(() => {
    const s = new Set<string>();
    for (const ship of opponentData.ships)
      if (isShipSunk(ship, myShots)) ship.cells.forEach((c) => s.add(cellKey(c)));
    return s;
  }, [opponentData.ships, myShots]);

  const mySunkCells = useMemo(() => {
    const s = new Set<string>();
    for (const ship of myData.ships)
      if (isShipSunk(ship, opponentShots)) ship.cells.forEach((c) => s.add(cellKey(c)));
    return s;
  }, [myData.ships, opponentShots]);

  const alreadyShotCells = useMemo(() => new Set(Object.keys(myShots)), [myShots]);
  const myHits   = Object.values(myShots).filter((v) => v === "hit").length;
  const totalOpp = opponentData.ships.reduce((a: number, s: PlacedShip) => a + s.size, 0);

  const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];

  // ── Game over screen ──────────────────────────────────────────────────────
  if (game.status === "finished") {
    const won = game.winner === myTeam;
    return (
      <div className={`min-h-dvh flex flex-col items-center justify-center gap-6 p-6 text-center ocean-bg ${!won ? "animate-shake" : ""}`}>
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
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">VOS TOUCHÉS</p>
            <p className="text-2xl font-black text-cyan-400">{myHits}/{totalOpp}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">RESCAPÉS</p>
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

  // ── Main battle UI ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-dvh ocean-bg relative">

      {/* INCOMING ATTACK — full screen overlay */}
      {incomingOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-950/85 backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="text-center animate-incoming-alert rounded-3xl p-10">
            <div className="text-7xl mb-4">💥</div>
            <p className="text-3xl font-black text-red-300 tracking-widest animate-alert-flash">
              ATTAQUE !
            </p>
            <p className="text-red-400 mt-3 text-xl font-mono">
              Case{" "}
              <span className="text-white font-black text-2xl">
                {ROW_LABELS[incomingOverlay.row]}{incomingOverlay.col + 1}
              </span>
            </p>
            <p className="mt-4 text-2xl font-black">
              {incomingOverlay.result === "hit"
                ? <span className="text-orange-300">TOUCHÉ 🔥</span>
                : <span className="text-sky-300">À L&apos;EAU 🌊</span>}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 space-y-2">
        {/* Turn indicator */}
        <div className={`rounded-xl px-4 py-3 text-center border transition-all duration-700 ${
          isMyTurn
            ? "bg-emerald-950/60 border-emerald-700 animate-turn-alert"
            : "bg-red-950/40 border-red-900"
        }`}>
          {isMyTurn
            ? <p className="text-emerald-300 font-black text-lg tracking-widest animate-alert-flash">🎯 À VOUS DE JOUER</p>
            : <p className="text-red-500 font-bold text-base tracking-widest">⏳ {opponentData.name} vise...</p>
          }
        </div>

        {/* Score */}
        <div className="flex justify-between px-1 text-xs font-mono text-slate-500">
          <span className="text-cyan-700 font-bold">{myData.name}</span>
          <span>
            <span className="text-red-500 font-bold">{myHits}</span>
            <span className="text-slate-600">/{totalOpp} touchés</span>
          </span>
          <span className="text-slate-600">{opponentData.name}</span>
        </div>
      </div>

      {/* View label — changes with animation */}
      <div key={currentView} className="flex-shrink-0 text-center py-1 animate-slide-up">
        <span className={`text-xs font-bold uppercase tracking-widest ${
          currentView === "attack" ? "text-cyan-700" : "text-amber-700"
        }`}>
          {currentView === "attack"
            ? `⚡ Grille ennemie — ${opponentData.name}`
            : `🛡 Votre flotte — ${myData.name}`}
        </span>
      </div>

      {/* Grid + info */}
      <div key={currentView + "-grid"} className="flex-1 px-3 pb-3 flex flex-col gap-3 animate-slide-up">

        {currentView === "attack" ? (
          <>
            <Grid
              shots={myShots}
              sunkCells={opponentSunkCells}
              shotCells={alreadyShotCells}
              targetingCell={targetingCell}
              animatingCell={animAttack}
              waveSource={waveSource}
              onCellClick={isMyTurn && !targetingCell ? handleShot : undefined}
              disabled={!isMyTurn || !!targetingCell}
            />

            {/* Status message below grid */}
            <div className="text-center text-sm font-bold tracking-widest min-h-[1.5rem]">
              {targetingCell && (
                <span className="text-red-400 animate-alert-flash">TIR EN COURS...</span>
              )}
              {resultLabel && !targetingCell && (
                resultLabel === "hit"
                  ? <span className="text-orange-400 animate-alert-flash">💥 TOUCHÉ !</span>
                  : <span className="text-sky-400 animate-alert-flash">🌊 À L&apos;EAU !</span>
              )}
              {isMyTurn && !targetingCell && !resultLabel && (
                <span className="text-cyan-800 animate-alert-flash">CHOISISSEZ UNE CASE</span>
              )}
            </div>

            {/* Legend */}
            <div className="flex gap-5 justify-center text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-900 border border-red-600 inline-block" />
                Touché
              </span>
              <span className="flex items-center gap-1.5">
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
              waveSource={waveDefense}
              disabled
            />

            {/* Fleet status */}
            <div className="flex flex-col gap-1.5 mt-1">
              {myData.ships.map((ship: PlacedShip) => {
                const sunk = isShipSunk(ship, opponentShots);
                return (
                  <div key={ship.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-500 ${
                      sunk
                        ? "bg-red-950/50 border border-red-900"
                        : "bg-slate-900/50 border border-slate-800"
                    }`}
                  >
                    <span className={`font-bold font-mono ${sunk ? "text-red-500 line-through" : "text-slate-200"}`}>
                      {sunk ? "💥" : "🚢"} {ship.name}
                    </span>
                    <span className="flex items-center gap-1">
                      {ship.cells.map((c, i) => (
                        <span key={i} className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${
                          opponentShots[cellKey(c)] === "hit" ? "bg-red-700" : "bg-slate-600"
                        }`} />
                      ))}
                      <span className="text-amber-600 ml-1">{ship.size}🥃</span>
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
