import { Play, Pause, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface MusicCardProps {
  id: string;
  title: string;
  album?: string;
  duration: string;
  price: number;
  coverArt?: string;
}

export default function MusicCard({ id, title, album, duration, price, coverArt }: MusicCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    console.log(`${isPlaying ? 'Paused' : 'Playing'} preview for ${title}`);
  };

  const handleAddToCart = () => {
    console.log(`Added ${title} to cart`);
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-song-${id}`}>
      <div className="aspect-square relative bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center">
        {coverArt ? (
          <img src={coverArt} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-6xl font-display font-bold text-primary/30">DNA</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            size="icon"
            variant="secondary"
            className="h-16 w-16"
            onClick={handlePlayPause}
            data-testid={`button-play-${id}`}
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-lg leading-tight" data-testid={`text-title-${id}`}>
            {title}
          </h3>
          {album && (
            <p className="text-sm text-muted-foreground" data-testid={`text-album-${id}`}>
              {album}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{duration}</span>
          <Badge variant="secondary" className="font-display" data-testid={`text-price-${id}`}>
            ${price.toFixed(2)}
          </Badge>
        </div>

        <Button
          className="w-full font-display"
          onClick={handleAddToCart}
          data-testid={`button-add-to-cart-${id}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
