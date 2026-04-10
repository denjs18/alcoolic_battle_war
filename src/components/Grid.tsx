"use client";

import { Cell, ROWS, COLS, cellKey } from "@/types/game";

interface GridProps {
  shipCells?: Set<string>;
  sunkCells?: Set<string>;
  shots?: Record<string, "hit" | "miss">;
  previewCells?: Cell[];
  previewValid?: boolean;
  onCellClick?: (cell: Cell) => void;
  onCellHover?: (cell: Cell | null) => void;
  disabled?: boolean;
  shotCells?: Set<string>;
  /** Cell currently showing the targeting crosshair */
  targetingCell?: string | null;
  /** Cell currently running its result animation */
  animatingCell?: { key: string; result: "hit" | "miss" } | null;
  /** Source cell for wave ripple (on miss) */
  waveSource?: Cell | null;
  /** Cell incoming from opponent (receiver side) */
  incomingCell?: string | null;
}

export default function Grid({
  shipCells = new Set(),
  sunkCells = new Set(),
  shots = {},
  previewCells = [],
  previewValid = true,
  onCellClick,
  onCellHover,
  disabled = false,
  shotCells = new Set(),
  targetingCell = null,
  animatingCell = null,
  waveSource = null,
  incomingCell = null,
}: GridProps) {
  const previewKeys = new Set(previewCells.map(cellKey));

  function getWaveDelay(cell: Cell): number {
    if (!waveSource) return 0;
    const dx = cell.col - waveSource.col;
    const dy = cell.row - waveSource.row;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * 65); // 65ms per unit
  }

  function getCellClass(cell: Cell): string {
    const key = cellKey(cell);

    if (previewKeys.has(key))
      return previewValid ? "cell cell-preview" : "cell cell-preview-invalid";

    if (targetingCell === key || incomingCell === key)
      return "cell cell-targeting";

    if (animatingCell?.key === key)
      return animatingCell.result === "hit"
        ? "cell cell-exploding"
        : "cell cell-splashing";

    if (sunkCells.has(key)) return "cell cell-sunk";

    const shot = shots[key];
    if (shot === "hit")  return "cell cell-hit";
    if (shot === "miss") return "cell cell-miss";
    if (shipCells.has(key)) return "cell cell-ship";

    // Wave ripple on empty cells
    if (waveSource && !shotCells.has(key)) return "cell cell-ocean cell-waving";

    const clickable = !disabled && !shotCells.has(key) && !!onCellClick;
    return clickable ? "cell cell-ocean-active" : "cell cell-ocean";
  }

  function getCellStyle(cell: Cell): React.CSSProperties {
    const key = cellKey(cell);
    // Apply wave delay to non-shot, non-source ocean cells
    if (
      waveSource &&
      !shots[key] &&
      !sunkCells.has(key) &&
      !shipCells.has(key) &&
      key !== cellKey(waveSource) &&
      animatingCell?.key !== key
    ) {
      return { animationDelay: `${getWaveDelay(cell)}ms` };
    }
    return {};
  }

  function getCellContent(cell: Cell): React.ReactNode {
    const key = cellKey(cell);

    if (targetingCell === key || incomingCell === key)
      return <span className="text-red-500 font-black text-sm leading-none">+</span>;

    if (animatingCell?.key === key)
      return animatingCell.result === "hit"
        ? <span className="text-yellow-200 font-black text-sm">✕</span>
        : <span className="text-sky-200 font-black text-sm">~</span>;

    if (sunkCells.has(key) || shots[key] === "hit")
      return <span className="text-red-200 font-black text-xs">✕</span>;

    if (shots[key] === "miss")
      return <span className="text-slate-500 text-xs">•</span>;

    return null;
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: `18px repeat(10, 1fr)`, gap: "2px", maxWidth: "390px" }}
      >
        {/* Column headers */}
        <div />
        {COLS.map((c) => (
          <div key={c} className="text-center text-xs font-bold leading-5"
            style={{ color: "#f59e0b", fontFamily: "monospace" }}>
            {c}
          </div>
        ))}

        {/* Rows */}
        {ROWS.map((row, rowIdx) => (
          <>
            <div key={`lbl-${row}`}
              className="flex items-center justify-center text-xs font-bold"
              style={{ color: "#f59e0b", fontFamily: "monospace" }}>
              {row}
            </div>
            {COLS.map((_, colIdx) => {
              const cell: Cell = { row: rowIdx, col: colIdx };
              const key = cellKey(cell);
              const isAlreadyShot = shotCells.has(key);
              const isClickable =
                !disabled && !isAlreadyShot && !!onCellClick && !targetingCell;

              return (
                <div
                  key={key}
                  className={`${getCellClass(cell)} aspect-square`}
                  style={{ minHeight: "28px", fontSize: "12px", ...getCellStyle(cell) }}
                  onClick={() => isClickable && onCellClick(cell)}
                  onMouseEnter={() => onCellHover?.(cell)}
                  onMouseLeave={() => onCellHover?.(null)}
                >
                  {getCellContent(cell)}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
