import { useEffect, useMemo, useRef, useState } from 'react';

import { MatchStats, Team } from '../types';

type Outcome = 'stick' | 'noStick' | 'fall';

type UseGameLogicArgs = {
  initialTeams: Team[];
  jumpOrder: string[];
  onMatchComplete?: (data: {
    winner: string;
    participants: string[];
    stats: MatchStats;
    date: string;
  }) => void;
};

const clampPosition = (position: number, max: number) =>
  Math.max(0, Math.min(position, max));

// Keeps match state localized and reports the winner upward when the match ends.
export const useGameLogic = ({
  initialTeams,
  jumpOrder,
  onMatchComplete,
}: UseGameLogicArgs) => {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [matchStats, setMatchStats] = useState<MatchStats>({
    stick: 0,
    noStick: 0,
    fall: 0,
  });
  const [winner, setWinner] = useState<string | null>(null);
  const hasReportedRef = useRef(false);

  useEffect(() => {
    setTeams(initialTeams);
    setActiveTeamId(initialTeams[0]?.id ?? null);
    setMatchStats({ stick: 0, noStick: 0, fall: 0 });
    setWinner(null);
    hasReportedRef.current = false;
  }, [initialTeams]);

  const updateTeamPosition = (teamId: number, delta: number) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) {
          return team;
        }
        const maxPosition = Math.max(0, jumpOrder.length - 1);
        const next = clampPosition(team.position + delta, maxPosition);
        return { ...team, position: next };
      })
    );
  };

  const handleOutcome = (type: Outcome) => {
    if (!activeTeamId) {
      return;
    }
    if (type === 'stick') {
      updateTeamPosition(activeTeamId, 1);
      setMatchStats((prev) => ({ ...prev, stick: prev.stick + 1 }));
    }
    if (type === 'noStick') {
      setMatchStats((prev) => ({ ...prev, noStick: prev.noStick + 1 }));
    }
    if (type === 'fall') {
      updateTeamPosition(activeTeamId, -2);
      setMatchStats((prev) => ({ ...prev, fall: prev.fall + 1 }));
    }
  };

  const participantNames = useMemo(
    () => teams.flatMap((team) => team.players.map((player) => player.name)),
    [teams]
  );

  useEffect(() => {
    if (jumpOrder.length === 0) {
      return;
    }
    const winningTeam = teams.find((team) => team.position >= jumpOrder.length - 1);
    if (winningTeam && !winner) {
      const winnerName = winningTeam.name;
      setWinner(winnerName);
      if (!hasReportedRef.current && onMatchComplete) {
        hasReportedRef.current = true;
        onMatchComplete({
          winner: winnerName,
          participants: participantNames,
          stats: matchStats,
          date: new Date().toISOString(),
        });
      }
    }
  }, [teams, jumpOrder.length, winner, matchStats, onMatchComplete, participantNames]);

  return {
    teams,
    activeTeamId,
    matchStats,
    winner,
    setActiveTeamId,
    handleOutcome,
  };
};
