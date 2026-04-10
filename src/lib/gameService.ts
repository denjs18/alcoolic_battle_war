import { supabase } from "./supabase";
import {
  GameData,
  TeamId,
  PlacedShip,
  Cell,
  DrinkNotification,
  LastShot,
  ShotResult,
  cellKey,
  getOpponent,
  isShipSunk,
  checkWinner,
} from "@/types/game";

// ─── DB row type (snake_case, flat) ──────────────────────────────────────────
interface GameRow {
  id: string;
  status: string;
  current_turn: string;
  winner: string | null;
  team1_name: string;
  team1_ready: boolean;
  team1_ships: PlacedShip[];
  team2_name: string;
  team2_ready: boolean;
  team2_ships: PlacedShip[];
  shots_by_team1: Record<string, ShotResult>;
  shots_by_team2: Record<string, ShotResult>;
  drink_notification: DrinkNotification | null;
  last_shot: LastShot | null;
  created_at: number;
}

function rowToGameData(row: GameRow): GameData {
  return {
    status: row.status as GameData["status"],
    currentTurn: row.current_turn as TeamId,
    winner: row.winner as TeamId | null,
    team1: {
      name: row.team1_name,
      ready: row.team1_ready,
      ships: row.team1_ships ?? [],
    },
    team2: {
      name: row.team2_name,
      ready: row.team2_ready,
      ships: row.team2_ships ?? [],
    },
    shots: {
      byTeam1: row.shots_by_team1 ?? {},
      byTeam2: row.shots_by_team2 ?? {},
    },
    drinkNotification: row.drink_notification ?? null,
    lastShot: row.last_shot ?? null,
    createdAt: row.created_at,
  };
}

function generateGameId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createGame(teamName: string): Promise<string> {
  let gameId: string;

  while (true) {
    gameId = generateGameId();
    const { data } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    if (!data) break;
  }

  const { error } = await supabase.from("games").insert({
    id: gameId,
    status: "waiting",
    current_turn: "team1",
    winner: null,
    team1_name: teamName,
    team1_ready: false,
    team1_ships: [],
    team2_name: "",
    team2_ready: false,
    team2_ships: [],
    shots_by_team1: {},
    shots_by_team2: {},
    drink_notification: null,
    last_shot: null,
    created_at: Date.now(),
  });

  if (error) throw new Error(error.message);
  return gameId;
}

export async function joinGame(gameId: string, teamName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("games")
    .select("status")
    .eq("id", gameId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.status !== "waiting") return false;

  const { error: updateError } = await supabase
    .from("games")
    .update({ team2_name: teamName, status: "placing" })
    .eq("id", gameId);

  return !updateError;
}

export async function placeShips(
  gameId: string,
  team: TeamId,
  ships: PlacedShip[]
): Promise<void> {
  const { data } = await supabase
    .from("games")
    .select("team1_ready, team2_ready")
    .eq("id", gameId)
    .single();

  const otherTeam = getOpponent(team);
  const otherReady =
    otherTeam === "team1" ? data?.team1_ready : data?.team2_ready;

  await supabase
    .from("games")
    .update({
      [`${team === "team1" ? "team1" : "team2"}_ships`]: ships,
      [`${team === "team1" ? "team1" : "team2"}_ready`]: true,
      ...(otherReady ? { status: "playing" } : {}),
    })
    .eq("id", gameId);
}

export async function fireShot(
  gameId: string,
  shooter: TeamId,
  target: Cell
): Promise<void> {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single<GameRow>();

  if (!data) return;
  const game = rowToGameData(data);
  if (game.status !== "playing") return;
  if (game.currentTurn !== shooter) return;

  const opponent = getOpponent(shooter);
  const key = cellKey(target);
  const shotsField = shooter === "team1" ? "byTeam1" : "byTeam2";
  const dbShotsField = shooter === "team1" ? "shots_by_team1" : "shots_by_team2";
  const existingShots = game.shots[shotsField];

  if (existingShots[key]) return;

  const opponentShips = game[opponent].ships;
  const hitShip = opponentShips.find((ship) =>
    ship.cells.some((c) => cellKey(c) === key)
  );

  const result: ShotResult = hitShip ? "hit" : "miss";
  const newShots = { ...existingShots, [key]: result };

  let drinkNotification: DrinkNotification | null = game.drinkNotification;
  if (hitShip && isShipSunk(hitShip, newShots)) {
    drinkNotification = {
      id: `${Date.now()}`,
      forTeam: opponent,
      shipName: hitShip.name,
      shotsCount: hitShip.size,
      timestamp: Date.now(),
    };
  }

  const winner = checkWinner(opponentShips, newShots) ? shooter : null;

  const lastShot: LastShot = {
    shooter,
    row: target.row,
    col: target.col,
    result,
    timestamp: Date.now(),
  };

  await supabase
    .from("games")
    .update({
      [dbShotsField]: newShots,
      current_turn: opponent,
      winner,
      status: winner ? "finished" : "playing",
      drink_notification: drinkNotification,
      last_shot: lastShot,
    })
    .eq("id", gameId);
}

export function subscribeToGame(
  gameId: string,
  callback: (data: GameData) => void
): () => void {
  supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single<GameRow>()
    .then(({ data }) => {
      if (data) callback(rowToGameData(data));
    });

  const channel = supabase
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(rowToGameData(payload.new as GameRow));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
