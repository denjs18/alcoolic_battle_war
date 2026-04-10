"use client";

import { useState, useCallback } from "react";
import Grid from "./Grid";
import { Cell, PlacedShip, SHIPS_CONFIG, ShipConfig, cellKey } from "@/types/game";

interface PlacementScreenProps {
  teamName: string;
  onReady: (ships: PlacedShip[]) => void;
}

type Orientation = "H" | "V";

function getPreviewCells(ship: ShipConfig, start: Cell, orientation: Orientation): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < ship.size; i++) {
    cells.push({
      row: orientation === "H" ? start.row : start.row + i,
      col: orientation === "H" ? start.col + i : start.col,
    });
  }
  return cells;
}

function isValidPlacement(cells: Cell[], placed: PlacedShip[]): boolean {
  const occupiedKeys = new Set(placed.flatMap((s) => s.cells.map(cellKey)));
  for (const c of cells) {
    if (c.row < 0 || c.row > 9 || c.col < 0 || c.col > 9) return false;
    if (occupiedKeys.has(cellKey(c))) return false;
  }
  return true;
}

export default function PlacementScreen({ teamName, onReady }: PlacementScreenProps) {
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  const [selectedShipIdx, setSelectedShipIdx] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("H");
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);

  const remainingShips = SHIPS_CONFIG.filter(
    (s) => !placedShips.some((p) => p.id === s.id)
  );

  const shipCells = new Set(placedShips.flatMap((s) => s.cells.map(cellKey)));

  let previewCells: Cell[] = [];
  let previewValid = false;
  if (selectedShipIdx !== null && hoverCell) {
    const ship = remainingShips[selectedShipIdx];
    if (ship) {
      previewCells = getPreviewCells(ship, hoverCell, orientation);
      previewValid = isValidPlacement(previewCells, placedShips);
    }
  }

  const handleCellClick = useCallback(
    (cell: Cell) => {
      if (selectedShipIdx === null) return;
      const ship = remainingShips[selectedShipIdx];
      if (!ship) return;
      const cells = getPreviewCells(ship, cell, orientation);
      if (!isValidPlacement(cells, placedShips)) return;

      setPlacedShips((prev) => [...prev, { ...ship, cells }]);
      // Auto-select next ship
      const nextIdx = selectedShipIdx < remainingShips.length - 2 ? selectedShipIdx : null;
      setSelectedShipIdx(nextIdx);
    },
    [selectedShipIdx, remainingShips, orientation, placedShips]
  );

  function removeShip(id: string) {
    setPlacedShips((prev) => prev.filter((s) => s.id !== id));
  }

  const allPlaced = remainingShips.length === 0;

  return (
    <div className="flex flex-col min-h-dvh p-4 gap-4">
      <div className="text-center">
        <h2 className="text-xl font-black text-cyan-400">PLACEMENT DES BATEAUX</h2>
        <p className="text-slate-400 text-sm">{teamName}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOrientation((o) => (o === "H" ? "V" : "H"))}
          className="px-4 py-2 rounded-lg border border-cyan-700 text-cyan-400 text-sm font-bold"
        >
          {orientation === "H" ? "Horizontal →" : "Vertical ↓"}
        </button>
        <span className="text-slate-500 text-xs">
          {selectedShipIdx !== null && remainingShips[selectedShipIdx]
            ? `Pose : ${remainingShips[selectedShipIdx].name}`
            : "Sélectionne un bateau"}
        </span>
      </div>

      {/* Grid */}
      <Grid
        shipCells={shipCells}
        previewCells={previewCells}
        previewValid={previewValid}
        onCellClick={handleCellClick}
        onCellHover={setHoverCell}
        disabled={selectedShipIdx === null}
      />

      {/* Ship list */}
      <div className="grid grid-cols-1 gap-2 mt-1">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">
          {remainingShips.length > 0 ? "À placer" : "Tous placés !"}
        </p>
        {remainingShips.map((ship, idx) => (
          <button
            key={ship.id}
            onClick={() => setSelectedShipIdx(idx)}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
              selectedShipIdx === idx
                ? "border-cyan-500 bg-cyan-900/40 text-cyan-300"
                : "border-slate-700 bg-ocean-mid text-slate-300"
            }`}
          >
            <span className="font-bold">{ship.name}</span>
            <span className="flex gap-1">
              {Array.from({ length: ship.size }).map((_, i) => (
                <span key={i} className="w-5 h-5 rounded-sm bg-slate-500 inline-block" />
              ))}
              <span className="ml-2 text-shot text-sm font-black">{ship.size}🥃</span>
            </span>
          </button>
        ))}

        {/* Placed ships — can be removed */}
        {placedShips.map((ship) => (
          <button
            key={ship.id}
            onClick={() => removeShip(ship.id)}
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-600 bg-slate-800/40 text-left opacity-60"
          >
            <span className="text-slate-400">{ship.name} ✓</span>
            <span className="text-red-400 text-xs">Tap pour retirer</span>
          </button>
        ))}
      </div>

      {allPlaced && (
        <button
          onClick={() => onReady(placedShips)}
          className="mt-auto py-4 text-lg font-black rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 transition-colors"
        >
          PRÊT — Lancer la bataille !
        </button>
      )}
    </div>
  );
}
