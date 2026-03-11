import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Maximize2 } from 'lucide-react';
import LikeButton from '@/components/LikeButton';
import CommentSection from '@/components/CommentSection';

interface VideoCardProps {
  id: string;
  title: string;
  subtitle?: string;
  videoSrc: string;
  featured?: boolean;
}

export default function VideoCard({ id, title, subtitle, videoSrc, featured }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <Card className="overflow-hidden group hover-elevate" data-testid={`card-video-${id}`}>
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
          data-testid={`video-player-${id}`}
        />
        
        {featured && (
          <Badge 
            className="absolute top-4 right-4 font-display backdrop-blur-md" 
            data-testid="badge-featured-video"
          >
            Featured
          </Badge>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button
            size="icon"
            variant="secondary"
            className="h-16 w-16 rounded-full backdrop-blur-md"
            onClick={handlePlayPause}
            data-testid={`button-play-video-${id}`}
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full backdrop-blur-md"
            onClick={handleFullscreen}
            data-testid={`button-fullscreen-${id}`}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
        
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-20 w-20 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center animate-pulse">
              <Play className="h-10 w-10 text-primary-foreground ml-1" />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-6 space-y-3">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-xl leading-tight" data-testid={`text-video-title-${id}`}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid={`text-video-subtitle-${id}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <LikeButton entityType="video" entityId={id} />
          <CommentSection entityType="video" entityId={id} />
        </div>
      </div>
    </Card>
  );
}
