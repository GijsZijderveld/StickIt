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

export interface MatchRecord {
  id: number;
  date: string;
  winner: string;
  participants: string[];
  stats: {
    stick: number;
    noStick: number;
    fall: number;
  };
}

export interface MatchStats {
  stick: number;
  noStick: number;
  fall: number;
}
