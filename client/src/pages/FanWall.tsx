import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Heart, Music, Send, Sparkles, Flame, ThumbsUp, Star, Zap } from 'lucide-react';

interface Song {
  id: string;
  title: string;
}

interface FanWallMessage {
  id: string;
  username: string;
  message: string;
  songId: string | null;
  dedicatedTo: string | null;
  reaction: string | null;
  createdAt: string;
}

const reactions = [
  { value: 'fire', label: 'Fire', icon: Flame },
  { value: 'love', label: 'Love', icon: Heart },
  { value: 'vibes', label: 'Vibes', icon: Music },
  { value: 'magic', label: 'Magic', icon: Sparkles },
  { value: 'praise', label: 'Praise', icon: ThumbsUp },
  { value: 'perfect', label: 'Perfect', icon: Star },
];

export default function FanWall() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [songId, setSongId] = useState<string>('');
  const [dedicatedTo, setDedicatedTo] = useState('');
  const [reaction, setReaction] = useState<string>('');

  const { data: messagesData = [] } = useQuery<FanWallMessage[]>({
    queryKey: ['/api/fan-wall'],
  });

  const { data: songsData = [] } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
  });

  // Ensure we always have arrays, even if API returns null
  const messages = Array.isArray(messagesData) ? messagesData : [];
  const songs = Array.isArray(songsData) ? songsData : [];

  const submitMutation = useMutation({
    mutationFn: async (data: {
      message: string;
      songId?: string;
      dedicatedTo?: string;
      reaction?: string;
    }) => {
      const response = await fetch('/api/fan-wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to submit message');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Message submitted!',
        description: 'Your message is pending approval and will appear soon.',
      });
      setMessage('');
      setSongId('');
      setDedicatedTo('');
      setReaction('');
      queryClient.invalidateQueries({ queryKey: ['/api/fan-wall'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit message. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter a message before submitting.',
        variant: 'destructive',
      });
      return;
    }

    submitMutation.mutate({
      message: message.trim(),
      songId: songId || undefined,
      dedicatedTo: dedicatedTo.trim() || undefined,
      reaction: reaction || undefined,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
            Fan Wall
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Share your love for Project DNA Music. Leave a message, dedicate a song, or show your support!
          </p>
        </div>

        <Card className="mb-12 border-primary/20 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Share Your Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="message" className="text-base font-semibold">
                  Your Message
                </Label>
                <Textarea
                  id="message"
                  data-testid="input-fan-wall-message"
                  placeholder="Share your thoughts about Project DNA Music..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/500 characters
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="song" className="text-sm font-semibold">
                    Dedicate to a Song (Optional)
                  </Label>
                  <Select value={songId} onValueChange={setSongId}>
                    <SelectTrigger
                      id="song"
                      data-testid="select-fan-wall-song"
                      className="mt-2"
                    >
                      <SelectValue placeholder="Select a song" />
                    </SelectTrigger>
                    <SelectContent>
                      {songs.map((song) => (
                        <SelectItem key={song.id} value={song.id}>
                          {song.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dedicatedTo" className="text-sm font-semibold">
                    Dedicated To (Optional)
                  </Label>
                  <Input
                    id="dedicatedTo"
                    data-testid="input-dedicated-to"
                    placeholder="Someone special..."
                    value={dedicatedTo}
                    onChange={(e) => setDedicatedTo(e.target.value)}
                    className="mt-2"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="reaction" className="text-sm font-semibold">
                    Reaction (Optional)
                  </Label>
                  <Select value={reaction} onValueChange={setReaction}>
                    <SelectTrigger
                      id="reaction"
                      data-testid="select-fan-wall-reaction"
                      className="mt-2"
                    >
                      <SelectValue placeholder="Select reaction" />
                    </SelectTrigger>
                    <SelectContent>
                      {reactions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="button-submit-fan-wall"
                disabled={submitMutation.isPending || !message.trim()}
                className="w-full md:w-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit Message'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            Messages from Fans
          </h2>

          {messages.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">
                No messages yet. Be the first to share your love!
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {messages.map((msg) => (
                <Card
                  key={msg.id}
                  data-testid={`card-fan-wall-message-${msg.id}`}
                  className="border-primary/10 hover-elevate transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-primary" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {msg.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                      {msg.reaction && (() => {
                        const reactionData = reactions.find(r => r.value === msg.reaction);
                        const ReactionIcon = reactionData?.icon || Sparkles;
                        return (
                          <div
                            className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary"
                            data-testid={`reaction-${msg.id}`}
                          >
                            <ReactionIcon className="h-4 w-4" />
                          </div>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-relaxed" data-testid={`message-${msg.id}`}>
                      {msg.message}
                    </p>

                    {msg.songId && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                        <Music className="h-3 w-3" />
                        <span data-testid={`song-dedication-${msg.id}`}>
                          {songs.find((s) => s.id === msg.songId)?.title || 'Unknown Song'}
                        </span>
                      </div>
                    )}

                    {msg.dedicatedTo && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        <span data-testid={`dedicated-to-${msg.id}`}>
                          Dedicated to {msg.dedicatedTo}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
