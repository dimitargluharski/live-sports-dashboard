import { useMemo } from 'react';
import { CompetitionGroup } from './CompetitionGroup';
import { groupGamesByCompetition } from '../utils/groupGamesByCompetition';
import { formatDateGroupDate } from '../utils/formatDateGroupDate';
import { getDateGroupLabel } from '../utils/getDateGroupLabel';
import { isQualificationLeague } from '../utils/isQualificationLeague';
import { toDateKey } from '../utils/toDateKey';
import type { Game } from '../types/game';

interface GameDateGroupProps {
  dateKey: string;
  games: Game[];
  firstDateKey?: string;
  searchTerm: string;
  isDarkTheme: boolean;
  expandedCompetitions: Record<string, boolean>;
  onToggleCompetition: (competitionKey: string, isExpanded: boolean) => void;
}

interface DateGroupHeadingProps {
  dateLabel: string;
  date: string;
  gameCount: number;
  isDarkTheme: boolean;
}

function DateGroupHeading({
  dateLabel,
  date,
  gameCount,
  isDarkTheme,
}: DateGroupHeadingProps) {
  const matchCountLabel = `${gameCount} ${gameCount === 1 ? 'match' : 'matches'}`;

  if (dateLabel === 'Tomorrow') {
    return (
      <div className="mb-4 flex items-center gap-4 py-3">
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-transparent via-black/15 to-black/15 dark:via-white/15 dark:to-white/15"
        />
        <div className="flex shrink-0 items-baseline gap-2">
          <h2
            className={
              isDarkTheme
                ? 'text-sm font-black uppercase tracking-[0.08em] text-white'
                : 'text-sm font-black uppercase tracking-[0.08em] text-slate-950'
            }
          >
            Tomorrow
          </h2>
          <span
            className={
              isDarkTheme
                ? 'text-xs font-semibold text-slate-400'
                : 'text-xs font-semibold text-slate-500'
            }
          >
            {date}
          </span>
          <span
            className={
              isDarkTheme
                ? 'text-[11px] font-medium text-slate-500'
                : 'text-[11px] font-medium text-slate-400'
            }
          >
            ({matchCountLabel})
          </span>
        </div>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-l from-transparent via-black/15 to-black/15 dark:via-white/15 dark:to-white/15"
        />
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-3 border-b border-black/10 pb-2 dark:border-white/10">
      <h2
        className={
          isDarkTheme
            ? 'text-base font-black text-white'
            : 'text-base font-black text-slate-950'
        }
      >
        {dateLabel}
      </h2>
      <span
        className={
          isDarkTheme
            ? 'text-xs font-semibold text-slate-500'
            : 'text-xs font-semibold text-slate-400'
        }
      >
        {matchCountLabel}
      </span>
    </div>
  );
}

export function GameDateGroup({
  dateKey,
  games,
  firstDateKey,
  searchTerm,
  isDarkTheme,
  expandedCompetitions,
  onToggleCompetition,
}: GameDateGroupProps) {
  const isToday = dateKey === toDateKey(new Date());
  const dateLabel = getDateGroupLabel(dateKey);
  const date = formatDateGroupDate(dateKey);
  const shouldShowDateHeading = Boolean(dateLabel) && dateKey !== firstDateKey;
  const isSearchActive = searchTerm.length > 0;
  const competitions = useMemo(
    () => groupGamesByCompetition(games, isToday),
    [games, isToday],
  );

  return (
    <div className="mb-7">
      {shouldShowDateHeading && (
        <DateGroupHeading
          dateLabel={dateLabel}
          date={date}
          gameCount={games.length}
          isDarkTheme={isDarkTheme}
        />
      )}

      {competitions.map((competition) => {
        const competitionKey = `${dateKey}:${competition.label}`;
        const isChampionsLeague =
          competition.label.trim().toLowerCase() === 'champions league';
        const isQualification = isQualificationLeague(competition.label);
        const isExpanded =
          isSearchActive
          || isChampionsLeague
          || !isQualification
          || Boolean(expandedCompetitions[competitionKey]);

        return (
          <CompetitionGroup
            key={competition.label}
            leagueLabel={competition.label}
            games={competition.games}
            isDarkTheme={isDarkTheme}
            isToday={isToday}
            isExpanded={isExpanded}
            onToggle={() => onToggleCompetition(competitionKey, isExpanded)}
          />
        );
      })}
    </div>
  );
}
