import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArtistMessage {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  videoUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  featured: number;
  publishedAt: string;
}

export default function ArtistMessage() {
  const { data: messages = [], isLoading } = useQuery<ArtistMessage[]>({
    queryKey: ['/api/artist-messages'],
  });

  if (isLoading || messages.length === 0) {
    return null;
  }

  const featuredMessage = messages.find(m => m.featured === 1) || messages[0];

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-chart-3/10 via-background to-primary/10" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-3/10 border border-chart-3/20 backdrop-blur-sm">
            <MessageCircle className="h-4 w-4 text-chart-3" />
            <span className="text-sm font-display font-semibold text-chart-3">DIRECT FROM THE ARTIST</span>
          </div>
          <h2 className="font-display font-black text-4xl md:text-6xl">
            <span className="bg-gradient-to-r from-chart-3 via-primary to-chart-2 bg-clip-text text-transparent">
              Message from Shakim
            </span>
          </h2>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-card/50 backdrop-blur-sm">
          <div className="grid md:grid-cols-2 gap-0">
            {(featuredMessage.imageUrl || featuredMessage.videoUrl) && (
              <div className="relative aspect-square md:aspect-auto bg-gradient-to-br from-primary/20 to-chart-3/20">
                {featuredMessage.videoUrl ? (
                  <video 
                    controls 
                    className="w-full h-full object-cover"
                    poster={featuredMessage.imageUrl || undefined}
                    data-testid="video-artist-message"
                  >
                    <source src={featuredMessage.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : featuredMessage.imageUrl ? (
                  <img 
                    src={featuredMessage.imageUrl} 
                    alt={featuredMessage.title}
                    className="w-full h-full object-cover"
                    data-testid="img-artist-message"
                  />
                ) : null}
                {featuredMessage.featured === 1 && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="default" className="shadow-lg" data-testid="badge-featured-message">
                      Featured
                    </Badge>
                  </div>
                )}
              </div>
            )}
            
            <div className={`p-8 md:p-12 flex flex-col justify-center ${!(featuredMessage.imageUrl || featuredMessage.videoUrl) ? 'md:col-span-2' : ''}`}>
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-bold text-3xl md:text-4xl mb-4" data-testid="text-message-title">
                    {featuredMessage.title}
                  </h3>
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <p className="text-lg leading-relaxed whitespace-pre-wrap" data-testid="text-message-content">
                      {featuredMessage.message}
                    </p>
                  </div>
                </div>

                {featuredMessage.ctaText && featuredMessage.ctaUrl && (
                  <div className="pt-4">
                    <Button 
                      size="lg" 
                      className="font-display text-lg h-14 px-10 shadow-lg shadow-primary/20"
                      onClick={() => window.open(featuredMessage.ctaUrl!, '_blank', 'noopener,noreferrer')}
                      data-testid="button-message-cta"
                    >
                      {featuredMessage.ctaText}
                      <ExternalLink className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Posted {new Date(featuredMessage.publishedAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {messages.length > 1 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {messages.length - 1} more {messages.length === 2 ? 'message' : 'messages'} available
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
