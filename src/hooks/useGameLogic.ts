import { useState, useMemo } from 'react';
import { Team, GameEvent, MatchStats } from '../types';

export const useGameLogic = (initialTeams: Team[], jumpOrder: string[], onMatchComplete: any) => {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [history, setHistory] = useState<GameEvent[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [extraJumps, setExtraJumps] = useState(0); // Tracks sudden death rounds

  const totalSteps = useMemo(() => jumpOrder.length + 2 + extraJumps, [jumpOrder, extraJumps]);

  const turnIndex = history.length;
  const activeTeamIdx = turnIndex % teams.length;
  const activeTeam = teams[activeTeamIdx];
  const isLastTeamInRound = activeTeamIdx === teams.length - 1; //

  // Logic for alternating players within the team
  const teamTurnCount = history.filter(h => h.teamId === activeTeam.id).length;
  const activePlayer = activeTeam.players[teamTurnCount % activeTeam.players.length];

  
  const handleOutcome = (result: 'stick' | 'noStick' | 'fall', manualJumpName?: string) => {
    if (winner) return;

    const isOnChoice = activeTeam.position >= jumpOrder.length;
    const currentJump = manualJumpName || (activeTeam.position < jumpOrder.length 
      ? jumpOrder[activeTeam.position] 
      : `Choice Jump ${activeTeam.position - jumpOrder.length + 1}`);

    const event: GameEvent = {
      teamId: activeTeam.id,
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      jumpName: currentJump,
      result,
      previousPosition: activeTeam.position,
      isChoiceJump: isOnChoice, // New field
      choiceJumpNumber: isOnChoice ? (activeTeam.position - jumpOrder.length + 1) : undefined // New field
    };

    const newHistory = [...history, event];
    setHistory(newHistory);

    // Update positions
    const updatedTeams = teams.map(t => {
      if (t.id !== activeTeam.id) return t;
      let nextPos = t.position;
      if (result === 'stick') nextPos += 1;
      if (result === 'fall') nextPos = Math.max(0, nextPos - 2);
      return { ...t, position: Math.min(nextPos, totalSteps) };
    });

    setTeams(updatedTeams);

    // Check for Win
    const teamsAtFinish = updatedTeams.filter(t => t.position >= totalSteps);

    // Only check for a winner at the end of a full round (after the last team jumps)
    if (isLastTeamInRound) {
      if (teamsAtFinish.length === 1) {
        const winningTeam = teamsAtFinish[0];
        setWinner(winningTeam.name);

        // TRIGGER THE SAVE
        onMatchComplete({
          winner: winningTeam.name,
          date: new Date().toISOString(),
          participants: updatedTeams.flatMap(t => t.players.map(p => p.name)),
          events: newHistory, // This saves every specific jump done
          stats: {
            stick: newHistory.filter(h => h.result === 'stick').length,
            noStick: newHistory.filter(h => h.result === 'noStick').length,
            fall: newHistory.filter(h => h.result === 'fall').length,
          }
        });
      } else if (teamsAtFinish.length > 1) {
        setExtraJumps(prev => prev + 1);
      }
    }
  };

  const undoLastTurn = () => {
    if (history.length === 0 || winner) return null;
    const lastEvent = history[history.length - 1];
    
    setTeams(prev => prev.map(t => 
      t.id === lastEvent.teamId ? { ...t, position: lastEvent.previousPosition } : t
    ));
    setHistory(prev => prev.slice(0, -1));
    return lastEvent;
  };

  return { teams, activeTeam, activePlayer, winner, turnNumber: turnIndex + 1, handleOutcome, undoLastTurn };
};