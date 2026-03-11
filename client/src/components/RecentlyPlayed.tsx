import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecentPlay {
  id: string;
  songId: string;
  playbackPosition: number;
  duration: number | null;
  completed: number;
  playedAt: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  audioUrl: string | null;
}

interface RecentlyPlayedProps {
  onPlaySong?: (songId: string, resumePosition?: number) => void;
}

export default function RecentlyPlayed({ onPlaySong }: RecentlyPlayedProps) {
  const { data: recentPlays = [], isLoading } = useQuery<RecentPlay[]>({
    queryKey: ['/api/listening-history/recent'],
  });

  if (isLoading || recentPlays.length === 0) {
    return null;
  }

  const uniqueSongs = Array.from(
    new Map(recentPlays.map(play => [play.songId, play])).values()
  ).slice(0, 5);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-chart-3" />
        <h3 className="font-display font-bold text-xl">Recently Played</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {uniqueSongs.map((play) => (
          <Card 
            key={play.id} 
            className="p-4 hover-elevate cursor-pointer group"
            onClick={() => onPlaySong?.(play.songId, play.completed ? 0 : play.playbackPosition)}
            data-testid={`card-recent-${play.songId}`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-bold text-sm truncate" data-testid="text-recent-title">
                    {play.title || 'Unknown'}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {play.artist || 'Unknown Artist'}
                  </p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="button-play-recent"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1">
                {!play.completed && play.playbackPosition > 0 && play.duration && (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTime(play.playbackPosition)}</span>
                      <span>{formatTime(play.duration)}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-chart-2"
                        style={{ width: `${(play.playbackPosition / play.duration) * 100}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs" data-testid="badge-continue-listening">
                      Continue Listening
                    </Badge>
                  </>
                )}
                {play.completed === 1 && (
                  <Badge variant="secondary" className="text-xs" data-testid="badge-completed">
                    Completed
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(play.playedAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
