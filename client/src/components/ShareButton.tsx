import { Share2, Twitter, Facebook, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  songId?: string;
}

export function ShareButton({ title, text, url, songId }: ShareButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const shareUrl = url || window.location.href;
  const shareText = text || `Check out "${title}" by Shakim & Project DNA!`;
  
  const urlObj = new URL(shareUrl, window.location.origin);
  if (user) {
    urlObj.searchParams.set('ref', user.id);
  }
  const fullUrl = urlObj.toString();

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: fullUrl,
        });
        
        if (songId) {
          fetch('/api/track-share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId, shareMethod: 'native' }),
          });
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Link copied!",
      description: "Share link copied to clipboard",
    });
    
    if (songId) {
      fetch('/api/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, shareMethod: 'copy' }),
      });
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    
    if (songId) {
      fetch('/api/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, shareMethod: 'twitter' }),
      });
    }
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    
    if (songId) {
      fetch('/api/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, shareMethod: 'facebook' }),
      });
    }
  };

  if (navigator.share) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNativeShare}
        data-testid={`button-share-${songId || 'default'}`}
      >
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-share-${songId || 'default'}`}>
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleTwitterShare} data-testid="menu-share-twitter">
          <Twitter className="mr-2 h-4 w-4" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebookShare} data-testid="menu-share-facebook">
          <Facebook className="mr-2 h-4 w-4" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} data-testid="menu-share-copy">
          <Link2 className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
