export type TeamId = "team1" | "team2";
export type GameStatus = "waiting" | "placing" | "playing" | "finished";
export type ShotResult = "hit" | "miss";

export interface Cell {
  row: number; // 0–9
  col: number; // 0–9
}

export interface ShipConfig {
  id: string;
  name: string;
  size: number;
}

export interface PlacedShip {
  id: string;
  name: string;
  size: number;
  cells: Cell[];
}

export interface DrinkNotification {
  id: string;
  forTeam: TeamId;
  shipName: string;
  shotsCount: number;
  timestamp: number;
}

export interface TeamData {
  name: string;
  ready: boolean;
  ships: PlacedShip[];
}

export interface GameData {
  status: GameStatus;
  currentTurn: TeamId;
  winner: TeamId | null;
  team1: TeamData;
  team2: TeamData;
  /** shots[byTeamX][rowCol] = result — byTeam1 = shots team1 fired at team2 */
  shots: {
    byTeam1: Record<string, ShotResult>;
    byTeam2: Record<string, ShotResult>;
  };
  drinkNotification: DrinkNotification | null;
  createdAt: number;
}

export const SHIPS_CONFIG: ShipConfig[] = [
  { id: "carrier", name: "Porte-avions", size: 5 },
  { id: "battleship", name: "Cuirassé", size: 4 },
  { id: "cruiser", name: "Croiseur", size: 3 },
  { id: "submarine", name: "Sous-marin", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
export const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function cellKey(cell: Cell): string {
  return `${cell.row}_${cell.col}`;
}

export function getOpponent(team: TeamId): TeamId {
  return team === "team1" ? "team2" : "team1";
}

export function isShipSunk(ship: PlacedShip, shots: Record<string, ShotResult>): boolean {
  return ship.cells.every((c) => shots[cellKey(c)] === "hit");
}

export function checkWinner(
  opponentShips: PlacedShip[],
  myShots: Record<string, ShotResult>
): boolean {
  return opponentShips.every((ship) => isShipSunk(ship, myShots));
}
