import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import LikeButton from '@/components/LikeButton';
import CommentSection from '@/components/CommentSection';

interface VideoCardProps {
  id: string;
  title: string;
  subtitle?: string;
  videoSrc: string;
  featured?: boolean;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VideoCard({ id, title, subtitle, videoSrc, featured }: VideoCardProps) {
  const [activated, setActivated] = useState(false);
  const youtubeId = getYouTubeId(videoSrc);

  const thumbnailUrl = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

  const embedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
    : null;

  return (
    <Card className="overflow-hidden group hover-elevate" data-testid={`card-video-${id}`}>
      <div className="relative aspect-video bg-black">
        {youtubeId ? (
          activated ? (
            <iframe
              src={embedUrl!}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-testid={`video-player-${id}`}
            />
          ) : (
            <div
              className="w-full h-full relative cursor-pointer"
              onClick={() => setActivated(true)}
              data-testid={`button-play-video-${id}`}
            >
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center animate-pulse">
                  <Play className="h-10 w-10 text-primary-foreground ml-1" />
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground">
            Video coming soon
          </div>
        )}

        {featured && (
          <Badge
            className="absolute top-4 right-4 font-display backdrop-blur-md"
            data-testid="badge-featured-video"
          >
            Featured
          </Badge>
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
