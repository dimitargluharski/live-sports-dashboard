import { GameCard } from './GameCard';
import type { Game } from '../types/game';
import { extractCountryFromLeague } from '../utils/extractCountryFromLeague';
import { getCountryFlagUrl } from '../utils/getCountryFlagUrl';
import { isQualificationLeague } from '../utils/isQualificationLeague';

interface PlainLeagueSectionProps {
  leagueLabel: string;
  games: Game[];
  isDarkTheme: boolean;
  showWinChances: boolean;
  muteEnded?: boolean;
}

export function PlainLeagueSection({ leagueLabel, games, isDarkTheme, showWinChances, muteEnded = true }: PlainLeagueSectionProps) {
  const country = extractCountryFromLeague(leagueLabel);
  const showCountry = Boolean(country) && country?.trim().toLowerCase() !== leagueLabel.trim().toLowerCase();
  const flagUrl = getCountryFlagUrl(country);
  const leagueName = country && leagueLabel.toLowerCase().startsWith(`${country.toLowerCase()}.`)
    ? leagueLabel.slice(country.length + 1).trim()
    : leagueLabel;
  const headerLabel = showCountry ? `${country} · ${leagueName}` : leagueLabel;

  return (
    <section className={`mb-4 overflow-hidden rounded-md border ${isDarkTheme ? 'border-white/10 bg-[#1b1b1b]' : 'border-black/10 bg-white'}`}>
      <h3 className={`flex items-center gap-2 border-b px-3 py-2 text-xs font-bold ${isDarkTheme ? 'border-white/10 text-slate-200' : 'border-black/10 text-slate-800'}`}>
        {flagUrl && <img src={flagUrl} alt="" className="h-3 w-5 object-cover" loading="lazy" />}
        <span>{headerLabel}</span>
        {isQualificationLeague(leagueLabel) && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-black/5 text-slate-600'}`}>Qualification</span>}
      </h3>
      <div>
        {games.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} showWinChances={showWinChances} muteEnded={muteEnded} {...game} />)}
      </div>
    </section>
  );
}
