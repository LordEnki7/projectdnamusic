import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, ShoppingCart, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAudioContext } from '@/lib/AudioContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShareButton } from '@/components/ShareButton';
import LikeButton from '@/components/LikeButton';
import CommentSection from '@/components/CommentSection';

interface AudioPlayerProps {
  id: string;
  title: string;
  artist: string;
  trackNumber: number;
  audioUrl: string;
  price: string;
  featured?: boolean;
  lyrics?: string | null;
  songMeaning?: string | null;
  artistNote?: string | null;
  onAddToCart: () => void;
}

export default function AudioPlayer({ 
  id, 
  title, 
  artist, 
  trackNumber, 
  audioUrl, 
  price,
  featured = false,
  lyrics,
  songMeaning,
  artistNote,
  onAddToCart 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const { audioElement, currentSongId, setCurrentSong } = useAudioContext();
  const lastSavedTime = useRef<number>(0);

  const PREVIEW_DURATION = 45;

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (currentSongId !== id) return;
      
      setCurrentTime(audioElement.currentTime);
      if (audioElement.currentTime >= PREVIEW_DURATION) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setIsPlaying(false);
        setCurrentSong(null);
        
        fetch('/api/listening-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            songId: id,
            playbackPosition: PREVIEW_DURATION,
            duration: PREVIEW_DURATION,
            completed: true
          })
        }).catch(err => console.log('Failed to save completion:', err));
        
        lastSavedTime.current = 0;
        return;
      }

      const currentSecond = Math.floor(audioElement.currentTime);
      if (audioElement.currentTime > 5 && currentSecond % 10 === 0 && lastSavedTime.current !== currentSecond) {
        lastSavedTime.current = currentSecond;
        fetch('/api/listening-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            songId: id,
            playbackPosition: currentSecond,
            duration: PREVIEW_DURATION,
            completed: false
          })
        }).catch(err => console.log('Failed to save listening history:', err));
      }
    };

    const handleLoadedMetadata = () => {
      if (currentSongId !== id) return;
      setDuration(PREVIEW_DURATION);
    };

    const handleEnded = () => {
      if (currentSongId !== id) return;
      
      setIsPlaying(false);
      audioElement.currentTime = 0;
      setCurrentSong(null);
      
      fetch('/api/listening-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          songId: id,
          playbackPosition: PREVIEW_DURATION,
          duration: PREVIEW_DURATION,
          completed: true
        })
      }).catch(err => console.log('Failed to save completion:', err));
      
      lastSavedTime.current = 0;
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [id, audioElement, currentSongId, setCurrentSong, isPlaying]);

  useEffect(() => {
    if (currentSongId !== id) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentSongId, id]);

  const togglePlayPause = async () => {
    if (isPlaying && currentSongId === id) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      try {
        const wasDifferentSong = currentSongId !== id;
        
        if (wasDifferentSong) {
          audioElement.pause();
          audioElement.currentTime = 0;
          audioElement.src = audioUrl;
          setCurrentSong(id);
          setCurrentTime(0);
          lastSavedTime.current = 0;
        }
        
        if (audioElement.currentTime === 0 && wasDifferentSong) {
          try {
            const response = await fetch(`/api/listening-history/resume/${id}`, {
              credentials: 'include'
            });
            if (response.ok) {
              const data = await response.json();
              if (data.resumePosition > 0 && data.resumePosition < PREVIEW_DURATION - 1) {
                audioElement.currentTime = data.resumePosition;
                setCurrentTime(data.resumePosition);
              }
            }
          } catch (err) {
            console.log('Could not fetch resume position:', err);
          }
        }
        
        await audioElement.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error instanceof Error ? error.message : String(error));
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentSongId !== id) return;
    
    const newTime = parseFloat(e.target.value);
    if (newTime <= PREVIEW_DURATION) {
      audioElement.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / duration) * 100;

  return (
    <Card className="p-4 hover-elevate" data-testid={`card-song-${id}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="font-display font-bold text-2xl text-muted-foreground w-8 text-right">
            {trackNumber}
          </div>
          <Button
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full"
            onClick={togglePlayPause}
            data-testid={`button-play-${id}`}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg truncate" data-testid={`text-song-title-${id}`}>
                  {title}
                </h3>
                {featured && (
                  <Badge variant="default" className="flex-shrink-0" data-testid="badge-featured-song">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{artist}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="font-display font-bold text-lg">${price}</div>
                <div className="text-xs text-muted-foreground">45s preview</div>
              </div>
              {(lyrics || songMeaning || artistNote) && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      data-testid={`button-lyrics-${id}`}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-lg">
                    <SheetHeader>
                      <SheetTitle className="font-display text-2xl">
                        {title}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">{artist}</p>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-8rem)] mt-6 pr-4">
                      <div className="space-y-6">
                        {lyrics && (
                          <div>
                            <h3 className="font-display font-bold text-lg mb-3">Lyrics</h3>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {lyrics}
                            </div>
                          </div>
                        )}
                        {songMeaning && (
                          <div>
                            <h3 className="font-display font-bold text-lg mb-3">Song Meaning</h3>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {songMeaning}
                            </div>
                          </div>
                        )}
                        {artistNote && (
                          <div>
                            <h3 className="font-display font-bold text-lg mb-3">Artist's Note</h3>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-primary">
                              {artistNote}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
              <ShareButton 
                title={title}
                text={`Check out "${title}" by ${artist} on Project DNA Music!`}
                songId={id}
              />
              <LikeButton entityType="song" entityId={id} />
              <Button
                size="default"
                onClick={onAddToCart}
                data-testid={`button-add-to-cart-${id}`}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono w-10">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                data-testid={`slider-progress-${id}`}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono w-10">
              {formatTime(duration)}
            </span>
          </div>
          <CommentSection entityType="song" entityId={id} compact />
        </div>
      </div>
    </Card>
  );
}
