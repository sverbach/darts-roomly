export type GameStartedEvent = {
  event: 'game-started';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
    pointsStart: string;
  };
};

export type DartThrownEvent = {
  event: 'dart1-thrown' | 'dart2-thrown' | 'dart3-thrown';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
    pointsLeft: string;
    dartNumber: '1' | '2' | '3';
    dartValue: string;
    fieldName: string;
    fieldNumber: string;
    fieldMultiplier: number;
  };
};

export type DartsThrownEvent = {
  event: 'darts-thrown';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
    pointsLeft: string;
    dartValue: string;
  };
};

export type DartsPulledEvent = {
  event: 'darts-pulled';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
    pointsLeft: string;
  };
};

export type BustedEvent = {
  event: 'busted';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
    field_name: string;
    field_number: number;
    field_mulitplier: number;
  };
};

export type MatchWonEvent = {
  event: 'match-won';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
    dartsThrown: string;
    dartsThrownValue: string;
    fieldName: string;
    fieldNumber: string;
    fieldMultiplier: number;
  };
};

export type MatchEndedEvent = {
  event: 'match-ended';
  player: string;
  playerIndex: string;
  game: {
    mode: string;
  };
};

export type AutodartsEventType =
  | GameStartedEvent
  | DartThrownEvent
  | DartsThrownEvent
  | DartsPulledEvent
  | BustedEvent
  | MatchEndedEvent
  | MatchWonEvent;
