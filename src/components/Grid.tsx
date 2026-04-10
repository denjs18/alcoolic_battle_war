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
  /** Cell currently being targeted (shooter side) */
  targetingCell?: string | null;
  /** Cell currently animating its result */
  animatingCell?: { key: string; result: "hit" | "miss" } | null;
  /** Cell incoming from opponent (receiver side) */
  incomingCell?: string | null;
  label?: string;
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
  incomingCell = null,
  label,
}: GridProps) {
  const previewKeys = new Set(previewCells.map(cellKey));

  function getCellClass(cell: Cell): string {
    const key = cellKey(cell);

    if (previewKeys.has(key))
      return previewValid ? "cell cell-preview" : "cell cell-preview-invalid";

    if (targetingCell === key) return "cell cell-targeting";

    if (animatingCell?.key === key)
      return animatingCell.result === "hit" ? "cell cell-exploding" : "cell cell-splashing";

    if (incomingCell === key) return "cell cell-targeting";

    if (sunkCells.has(key)) return "cell cell-sunk";

    const shot = shots[key];
    if (shot === "hit") return "cell cell-hit";
    if (shot === "miss") return "cell cell-miss";
    if (shipCells.has(key)) return "cell cell-ship";

    const isClickable = !disabled && !shotCells.has(key) && !!onCellClick;
    return isClickable ? "cell cell-ocean-active" : "cell cell-ocean";
  }

  function getCellContent(cell: Cell): React.ReactNode {
    const key = cellKey(cell);

    if (targetingCell === key || incomingCell === key)
      return <span className="text-red-400 font-black text-xs">+</span>;

    if (animatingCell?.key === key)
      return animatingCell.result === "hit"
        ? <span className="text-yellow-300 font-black">✕</span>
        : <span className="text-blue-300 font-black">~</span>;

    if (sunkCells.has(key)) return <span className="text-red-400 font-black text-xs">✕</span>;

    const shot = shots[key];
    if (shot === "hit") return <span className="text-red-300 font-black text-xs">✕</span>;
    if (shot === "miss") return <span className="text-slate-400 text-xs">•</span>;
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-600 mb-1">
          {label}
        </p>
      )}
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `18px repeat(10, 1fr)`,
          gap: "2px",
          maxWidth: "390px",
        }}
      >
        {/* Column headers */}
        <div />
        {COLS.map((c) => (
          <div
            key={c}
            className="text-center text-xs font-bold leading-5"
            style={{ color: "#f59e0b", fontFamily: "monospace" }}
          >
            {c}
          </div>
        ))}

        {/* Rows */}
        {ROWS.map((row, rowIdx) => (
          <>
            <div
              key={`lbl-${row}`}
              className="flex items-center justify-center text-xs font-bold"
              style={{ color: "#f59e0b", fontFamily: "monospace" }}
            >
              {row}
            </div>
            {COLS.map((_, colIdx) => {
              const cell: Cell = { row: rowIdx, col: colIdx };
              const key = cellKey(cell);
              const isAlreadyShot = shotCells.has(key);
              const isClickable =
                !disabled && !isAlreadyShot && !!onCellClick && targetingCell === null;

              return (
                <div
                  key={key}
                  className={`${getCellClass(cell)} aspect-square`}
                  style={{ minHeight: "28px", fontSize: "12px" }}
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
