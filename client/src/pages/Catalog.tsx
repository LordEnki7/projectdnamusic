import AudioPlayer from '@/components/AudioPlayer';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Song } from '@shared/schema';

export default function Catalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: "Song added to your cart successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add song to cart",
        variant: "destructive",
      });
    },
  });

  const catalogSongs = songs.filter(song => song.featured === 0);
  
  const filteredSongs = catalogSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Loading catalog...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <span className="font-display text-sm font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              MUSIC CATALOG
            </span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
              Past Released Songs
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore our complete collection of previously released tracks from Shakim & Project DNA
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-3xl">All Tracks</h2>
              <p className="text-muted-foreground">45-second preview • $0.99 each</p>
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search catalog..."
                className="pl-10 h-12 font-display"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-catalog"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredSongs.map((song) => (
              <AudioPlayer
                key={song.id}
                id={song.id}
                title={song.title}
                artist={song.artist}
                trackNumber={song.trackNumber}
                audioUrl={song.audioUrl}
                price={song.price}
                featured={song.featured === 1}
                onAddToCart={() => addToCartMutation.mutate(song.id)}
              />
            ))}
          </div>

          {filteredSongs.length === 0 && searchQuery && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No songs found matching your search.</p>
            </div>
          )}
          
          {catalogSongs.length === 0 && !searchQuery && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No catalog songs available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
