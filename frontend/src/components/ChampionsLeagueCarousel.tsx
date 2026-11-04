import React, { useMemo, useState } from 'react';
import { A11y, Autoplay, Keyboard, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Game } from '../types/game';
import { GameCard } from './GameCard';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface ChampionsLeagueCarouselProps {
  games: Game[];
  isDarkTheme: boolean;
}

export const ChampionsLeagueCarousel: React.FC<ChampionsLeagueCarouselProps> = ({ games, isDarkTheme }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const sortedGames = useMemo(() => [...games].sort((a, b) => Number(b.isLive) - Number(a.isLive)), [games]);

  return (
    <div className="champions-carousel-shell">
      <Swiper
        className="champions-carousel"
        modules={[A11y, Autoplay, Keyboard, Pagination]}
        autoplay={{ enabled: true, delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={games.length > 1}
        slidesPerView={1}
        spaceBetween={12}
        pagination={{ clickable: true }}
        keyboard={{ enabled: true }}
        grabCursor
        watchOverflow
        onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
        aria-label="Champions League matches"
      >
        {sortedGames.map((game, index) => (
          <SwiperSlide key={game.id} className="!h-auto pb-8 pt-1">
            <GameCard key={game.id} isDarkTheme={isDarkTheme} isChampionsLeague isCarouselActive={index === activeSlide} {...game} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
