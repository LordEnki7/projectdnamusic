import VideoCard from '@/components/VideoCard';
import { Film, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function Videos() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const publicVideos = [
    {
      id: 'countyline-rd',
      title: 'CountyLine Rd',
      subtitle: 'A Sonic Adventure - Featured Single from The Great Attractor',
      videoSrc: 'https://www.youtube.com/watch?v=H8nTDqM77eI',
      featured: true,
    },
    {
      id: 'at-the-end-of-the-day',
      title: 'At the End of the Day',
      subtitle: 'Lyric Video – An Emotional Journey Through Music',
      videoSrc: 'https://www.youtube.com/watch?v=Yboyijtdwz8',
    },
    {
      id: 'all-for-you',
      title: 'All For You',
      subtitle: 'A Heartfelt Anthem for All Ages',
      videoSrc: 'https://www.youtube.com/watch?v=HNwcj42aLjg',
    },
    {
      id: 'make-it-alright',
      title: 'Make It Alright',
      subtitle: 'The Anthem of Hope and Resilience',
      videoSrc: 'https://www.youtube.com/watch?v=wZk7Kb9jx58',
    },
    {
      id: 'dreadlocks-on-the-road',
      title: 'Dreadlocks on the Road',
      subtitle: 'Life Journey Visuals – Coming Soon to YouTube',
      videoSrc: '',
    },
  ];

  const exclusiveVideos = [
    {
      id: 'move-forward',
      title: 'Move Forward',
      subtitle: 'Official Music Video - Exclusive for DNA Family Members',
      videoSrc: '',
      exclusive: true,
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <Film className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-display font-black text-4xl md:text-6xl">
              <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                Music Videos
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the visual journey of Shakim & Project DNA through music videos, lyric videos, and behind-the-scenes content
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <VideoCard {...publicVideos[0]} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {publicVideos.slice(1).map((video) => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
        </div>

        {!loading && (
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-3">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="font-display font-bold text-3xl">Exclusive Fan Content</h2>
            </div>

            {user ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {exclusiveVideos.map((video) => (
                    <VideoCard key={video.id} {...video} />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-primary/30" data-testid="card-join-prompt">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-6 max-w-2xl mx-auto">
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-2xl">Unlock Exclusive Videos</h3>
                      <p className="text-muted-foreground">
                        Join the DNA Family to access exclusive music videos, behind-the-scenes content, and special visual releases available only to members
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button
                        onClick={() => setLocation("/signup")}
                        size="lg"
                        className="h-12 px-8 text-lg font-semibold"
                        data-testid="button-signup"
                      >
                        Join the DNA Family
                      </Button>
                      <Button
                        onClick={() => setLocation("/login")}
                        variant="outline"
                        size="lg"
                        className="h-12 px-8 text-lg font-semibold"
                        data-testid="button-login"
                      >
                        Login
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="text-center py-12 space-y-4">
          <div className="inline-block p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10">
            <h2 className="font-display font-bold text-2xl mb-4">More Coming Soon</h2>
            <p className="text-muted-foreground max-w-md">
              Subscribe to stay updated with new music videos, live performances, and exclusive visual content from Project DNA Music
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
