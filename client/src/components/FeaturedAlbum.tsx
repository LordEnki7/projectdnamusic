import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, ShoppingCart, Music } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useRef, useEffect } from 'react';
import { useAudioContext } from '@/lib/AudioContext';

const albumCover = '/media/images/album-cover-main.jpg';
const countylineArt = '/media/images/countyline-cover.jpg';

export default function FeaturedAlbum() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { audioElement, currentSongId, setCurrentSong } = useAudioContext();
  const countylineAudioUrl = "/public-objects/songs/5%20-%20Shakim%20%26%20Project%20DNA%20-%20CountyLine%20Rd.wav";
  const featuredSongId = "featured-countyline-rd";

  useEffect(() => {
    const handleEnded = () => {
      if (currentSongId !== featuredSongId) return;
      setIsPlaying(false);
      setCurrentSong(null);
    };

    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement, currentSongId, setCurrentSong, featuredSongId]);

  useEffect(() => {
    if (currentSongId !== featuredSongId) {
      setIsPlaying(false);
    }
  }, [currentSongId, featuredSongId]);

  const togglePlayPause = async () => {
    if (isPlaying && currentSongId === featuredSongId) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      const wasDifferentSong = currentSongId !== featuredSongId;
      
      if (wasDifferentSong) {
        audioElement.pause();
        audioElement.src = countylineAudioUrl;
        setCurrentSong(featuredSongId);
      }
      
      try {
        await audioElement.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing CountyLine Rd:', error);
        setIsPlaying(false);
      }
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20 px-4">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${albumCover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(30px) brightness(0.5)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#06b6d4' : '#f59e0b',
              opacity: Math.random() * 0.6 + 0.2,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                  <span className="font-display text-sm font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                    NEW ALBUM
                  </span>
                </div>
              </div>
              
              <h2 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-tight">
                <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                  The Great Attractor
                </span>
              </h2>
              
              <p className="text-xl sm:text-2xl text-muted-foreground">
                By Shakim & Project DNA
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-lg text-foreground/80 leading-relaxed">
                Experience the cosmic pull of consciousness through sound. The Great Attractor represents the gravitational force that draws us toward our highest potential—a musical journey through awakening, purpose, and universal truth.
              </p>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span>13 Tracks</span>
                </div>
                <span>•</span>
                <span>2025</span>
                <span>•</span>
                <span className="font-display font-semibold text-primary">NOW AVAILABLE</span>
              </div>
            </div>

            <Card className="p-6 backdrop-blur-md bg-card/50 border-primary/20">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={countylineArt} 
                      alt="CountyLine Rd Single" 
                      className="h-16 w-16 rounded-lg object-cover shadow-lg"
                    />
                    <div>
                      <h4 className="font-display font-bold text-sm mb-1 text-muted-foreground">Featured Single</h4>
                      <p className="text-xl font-display font-bold text-primary">CountyLine Rd</p>
                      <p className="text-xs text-muted-foreground mt-1">Track 5 • Funky guitars by T. Lawson</p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    className="h-14 w-14 rounded-full"
                    onClick={togglePlayPause}
                    data-testid="button-play-countyline"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                  </Button>
                </div>
                
                <p className="text-sm text-foreground/70">
                  A mystical journey down the roads of destiny, where every path leads back to self-discovery and divine alignment.
                </p>
              </div>
            </Card>

            <div className="flex flex-wrap gap-4">
              <Link href="/music">
                <Button size="lg" className="font-display text-lg h-14 px-8" data-testid="button-listen-now">
                  <Play className="h-5 w-5 mr-2" />
                  Listen Now
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="font-display text-lg h-14 px-8 backdrop-blur-md"
                data-testid="button-buy-album"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Buy Album
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-chart-3/40 to-chart-2/40 rounded-2xl blur-3xl animate-pulse" />
              <div className="relative z-10 overflow-hidden rounded-2xl shadow-2xl border-2 border-primary/30">
                <img
                  src={albumCover}
                  alt="Shakim & Project DNA - The Great Attractor Album Cover"
                  className="w-full transform transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-gradient-to-br from-primary to-chart-2 rounded-full blur-3xl opacity-60 animate-pulse" />
              <div className="absolute -top-6 -left-6 h-40 w-40 bg-gradient-to-br from-chart-3 to-chart-2 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
