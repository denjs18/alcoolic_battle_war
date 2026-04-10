"use client";

import { Cell, ROWS, COLS, cellKey } from "@/types/game";

interface GridProps {
  /** Cells occupied by ships (own ships on defense grid) */
  shipCells?: Set<string>;
  /** Cells that are fully sunk */
  sunkCells?: Set<string>;
  /** Shot results: key -> "hit" | "miss" */
  shots?: Record<string, "hit" | "miss">;
  /** Preview cells when placing a ship */
  previewCells?: Cell[];
  previewValid?: boolean;
  /** Called when a cell is clicked */
  onCellClick?: (cell: Cell) => void;
  /** Called when a cell is hovered */
  onCellHover?: (cell: Cell | null) => void;
  disabled?: boolean;
  /** Cells the user has already shot (to prevent re-clicking) */
  shotCells?: Set<string>;
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
  label,
}: GridProps) {
  const previewKeys = new Set(previewCells.map(cellKey));

  function getCellClass(cell: Cell): string {
    const key = cellKey(cell);
    if (previewKeys.has(key)) {
      return previewValid ? "cell cell-preview" : "cell cell-preview-invalid";
    }
    if (sunkCells.has(key)) return "cell cell-sunk";
    const shot = shots[key];
    if (shot === "hit") return "cell cell-hit";
    if (shot === "miss") return "cell cell-miss";
    if (shipCells.has(key)) return "cell cell-ship";
    return "cell cell-ocean";
  }

  function getCellContent(cell: Cell): string {
    const key = cellKey(cell);
    if (previewKeys.has(key)) return "";
    if (sunkCells.has(key)) return "✕";
    const shot = shots[key];
    if (shot === "hit") return "✕";
    if (shot === "miss") return "•";
    return "";
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `20px repeat(10, 1fr)`,
          gap: "2px",
          width: "100%",
          maxWidth: "380px",
        }}
      >
        {/* Top-left corner */}
        <div />
        {/* Column headers */}
        {COLS.map((c) => (
          <div key={c} className="text-center text-xs text-slate-400 font-mono leading-5">
            {c}
          </div>
        ))}

        {/* Rows */}
        {ROWS.map((row, rowIdx) => (
          <>
            {/* Row label */}
            <div key={`lbl-${row}`} className="text-center text-xs text-slate-400 font-mono flex items-center justify-center">
              {row}
            </div>

            {/* Cells */}
            {COLS.map((_, colIdx) => {
              const cell: Cell = { row: rowIdx, col: colIdx };
              const key = cellKey(cell);
              const isAlreadyShot = shotCells.has(key);
              const isClickable = !disabled && !isAlreadyShot && !!onCellClick;

              return (
                <div
                  key={key}
                  className={`${getCellClass(cell)} text-xs font-bold aspect-square`}
                  style={{ minHeight: "28px", fontSize: "14px" }}
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
