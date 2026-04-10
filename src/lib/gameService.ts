import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  GameData,
  TeamId,
  PlacedShip,
  Cell,
  cellKey,
  getOpponent,
  isShipSunk,
  checkWinner,
} from "@/types/game";

function generateGameId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function gameRef(id: string) {
  return doc(db, "games", id);
}

export async function createGame(teamName: string): Promise<string> {
  let gameId: string;
  // Ensure unique ID
  do {
    gameId = generateGameId();
  } while ((await getDoc(gameRef(gameId))).exists());

  const initialData: GameData = {
    status: "waiting",
    currentTurn: "team1",
    winner: null,
    team1: { name: teamName, ready: false, ships: [] },
    team2: { name: "", ready: false, ships: [] },
    shots: { byTeam1: {}, byTeam2: {} },
    drinkNotification: null,
    createdAt: Date.now(),
  };

  await setDoc(gameRef(gameId), initialData);
  return gameId;
}

export async function joinGame(gameId: string, teamName: string): Promise<boolean> {
  const snap = await getDoc(gameRef(gameId));
  if (!snap.exists()) return false;

  const data = snap.data() as GameData;
  if (data.status !== "waiting") return false;

  await updateDoc(gameRef(gameId), {
    "team2.name": teamName,
    status: "placing",
  });
  return true;
}

export async function placeShips(
  gameId: string,
  team: TeamId,
  ships: PlacedShip[]
): Promise<void> {
  const snap = await getDoc(gameRef(gameId));
  const data = snap.data() as GameData;

  const otherTeam = getOpponent(team);
  const otherReady = data[otherTeam].ready;

  await updateDoc(gameRef(gameId), {
    [`${team}.ships`]: ships,
    [`${team}.ready`]: true,
    ...(otherReady ? { status: "playing" } : {}),
  });
}

export async function fireShot(
  gameId: string,
  shooter: TeamId,
  target: Cell
): Promise<void> {
  const snap = await getDoc(gameRef(gameId));
  const data = snap.data() as GameData;

  if (data.status !== "playing") return;
  if (data.currentTurn !== shooter) return;

  const opponent = getOpponent(shooter);
  const key = cellKey(target);
  const shotsField = shooter === "team1" ? "byTeam1" : "byTeam2";
  const existingShots = data.shots[shotsField];

  if (existingShots[key]) return; // already shot here

  const opponentShips: PlacedShip[] = data[opponent].ships;
  const hitShip = opponentShips.find((ship) =>
    ship.cells.some((c) => cellKey(c) === key)
  );

  const result = hitShip ? "hit" : "miss";
  const newShots = { ...existingShots, [key]: result };

  // Check if this shot sinks a ship
  let drinkNotification = data.drinkNotification;
  if (hitShip && isShipSunk(hitShip, newShots)) {
    drinkNotification = {
      id: `${Date.now()}`,
      forTeam: opponent,
      shipName: hitShip.name,
      shotsCount: hitShip.size,
      timestamp: Date.now(),
    };
  }

  // Check win condition
  const winner = checkWinner(opponentShips, newShots) ? shooter : null;

  await updateDoc(gameRef(gameId), {
    [`shots.${shotsField}`]: newShots,
    currentTurn: opponent,
    winner,
    status: winner ? "finished" : "playing",
    drinkNotification,
  });
}

export function subscribeToGame(
  gameId: string,
  callback: (data: GameData) => void
): Unsubscribe {
  return onSnapshot(gameRef(gameId), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as GameData);
    }
  });
}
