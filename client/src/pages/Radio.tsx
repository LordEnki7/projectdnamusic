import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import {
  Radio, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack,
  Music, ListMusic, Disc3, Wifi, WifiOff, ChevronRight, Lock
} from 'lucide-react';

interface NowPlayingData {
  song: {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    audioUrl: string;
    coverArt: string | null;
    duration: number | null;
  } | null;
  positionSeconds: number;
  slotDurationSeconds: number;
  secondsUntilNext: number;
  totalSongs: number;
}

interface PlaylistSong {
  songId: string;
  title: string;
  artist: string;
  album: string | null;
  audioUrl: string;
  coverArt: string | null;
  duration: number;
  position: number;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
}

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-purple-400 opacity-80"
          style={{
            height: playing ? `${Math.random() * 100 + 20}%` : '20%',
            animation: playing ? `wave ${0.5 + (i % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function DNARadioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [connected, setConnected] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const positionRef = useRef(0);
  const syncIntervalRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  const { data, refetch } = useQuery<NowPlayingData>({
    queryKey: ['/api/radio/now-playing'],
    refetchInterval: false,
    staleTime: 0,
  });

  const song = data?.song;

  const syncToStation = useCallback(async () => {
    const result = await refetch();
    const np = result.data;
    if (!np?.song || !audioRef.current) return;

    const audio = audioRef.current;
    if (audio.src !== np.song.audioUrl) {
      audio.src = np.song.audioUrl;
      audio.load();
    }

    audio.volume = isMuted ? 0 : volume;

    const seek = () => {
      if (audio.seekable.length > 0 || audio.readyState >= 2) {
        const target = Math.min(np.positionSeconds, audio.duration || np.positionSeconds);
        audio.currentTime = target;
        positionRef.current = target;
        setLocalPosition(target);
        audio.play().then(() => { setIsPlaying(true); setConnected(true); }).catch(() => {});
      }
    };

    if (audio.readyState >= 2) {
      seek();
    } else {
      audio.addEventListener('canplay', seek, { once: true });
    }
  }, [refetch, volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying) {
      tickIntervalRef.current = window.setInterval(() => {
        positionRef.current += 1;
        setLocalPosition(positionRef.current);
      }, 1000);
    } else {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    }
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, [isPlaying]);

  const handleTuneIn = () => {
    if (connected && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setConnected(false);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    } else {
      syncToStation();
      syncIntervalRef.current = window.setInterval(syncToStation, 5 * 60 * 1000);
    }
  };

  const slotDuration = data?.slotDurationSeconds || song?.duration || 240;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-black/60 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black/60 to-cyan-900/20 pointer-events-none" />

      <div className="relative p-8 md:p-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <Radio className="w-6 h-6 text-purple-400" />
            {connected && isPlaying && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-purple-300 font-bold tracking-widest text-sm uppercase font-mono">
            DNA Radio — Live Station
          </span>
          <Badge variant="outline" className="ml-auto border-purple-500/50 text-purple-300 text-xs">
            {connected && isPlaying ? (
              <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> On Air</span>
            ) : (
              <span className="flex items-center gap-1"><WifiOff className="w-3 h-3" /> Offline</span>
            )}
          </Badge>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="relative flex-shrink-0">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden border border-purple-500/30 bg-purple-900/20">
              {song?.coverArt ? (
                <img src={song.coverArt} alt={song.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 className={`w-20 h-20 text-purple-500/50 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                </div>
              )}
            </div>
            {connected && isPlaying && (
              <div className="absolute inset-0 rounded-xl ring-2 ring-purple-500/60 animate-pulse pointer-events-none" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-center md:text-left">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-mono">Now Playing</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white truncate font-display">
              {song?.title || 'Tune In to Start'}
            </h2>
            <p className="text-purple-300 mt-1 truncate">{song?.artist || 'Project DNA'}</p>
            {song?.album && <p className="text-slate-500 text-sm mt-0.5 truncate">{song.album}</p>}

            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-2">
                <span>{formatTime(localPosition)}</span>
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((localPosition / slotDuration) * 100, 100)}%` }}
                  />
                </div>
                <span>{formatTime(slotDuration)}</span>
              </div>

              <div className="mt-4">
                <WaveformBars playing={isPlaying} />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6 flex-wrap justify-center md:justify-start">
              <Button
                onClick={handleTuneIn}
                data-testid="button-radio-tune-in"
                className="px-8 bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
              >
                {connected && isPlaying ? (
                  <><Pause className="w-4 h-4 mr-2" />Disconnect</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />Tune In</>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMuted(m => !m)}
                  data-testid="button-radio-mute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                  className="w-20 accent-purple-500"
                  data-testid="input-radio-volume"
                />
              </div>
            </div>

            {data && (
              <p className="text-xs text-slate-600 mt-4 font-mono">
                Next song in ~{formatTime(data.secondsUntilNext)} · {data.totalSongs} songs in rotation
              </p>
            )}
          </div>
        </div>
      </div>
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous" />
    </div>
  );
}

function MyStationPlayer() {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [currentTime, setCurrentTime] = useState(0);

  const { data: playlists = [] } = useQuery<Playlist[]>({
    queryKey: ['/api/playlists'],
    enabled: !!user,
  });

  const { data: playlistDetail } = useQuery<{ playlist: Playlist; songs: PlaylistSong[] }>({
    queryKey: ['/api/playlists', selectedPlaylistId],
    enabled: !!selectedPlaylistId,
  });

  const songs = playlistDetail?.songs || [];
  const currentSong = songs[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src = currentSong.audioUrl;
    audio.volume = isMuted ? 0 : volume;
    audio.load();
    if (isPlaying) audio.play().catch(() => {});
  }, [currentIndex, selectedPlaylistId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handleEnded = () => {
    if (songs.length === 0) return;
    setCurrentIndex(i => (i + 1) % songs.length);
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const skipTo = (idx: number) => {
    setCurrentIndex(idx);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const skipNext = () => skipTo((currentIndex + 1) % Math.max(songs.length, 1));
  const skipPrev = () => skipTo((currentIndex - 1 + songs.length) % Math.max(songs.length, 1));

  const duration = currentSong?.duration || 240;

  if (!user) {
    return (
      <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-12 text-center">
        <Lock className="w-12 h-12 text-purple-500/50 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">Sign In to Build Your Station</h3>
        <p className="text-slate-400 mb-6">Create playlists and play them as your own personal radio station.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/login"><Button variant="outline" data-testid="link-login-radio">Sign In</Button></Link>
          <Link href="/signup"><Button data-testid="link-signup-radio" className="bg-purple-600 text-white border-0">Join Free</Button></Link>
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-12 text-center">
        <ListMusic className="w-12 h-12 text-purple-500/50 mx-auto mb-4" />
        <h3 className="text-white font-bold text-lg mb-2">No Playlists Yet</h3>
        <p className="text-slate-400 mb-6">Create a playlist first, then tune into your own station.</p>
        <Link href="/playlists">
          <Button data-testid="link-create-playlist-radio" className="bg-purple-600 text-white border-0">
            Create a Playlist
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-black/60 backdrop-blur-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-black/60 to-purple-900/10 pointer-events-none" />

      {!selectedPlaylistId ? (
        <div className="p-8">
          <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-cyan-400" /> Choose Your Station
          </h3>
          <p className="text-slate-400 text-sm mb-6">Select a playlist to play it as your personal radio station.</p>
          <div className="grid gap-3">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => { setSelectedPlaylistId(pl.id); setCurrentIndex(0); setIsPlaying(true); }}
                data-testid={`button-select-playlist-${pl.id}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 hover-elevate text-left w-full"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{pl.name}</p>
                  {pl.description && <p className="text-slate-500 text-sm truncate">{pl.description}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/playlists">
              <Button variant="ghost" size="sm" className="text-slate-500">
                Manage Playlists
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setSelectedPlaylistId(null); setIsPlaying(false); audioRef.current?.pause(); }}
              data-testid="button-back-playlist-select"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">My Station</p>
              <h3 className="text-white font-bold">{playlistDetail?.playlist.name}</h3>
            </div>
            <Badge variant="outline" className="ml-auto border-cyan-500/50 text-cyan-300 text-xs">
              {songs.length} songs · loops forever
            </Badge>
          </div>

          {currentSong && (
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="w-40 h-40 rounded-xl overflow-hidden border border-cyan-500/30 bg-cyan-900/20 flex-shrink-0">
                {currentSong.coverArt ? (
                  <img src={currentSong.coverArt} alt={currentSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className={`w-16 h-16 text-cyan-500/50 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-mono">
                  Track {currentIndex + 1} of {songs.length}
                </p>
                <h2 className="text-2xl font-bold text-white truncate">{currentSong.title}</h2>
                <p className="text-cyan-300 mt-1">{currentSong.artist}</p>

                <div className="mt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((currentTime / duration) * 100, 100)}%` }}
                      />
                    </div>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <WaveformBars playing={isPlaying} />
                </div>

                <div className="flex items-center gap-3 mt-5 justify-center md:justify-start">
                  <Button size="icon" variant="ghost" onClick={skipPrev} data-testid="button-my-station-prev">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={togglePlay}
                    data-testid="button-my-station-play"
                    className="px-8 bg-gradient-to-r from-cyan-600 to-purple-600 text-white border-0"
                  >
                    {isPlaying ? <><Pause className="w-4 h-4 mr-2" />Pause</> : <><Play className="w-4 h-4 mr-2" />Play</>}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={skipNext} data-testid="button-my-station-next">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsMuted(m => !m)} data-testid="button-my-station-mute">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-slate-800 pt-4 max-h-48 overflow-y-auto space-y-1">
            {songs.map((s, i) => (
              <button
                key={s.songId}
                onClick={() => skipTo(i)}
                data-testid={`button-my-station-track-${s.songId}`}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${i === currentIndex ? 'bg-cyan-900/30 text-white' : 'text-slate-400 hover-elevate'}`}
              >
                <span className="text-xs font-mono w-5 text-center text-slate-600">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-medium">{s.title}</p>
                  <p className="text-xs text-slate-600 truncate">{s.artist}</p>
                </div>
                {i === currentIndex && isPlaying && (
                  <Disc3 className="w-3.5 h-3.5 text-cyan-400 animate-spin flex-shrink-0" style={{ animationDuration: '2s' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <audio ref={audioRef} preload="auto" onEnded={handleEnded} onTimeUpdate={handleTimeUpdate} />
    </div>
  );
}

export default function RadioPage() {
  const [tab, setTab] = useState<'dna' | 'mine'>('dna');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black">
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-black to-black pointer-events-none" />
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #7c3aed 0%, transparent 60%)' }}
      />

      <div className="relative max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Radio className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-white font-display tracking-wider">
              DNA Radio
            </h1>
          </div>
          <p className="text-slate-400 max-w-md mx-auto">
            The official Project DNA station — playing all day, all frequency. Tune in with everyone or build your own station from your playlists.
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-900/80 rounded-xl mb-8 border border-slate-800">
          <button
            onClick={() => setTab('dna')}
            data-testid="button-tab-dna-radio"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'dna' ? 'bg-purple-600 text-white' : 'text-slate-400 hover-elevate'}`}
          >
            <Radio className="w-4 h-4" /> DNA Radio
          </button>
          <button
            onClick={() => setTab('mine')}
            data-testid="button-tab-my-station"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'mine' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover-elevate'}`}
          >
            <ListMusic className="w-4 h-4" />
            My Station
            {!user && <Lock className="w-3 h-3 opacity-60" />}
          </button>
        </div>

        {tab === 'dna' ? (
          <DNARadioPlayer />
        ) : (
          <div className="relative">
            <MyStationPlayer />
          </div>
        )}

        {tab === 'dna' && (
          <div className="mt-8 text-center">
            <p className="text-slate-600 text-sm">
              Everyone hears the same song at the same moment — like a real radio station.
            </p>
            {!user && (
              <p className="text-slate-500 text-sm mt-2">
                <Link href="/signup" className="text-purple-400 hover:text-purple-300 underline">Join free</Link> to build your own station from personal playlists.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
