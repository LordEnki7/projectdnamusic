import { Play, Pause, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useRef, useEffect } from 'react';
import { useAudioContext } from '@/lib/AudioContext';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BeatCardProps {
  id: string;
  title: string;
  bpm: number;
  musicKey: string;
  genre: string;
  price: number;
  audioUrl: string;
}

export default function BeatCard({ id, title, bpm, musicKey, genre, price, audioUrl }: BeatCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { audioElement, currentSongId, setCurrentSong } = useAudioContext();
  const { toast } = useToast();

  const addToCartMutation = useMutation({
    mutationFn: async (beatId: string) => {
      const response = await fetch(`/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ beatId }),
      });
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      if (data.message === "Item already in cart") {
        toast({
          title: "Already in cart",
          description: "This beat is already in your cart!",
        });
      } else {
        toast({
          title: "Added to cart",
          description: "Beat added to your cart successfully!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add beat to cart",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const handleEnded = () => {
      if (currentSongId !== id) return;
      
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setCurrentSong(null);
    };

    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [id, audioElement, currentSongId, setCurrentSong]);

  useEffect(() => {
    if (currentSongId !== id) {
      setIsPlaying(false);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    }
  }, [currentSongId, id]);

  const handlePlayPause = async () => {
    if (isPlaying && currentSongId === id) {
      audioElement.pause();
      audioElement.currentTime = 0;
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      setIsPlaying(false);
      setCurrentSong(null);
    } else {
      const wasDifferentSong = currentSongId !== id;
      
      if (wasDifferentSong) {
        audioElement.pause();
        audioElement.src = audioUrl;
        setCurrentSong(id);
      }
      
      audioElement.currentTime = 0;
      
      try {
        await audioElement.play();
        setIsPlaying(true);
        
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }
        
        const timeoutId = setTimeout(() => {
          if (currentSongId === id && previewTimeoutRef.current === timeoutId) {
            audioElement.pause();
            audioElement.currentTime = 0;
            setIsPlaying(false);
            setCurrentSong(null);
            previewTimeoutRef.current = null;
          }
        }, 30000);
        
        previewTimeoutRef.current = timeoutId;
      } catch (error) {
        console.error('Error playing beat:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleAddToCart = () => {
    addToCartMutation.mutate(id);
  };

  return (
    <Card className="p-4 space-y-3 hover-elevate" data-testid={`card-beat-${id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-lg truncate" data-testid={`text-beat-title-${id}`}>
            {title}
          </h3>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{genre}</Badge>
            <Badge variant="outline" className="text-xs">{bpm} BPM</Badge>
            <Badge variant="outline" className="text-xs">{musicKey}</Badge>
          </div>
        </div>
        <Button
          size="icon"
          variant={isPlaying ? 'default' : 'secondary'}
          onClick={handlePlayPause}
          data-testid={`button-play-beat-${id}`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <span className="font-display font-bold text-xl" data-testid={`text-beat-price-${id}`}>
          ${price.toFixed(2)}
        </span>
        <Button
          onClick={handleAddToCart}
          disabled={addToCartMutation.isPending}
          data-testid={`button-add-beat-${id}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
        </Button>
      </div>
    </Card>
  );
}
