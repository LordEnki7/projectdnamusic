import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface LikeButtonProps {
  entityType: 'song' | 'video';
  entityId: string;
}

export default function LikeButton({ entityType, entityId }: LikeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: likeData, isLoading } = useQuery<{ count: number; likedByUser: boolean }>({
    queryKey: ['/api/content-likes', entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/content-likes?entityType=${entityType}&entityId=${entityId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch likes');
      return res.json();
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/content-likes', { entityType, entityId });
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/content-likes', entityType, entityId] });
      const previous = queryClient.getQueryData<{ count: number; likedByUser: boolean }>(['/api/content-likes', entityType, entityId]);
      queryClient.setQueryData(['/api/content-likes', entityType, entityId], {
        count: (previous?.count ?? 0) + (previous?.likedByUser ? -1 : 1),
        likedByUser: !previous?.likedByUser,
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['/api/content-likes', entityType, entityId], context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-likes', entityType, entityId] });
    },
  });

  const handleLike = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to like content",
      });
      return;
    }
    toggleLikeMutation.mutate();
  };

  const count = likeData?.count ?? 0;
  const liked = likeData?.likedByUser ?? false;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isLoading || toggleLikeMutation.isPending}
      className={`gap-1.5 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}
      data-testid={`button-like-${entityType}-${entityId}`}
    >
      <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
      <span className="text-xs font-medium" data-testid={`text-like-count-${entityType}-${entityId}`}>
        {count > 0 ? count : ''}
      </span>
    </Button>
  );
}
