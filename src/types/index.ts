export interface Player {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  players: Player[];
  position: number;
}

export interface GameEvent {
  teamId: number;
  playerId: number;
  playerName: string;
  jumpName: string;
  result: 'stick' | 'noStick' | 'fall';
  previousPosition: number; // Required for a perfect "Undo"
  isChoiceJump: boolean; // New optional field
  choiceJumpNumber?: number; // New optional field
}

export interface MatchRecord {
  id?: number;
  date: string;
  winner: string;
  participants: string[];
  stats: MatchStats;
  events: GameEvent[]; // Add this line
}

export interface MatchStats {
  stick: number;
  noStick: number;
  fall: number;
}
