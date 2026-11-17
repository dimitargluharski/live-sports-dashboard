import { GameCard } from './GameCard';
import { PlainLeagueSection } from './PlainLeagueSection';
import { StageSections } from './StageSections';
import type { Game } from '../types/game';
import { extractCountryFromLeague } from '../utils/extractCountryFromLeague';
import { getCompetitionName } from '../utils/getCompetitionName';
import { groupGamesByTournamentLabel } from '../utils/groupGamesByTournamentLabel';
import { isQualificationLeague } from '../utils/isQualificationLeague';

interface CompetitionGroupProps {
  leagueLabel: string;
  games: Game[];
  isDarkTheme: boolean;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  forceList?: boolean;
}

export function CompetitionGroup({
  leagueLabel,
  games,
  isDarkTheme,
  isToday,
  isExpanded,
  onToggle,
  forceList = false,
}: CompetitionGroupProps) {
  // Qualification groups and tournament stages are football concepts; other sports use plain league lists.
  const isFootball = !games[0]?.sport || games[0].sport === 'soccer';
  const isQualificationSection = isFootball && isQualificationLeague(leagueLabel);
  const tournamentStageSegments = groupGamesByTournamentLabel(games);
  const hasTournamentStages = isFootball && tournamentStageSegments.some((segment) => segment.label);

  if (forceList || (!isQualificationSection && !hasTournamentStages)) {
    return <PlainLeagueSection leagueLabel={leagueLabel} games={games} isDarkTheme={isDarkTheme} showWinChances={forceList} />;
  }

  if (hasTournamentStages && isToday) {
    return <StageSections leagueLabel={leagueLabel} segments={tournamentStageSegments} isDarkTheme={isDarkTheme} />;
  }

  const country = extractCountryFromLeague(leagueLabel);
  const showCountry = Boolean(country) && country?.trim().toLowerCase() !== leagueLabel.trim().toLowerCase();
  const competitionName = getCompetitionName(leagueLabel, isQualificationSection);
  const gameCards = games.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />);

  return (
    <div className={`mb-5 ${isQualificationSection ? isDarkTheme ? 'overflow-hidden rounded-xl border border-amber-300/20 bg-amber-200/[0.025]' : 'overflow-hidden rounded-xl border border-amber-600/25 bg-amber-50/35' : ''}`}>
      <button
        type="button"
        onClick={isQualificationSection ? onToggle : undefined}
        aria-expanded={isQualificationSection ? isExpanded : undefined}
        className={`flex w-full items-center gap-2 text-left ${isQualificationSection ? isDarkTheme ? 'cursor-pointer border-b border-l-4 border-white/10 border-l-amber-300 bg-amber-200/[0.06] px-3 py-2 hover:bg-amber-200/[0.1]' : 'cursor-pointer border-b border-l-4 border-black/10 border-l-amber-600 bg-amber-100/60 px-3 py-2 hover:bg-amber-100/90' : 'mb-2 px-1'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className={`truncate ${isQualificationSection ? 'text-xs font-bold' : 'text-sm font-black'} ${isDarkTheme ? isQualificationSection ? 'text-slate-200' : 'text-white' : isQualificationSection ? 'text-slate-800' : 'text-slate-950'}`}>
            {isQualificationSection ? competitionName : leagueLabel.split('.')[1]?.trim() || leagueLabel}
          </h3>
          {isQualificationSection && (
            <span className={isDarkTheme ? 'shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300' : 'shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600'}>
              Qualification
            </span>
          )}
          {!isQualificationSection && showCountry && <p className={isDarkTheme ? 'text-xs text-neutral-400' : 'text-xs text-slate-500'}>{country}</p>}
        </div>
        {isQualificationSection && (
          <>
            {/* <span className={isDarkTheme ? 'shrink-0 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-200' : 'shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900'}>{games.length} matches</span> */}
            <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
          </>
        )}
      </button>
      {isExpanded && (
        <div className={`grid grid-cols-1 ${isQualificationSection ? '' : 'gap-2'}`}>
          {hasTournamentStages
            ? tournamentStageSegments.map((segment, index) => (
              <div key={segment.label?.id ?? `segment-${index}`}>
                {segment.label && (
                  <h4 className={`mb-2 truncate text-xs font-black uppercase tracking-wide ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
                    {segment.label.title}
                  </h4>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {segment.matches.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />)}
                </div>
              </div>
            ))
            : gameCards}
        </div>
      )}
    </div>
  );
}
