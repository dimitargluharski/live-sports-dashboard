import { ExternalStreamPlayer } from './ExternalStreamPlayer';
import type { Stream } from '../types/game';
import { isVideoUrl } from '../utils/isVideoUrl';
import { isWrapperStreamUrl } from '../utils/isWrapperStreamUrl';

interface StreamPlayerProps {
  stream: Stream;
  isDarkTheme: boolean;
  isLoading: boolean;
  isUnavailable: boolean;
  onLoad: () => void;
  onError: () => void;
}

export function StreamPlayer({
  stream,
  isDarkTheme,
  isLoading,
  isUnavailable,
  onLoad,
  onError,
}: StreamPlayerProps) {
  const isWrapper = isWrapperStreamUrl(stream.url);

  return (
    <div className="relative aspect-video shrink-0 overflow-hidden rounded-2xl bg-black">
      {isUnavailable ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-300" aria-hidden="true">!</span>
          <p className="text-base font-bold">Stream unavailable</p>
          <p className="max-w-sm text-sm text-slate-300">This source did not respond successfully. Try another stream.</p>
        </div>
      ) : isLoading && !isWrapper ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
            Loading stream...
          </div>
        </div>
      ) : null}

      {!isUnavailable && isWrapper ? (
        <ExternalStreamPlayer streamUrl={stream.url} isDarkTheme={isDarkTheme} />
      ) : !isUnavailable && isVideoUrl(stream.url) ? (
        <video
          className="block h-full w-full object-contain"
          controls
          autoPlay
          controlsList="nodownload"
          onLoadedData={onLoad}
          onError={onError}
        >
          <source src={stream.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : !isUnavailable ? (
        <iframe
          className="absolute inset-0 block h-full w-full overflow-hidden border-0"
          src={stream.url}
          title={stream.label}
          scrolling="no"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={onLoad}
          onError={onError}
        />
      ) : null}
    </div>
  );
}
