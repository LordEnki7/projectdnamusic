import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Music, Trash2, Edit, Play } from 'lucide-react';
import { Link } from 'wouter';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: number;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Playlists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const { data: playlists = [], isLoading } = useQuery<Playlist[]>({
    queryKey: ['/api/playlists'],
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create playlist');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Playlist created!',
        description: 'Your new playlist has been created.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create playlist.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string } }) => {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update playlist');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Playlist updated!',
        description: 'Your playlist has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
      setEditingPlaylist(null);
      setFormData({ name: '', description: '' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update playlist.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete playlist');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Playlist deleted',
        description: 'Your playlist has been deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete playlist.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a playlist name.',
        variant: 'destructive',
      });
      return;
    }

    if (editingPlaylist) {
      updateMutation.mutate({
        id: editingPlaylist.id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
    }
  };

  const handleEdit = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setFormData({
      name: playlist.name,
      description: playlist.description || '',
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to create and manage your playlists.
          </p>
          <Link href="/login">
            <Button data-testid="button-login">Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
              My Playlists
            </h1>
            <p className="text-muted-foreground">
              Create and manage your personal music collections
            </p>
          </div>

          <Dialog open={createDialogOpen || !!editingPlaylist} onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingPlaylist(null);
              setFormData({ name: '', description: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-create-playlist"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Playlist Name</Label>
                  <Input
                    id="name"
                    data-testid="input-playlist-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Awesome Playlist"
                    maxLength={100}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    data-testid="input-playlist-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add a description..."
                    maxLength={500}
                    className="mt-2 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateDialogOpen(false);
                      setEditingPlaylist(null);
                      setFormData({ name: '', description: '' });
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="button-save-playlist"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingPlaylist ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <Card className="p-12 text-center">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No playlists yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first playlist to start organizing your favorite tracks!
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first">
              <Plus className="mr-2 h-4 w-4" />
              Create Playlist
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                data-testid={`card-playlist-${playlist.id}`}
                className="hover-elevate transition-all duration-300 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="font-display text-xl truncate">
                        {playlist.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {formatDate(playlist.updatedAt)}
                      </p>
                    </div>
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {playlist.description}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/playlists/${playlist.id}`} className="flex-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        data-testid={`button-view-${playlist.id}`}
                      >
                        <Play className="mr-2 h-3 w-3" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(playlist)}
                      data-testid={`button-edit-${playlist.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(playlist.id, playlist.name)}
                      data-testid={`button-delete-${playlist.id}`}
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
