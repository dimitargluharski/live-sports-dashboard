import React, { useEffect, useState } from 'react';
import { A11y, Keyboard, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Game } from '../types/game';
import { GameCard } from './GameCard';
import { getDominantLogoColor } from '../utils/getDominantLogoColor';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface ChampionsLeagueCarouselProps {
  games: Game[];
  isDarkTheme: boolean;
  onBackgroundChange?: (background: string | undefined) => void;
}

export const ChampionsLeagueCarousel: React.FC<ChampionsLeagueCarouselProps> = ({ games, isDarkTheme, onBackgroundChange }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeHomeColor, setActiveHomeColor] = useState<string | null>(null);
  const [activeAwayColor, setActiveAwayColor] = useState<string | null>(null);
  const activeGame = games[activeSlide];

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      getDominantLogoColor(activeGame?.teams?.home?.logoUrl),
      getDominantLogoColor(activeGame?.teams?.away?.logoUrl),
    ]).then(([homeColor, awayColor]) => {
      if (!isCurrent) return;
      setActiveHomeColor(homeColor);
      setActiveAwayColor(awayColor);
    });

    return () => {
      isCurrent = false;
    };
  }, [activeGame?.id, activeGame?.teams?.away?.logoUrl, activeGame?.teams?.home?.logoUrl]);

  const activeBackground = activeGame?.isLive && (activeHomeColor || activeAwayColor)
      ? `linear-gradient(100deg, color-mix(in srgb, ${activeHomeColor || activeAwayColor} 5%, transparent), color-mix(in srgb, ${activeAwayColor || activeHomeColor} 5%, transparent))`
      : activeGame?.isLive
        ? isDarkTheme ? 'rgb(244 63 94 / 0.06)' : 'rgb(244 63 94 / 0.05)'
    : undefined;

  useEffect(() => {
    onBackgroundChange?.(activeBackground);
  }, [activeBackground, onBackgroundChange]);

  return (
    <div className="champions-carousel-shell">
      <Swiper
        className="champions-carousel"
        modules={[A11y, Keyboard, Pagination]}
        slidesPerView={1}
        spaceBetween={12}
        pagination={{ clickable: true }}
        keyboard={{ enabled: true }}
        grabCursor
        watchOverflow
        onSlideChange={(swiper) => setActiveSlide(swiper.activeIndex)}
        aria-label="Champions League matches"
      >
        {games.map((game, index) => (
          <SwiperSlide key={game.id} className="!h-auto pb-8 pt-1">
            <GameCard key={game.id} isDarkTheme={isDarkTheme} isChampionsLeague isCarouselActive={index === activeSlide} {...game} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
