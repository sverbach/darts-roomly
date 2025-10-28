export interface DartEvent {
  _id?: any;
  event: string;
  player: string;
  playerIndex: string;
  timestamp: number;
  game: {
    pointsLeft: string;
    dartsThrown: string;
    dartsThrownValue: string;
    busted: string;
  }
  [key: string]: any;
}

export interface DartEventSane {
  _id?: any;
  event: string;
  player: string;
  playerIndex: number;
  timestamp: number;
  game: {
    pointsLeft: number;
    dartsThrown: number;
    dartsThrownValue: number;
    busted: boolean;
  }
  [key: string]: any;
}

export interface DartPlayer {
  _id?: any;
  name: string;
  events: DartEventSane[];
  picture: string | null;
}

export interface IngestionClock {
  _id?: any;
  lastIngestionTimestamp: number;
}

export interface Turn {
  player: string;
  remainingPoints: number;
  totalThrowValue: number;
  currentThrowNumber: number;
  throws: [string, string?, string?]; // Tuple with 1-3 throws
}

export interface Match {
  _id?: any;
  matchId: string;
  players: string[];
  turns: Turn[];
}

export interface CreateMatchRequest {
  matchId: string;
  players: string[];
}

export interface AddTurnRequest {
  matchId: string;
  turn: Turn;
}
