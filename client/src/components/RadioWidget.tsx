import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Radio, Disc3, ChevronRight } from 'lucide-react';

interface NowPlayingData {
  song: {
    id: string;
    title: string;
    artist: string;
    coverArt: string | null;
  } | null;
}

export default function RadioWidget() {
  const { data } = useQuery<NowPlayingData>({
    queryKey: ['/api/radio/now-playing'],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const song = data?.song;
  if (!song) return null;

  return (
    <Link href="/radio" data-testid="link-radio-widget">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/25 bg-purple-950/30 hover-elevate cursor-pointer group">
        <div className="relative flex-shrink-0">
          {song.coverArt ? (
            <img
              src={song.coverArt}
              alt={song.title}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          )}
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-black" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Radio className="w-3 h-3 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-purple-400 font-mono tracking-wider">DNA RADIO</span>
          </div>
          <p className="text-sm text-white font-medium truncate">{song.title}</p>
          <p className="text-xs text-slate-500 truncate">{song.artist}</p>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 group-hover:text-purple-400 transition-colors" />
      </div>
    </Link>
  );
}
