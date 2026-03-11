import AudioPlayer from '@/components/AudioPlayer';
import RecentlyPlayed from '@/components/RecentlyPlayed';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart } from 'lucide-react';
import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Song } from '@shared/schema';

const albumCover = '/public-objects/album cover main_1759608641741.jpg';

export default function Music() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const songRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const { data: songs = [], isLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
  });

  const addToCartMutation = useMutation({
    mutationFn: async (songId: string) => {
      const response = await fetch(`/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ songId }),
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
          description: "This song is already in your cart!",
        });
      } else {
        toast({
          title: "Added to cart",
          description: "Song added to your cart successfully!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add song to cart",
        variant: "destructive",
      });
    },
  });

  const handlePlayRecentSong = (songId: string) => {
    const element = songRefs.current[songId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const playButton = element.querySelector('[data-testid^="button-play-"]') as HTMLButtonElement;
        playButton?.click();
      }, 500);
    }
  };

  const featuredSongs = songs.filter(song => song.featured && song.featured > 0);
  
  const filteredSongs = featuredSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Loading music...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="relative">
          <div 
            className="absolute inset-0 opacity-20 rounded-3xl"
            style={{
              backgroundImage: `url(${albumCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(40px) brightness(0.6)',
            }}
          />
          <div className="relative z-10 backdrop-blur-sm bg-background/80 rounded-3xl border border-primary/20 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <img 
                src={albumCover} 
                alt="The Great Attractor" 
                className="w-48 h-48 rounded-2xl shadow-2xl border-2 border-primary/30"
              />
              <div className="flex-1 space-y-4">
                <div>
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                    <span className="font-display text-sm font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                      NEW FEATURED RELEASE
                    </span>
                  </div>
                  <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl">
                    <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                      Featured Tracks
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground mt-2">Shakim & Project DNA</p>
                </div>
                <p className="text-foreground/80 leading-relaxed max-w-2xl">
                  Discover our newest and most exciting releases. These featured tracks represent the latest from Shakim & Project DNA.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <RecentlyPlayed onPlaySong={handlePlayRecentSong} />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-3xl">Featured Releases</h2>
              <p className="text-muted-foreground">45-second preview • $0.99 each</p>
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tracks..."
                className="pl-10 h-12 font-display"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-music"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredSongs.map((song) => (
              <div key={song.id} ref={(el) => songRefs.current[song.id] = el}>
                <AudioPlayer
                  id={song.id}
                  title={song.title}
                  artist={song.artist}
                  trackNumber={song.trackNumber}
                  audioUrl={song.audioUrl}
                  price={song.price}
                  featured={song.featured === 1}
                  lyrics={song.lyrics}
                  songMeaning={song.songMeaning}
                  artistNote={song.artistNote}
                  onAddToCart={() => addToCartMutation.mutate(song.id)}
                />
              </div>
            ))}
          </div>

          {filteredSongs.length === 0 && searchQuery && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No featured songs found matching your search.</p>
            </div>
          )}
          
          {featuredSongs.length === 0 && !searchQuery && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No featured releases available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
