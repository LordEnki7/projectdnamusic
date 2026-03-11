import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Music, Trash2, ArrowLeft, Play } from 'lucide-react';
import { Link, useParams } from 'wouter';
import AudioPlayer from '@/components/AudioPlayer';

interface PlaylistSong {
  id: string;
  songId: string;
  position: number;
  addedAt: string;
  title: string;
  artist: string;
  album: string | null;
  audioUrl: string;
  duration: number;
  price: string;
}

interface PlaylistDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  songs: PlaylistSong[];
}

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addSongsDialogOpen, setAddSongsDialogOpen] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());

  const { data: playlist, isLoading } = useQuery<PlaylistDetail>({
    queryKey: ['/api/playlists', id],
    queryFn: async () => {
      const response = await fetch(`/api/playlists/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch playlist');
      return response.json();
    },
    enabled: !!user && !!id,
  });

  const { data: allSongs = [] } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
  });

  const addSongsMutation = useMutation({
    mutationFn: async (songIds: string[]) => {
      const response = await fetch(`/api/playlists/${id}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ songIds }),
      });
      if (!response.ok) throw new Error('Failed to add songs');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Songs added!',
        description: 'Songs have been added to your playlist.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', id] });
      setAddSongsDialogOpen(false);
      setSelectedSongs(new Set());
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add songs to playlist.',
        variant: 'destructive',
      });
    },
  });

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const response = await fetch(`/api/playlists/${id}/songs/${songId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove song');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Song removed',
        description: 'Song has been removed from your playlist.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists', id] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove song from playlist.',
        variant: 'destructive',
      });
    },
  });

  const handleToggleSong = (songId: string) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  const handleAddSongs = () => {
    if (selectedSongs.size === 0) {
      toast({
        title: 'No songs selected',
        description: 'Please select at least one song to add.',
        variant: 'destructive',
      });
      return;
    }
    addSongsMutation.mutate(Array.from(selectedSongs));
  };

  const handleRemoveSong = (songId: string, title: string) => {
    if (confirm(`Remove "${title}" from this playlist?`)) {
      removeSongMutation.mutate(songId);
    }
  };

  const availableSongs = allSongs.filter(
    (song) => !playlist?.songs.some((ps) => ps.songId === song.id)
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to view your playlists.
          </p>
          <Link href="/login">
            <Button data-testid="button-login">Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-muted/20 rounded w-1/3" />
            <div className="h-64 bg-muted/20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Playlist Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This playlist doesn't exist or you don't have access to it.
          </p>
          <Link href="/playlists">
            <Button data-testid="button-back">Back to Playlists</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/playlists">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Playlists
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
                {playlist.name}
              </h1>
              {playlist.description && (
                <p className="text-muted-foreground text-lg">{playlist.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
              </p>
            </div>

            <Dialog open={addSongsDialogOpen} onOpenChange={setAddSongsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-songs">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Songs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Songs to Playlist</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {availableSongs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      All songs have been added to this playlist!
                    </p>
                  ) : (
                    availableSongs.map((song) => (
                      <Card
                        key={song.id}
                        className={`p-4 cursor-pointer transition-all ${
                          selectedSongs.has(song.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover-elevate'
                        }`}
                        onClick={() => handleToggleSong(song.id)}
                        data-testid={`song-select-${song.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-semibold">{song.title}</p>
                            <p className="text-sm text-muted-foreground">{song.artist}</p>
                          </div>
                          {selectedSongs.has(song.id) && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <svg
                                className="h-4 w-4 text-primary-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
                {availableSongs.length > 0 && (
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddSongsDialogOpen(false);
                        setSelectedSongs(new Set());
                      }}
                      data-testid="button-cancel-add"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddSongs}
                      disabled={addSongsMutation.isPending || selectedSongs.size === 0}
                      data-testid="button-confirm-add"
                    >
                      Add {selectedSongs.size > 0 && `(${selectedSongs.size})`}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {playlist.songs.length === 0 ? (
          <Card className="p-12 text-center">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No songs yet</h3>
            <p className="text-muted-foreground mb-6">
              Add some songs to get started!
            </p>
            <Button onClick={() => setAddSongsDialogOpen(true)} data-testid="button-add-first-song">
              <Plus className="mr-2 h-4 w-4" />
              Add Songs
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {playlist.songs.map((song, index) => (
              <Card
                key={song.id}
                data-testid={`playlist-song-${song.id}`}
                className="hover-elevate transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-display text-muted-foreground w-8 text-center">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <AudioPlayer
                        id={song.songId}
                        title={song.title}
                        artist={song.artist}
                        trackNumber={index + 1}
                        audioUrl={song.audioUrl}
                        price={song.price}
                        onAddToCart={() => {}}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSong(song.songId, song.title)}
                      data-testid={`button-remove-${song.id}`}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
