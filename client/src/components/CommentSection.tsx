import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { ContentComment } from '@shared/schema';

interface CommentSectionProps {
  entityType: 'song' | 'video';
  entityId: string;
  compact?: boolean;
}

export default function CommentSection({ entityType, entityId, compact = false }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { data: comments = [], isLoading: loadingComments } = useQuery<ContentComment[]>({
    queryKey: ['/api/content-comments', entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/content-comments?entityType=${entityType}&entityId=${entityId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    },
    enabled: expanded,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest('POST', '/api/content-comments', { entityType, entityId, body });
      return res.json();
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['/api/content-comments', entityType, entityId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest('DELETE', `/api/content-comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-comments', entityType, entityId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to comment",
      });
      return;
    }
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="gap-1.5 text-muted-foreground"
        data-testid={`button-comments-toggle-${entityType}-${entityId}`}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs font-medium">
          {expanded ? 'Hide' : 'Comments'}
        </span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {user && (
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                className="resize-none text-sm min-h-[60px]"
                disabled={addCommentMutation.isPending}
                data-testid={`input-comment-${entityType}-${entityId}`}
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                data-testid={`button-submit-comment-${entityType}-${entityId}`}
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {!user && (
            <p className="text-xs text-muted-foreground pl-1">
              Log in to leave a comment
            </p>
          )}

          {loadingComments && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingComments && comments.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                  data-testid={`comment-${comment.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground" data-testid={`text-comment-username-${comment.id}`}>
                        {comment.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-0.5 break-words" data-testid={`text-comment-body-${comment.id}`}>
                      {comment.body}
                    </p>
                  </div>
                  {user && (user.role === 'admin' || user.id === comment.userId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      disabled={deleteCommentMutation.isPending}
                      data-testid={`button-delete-comment-${comment.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loadingComments && expanded && comments.length === 0 && (
            <p className="text-xs text-muted-foreground pl-1">No comments yet. Be the first!</p>
          )}
        </div>
      )}
    </div>
  );
}
