import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import FeaturedAlbum from '@/components/FeaturedAlbum';
import ArtistMessage from '@/components/ArtistMessage';
import { Music, ShoppingBag, Sparkles, Zap, Gift, Lock, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRef } from 'react';
const dnaMovingVideo = '/media/dna-strand.mp4';

const dnaStrandImg = '/public-objects/DNA_Strand5_1759608831146.jpg';

export default function Home() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log('Video play failed:', err));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <div className="min-h-screen">
      <section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden cursor-pointer group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <video 
            ref={videoRef}
            src={dnaMovingVideo}
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-40 transition-opacity duration-500 group-hover:opacity-60"
            poster={dnaStrandImg}
          />
        </div>

        <div className="relative z-10 text-center px-4 space-y-8 max-w-5xl mx-auto">
          <div className="space-y-6">
            <h1 className="font-display font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none">
              <span className="relative inline-block">
                <span className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary via-chart-3 to-chart-2 opacity-50" />
                <span className="relative bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                  PROJECT DNA
                </span>
              </span>
            </h1>
            <div className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">
              <span className="text-primary">MUSIC</span>
              <span className="mx-3 text-chart-3">LLC</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-xl sm:text-2xl font-display font-semibold">
            <span className="text-primary flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Energy
            </span>
            <span className="text-chart-3">•</span>
            <span className="text-chart-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Light
            </span>
            <span className="text-chart-3">•</span>
            <span className="text-chart-4 flex items-center gap-2">
              <Music className="h-5 w-5" />
              Love
            </span>
          </div>
          
          <p className="text-lg sm:text-xl text-foreground/90 max-w-3xl mx-auto leading-relaxed backdrop-blur-sm bg-background/30 px-6 py-4 rounded-2xl border border-primary/10">
            Experience the musical DNA strand of <span className="font-display font-bold text-primary">Shakim & Project DNA</span>. 
            <br className="hidden sm:inline" />
            45 songs exploring life experiences through energy, mystical vibes, and conscious expression.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center pt-6">
            <Link href="/music">
              <Button size="lg" className="font-display text-lg h-14 px-10 shadow-lg shadow-primary/20" data-testid="button-explore-music">
                <Music className="h-5 w-5 mr-2" />
                Explore Music
              </Button>
            </Link>
            <Link href="/producer">
              <Button size="lg" variant="outline" className="font-display text-lg h-14 px-10 backdrop-blur-md border-primary/20" data-testid="button-beats">
                <Zap className="h-5 w-5 mr-2" />
                Beats & Production
              </Button>
            </Link>
            <Link href="/merch">
              <Button size="lg" variant="outline" className="font-display text-lg h-14 px-10 backdrop-blur-md border-chart-2/20" data-testid="button-shop-merch">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Shop Merch
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ArtistMessage />

      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-chart-2/10" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url(${dnaStrandImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm font-display font-semibold text-primary">EXCLUSIVE ACCESS</span>
            </div>
            <h2 className="font-display font-black text-4xl md:text-6xl">
              <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                Join the DNA Family
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {user 
                ? "You're already part of the family! Enjoy exclusive content and special benefits"
                : "Unlock exclusive music, behind-the-scenes content, and special member discounts"}
            </p>
          </div>

          {!user && (
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-primary/20">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center">
                  <Gift className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">15% Welcome Bonus</h3>
                <p className="text-sm text-muted-foreground">Instant discount on your first purchase when you sign up</p>
              </div>

              <div className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-chart-2/20">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">Exclusive Content</h3>
                <p className="text-sm text-muted-foreground">Members-only music, videos, and behind-the-scenes access</p>
              </div>

              <div className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-chart-3/20">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center">
                  <Heart className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">Direct Support</h3>
                <p className="text-sm text-muted-foreground">Support the artist directly and be part of the journey</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            {user ? (
              <>
                <Link href="/exclusive">
                  <Button size="lg" className="font-display text-lg h-14 px-10 shadow-lg shadow-primary/20" data-testid="button-view-exclusive">
                    <Lock className="h-5 w-5 mr-2" />
                    View Exclusive Content
                  </Button>
                </Link>
                <Link href="/support">
                  <Button size="lg" variant="outline" className="font-display text-lg h-14 px-10 backdrop-blur-md border-primary/20" data-testid="button-support-artist">
                    <Heart className="h-5 w-5 mr-2" />
                    Support the Music
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/join">
                  <Button size="lg" className="font-display text-lg h-14 px-10 shadow-lg shadow-primary/20" data-testid="button-join-club">
                    <Gift className="h-5 w-5 mr-2" />
                    Join & Get 15% Off
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="font-display text-lg h-14 px-10 backdrop-blur-md border-primary/20" data-testid="button-member-login">
                    Already a Member? Login
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <FeaturedAlbum />

      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-2/10 via-background to-primary/10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display font-black text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-chart-2 via-chart-3 to-primary bg-clip-text text-transparent">
                Featured Videos
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the energy live—from promo reels to concert moments
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 group">
              <div className="relative rounded-2xl overflow-hidden bg-card/30 backdrop-blur-sm border border-chart-2/20 hover-elevate">
                <video
                  controls
                  className="w-full aspect-video object-cover"
                  data-testid="video-countyline-promo"
                >
                  <source src="/media/countyline-promo.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-2xl text-chart-2">CountyLine Rd</h3>
                <p className="text-muted-foreground">Quick promo showcasing the vibe and energy of Project DNA</p>
              </div>
            </div>

            <div className="space-y-4 group">
              <div className="relative rounded-2xl overflow-hidden bg-card/30 backdrop-blur-sm border border-primary/20 hover-elevate">
                <video
                  controls
                  className="w-full aspect-video object-cover"
                  data-testid="video-concert"
                >
                  <source src="/media/concert.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-2xl text-primary">Live Concert Experience</h3>
                <p className="text-muted-foreground">Feel the live energy—Shakim & Project DNA in action</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display font-black text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                The DNA Experience
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              More than music—a transformation through sound
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-6 p-10 rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover-elevate">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center">
                  <Music className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold text-3xl">47+ Songs</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A complete discography of life experiences transformed into conscious musical expression
                </p>
              </div>
            </div>

            <div className="text-center space-y-6 p-10 rounded-2xl bg-card/50 backdrop-blur-sm border border-chart-2/10 hover-elevate">
              <div className="relative">
                <div className="absolute inset-0 bg-chart-2/20 blur-2xl rounded-full" />
                <div className="relative h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold text-3xl">Mystical Energy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Egyptian-inspired wisdom fused with futuristic soundscapes and cosmic consciousness
                </p>
              </div>
            </div>

            <div className="text-center space-y-6 p-10 rounded-2xl bg-card/50 backdrop-blur-sm border border-chart-3/10 hover-elevate">
              <div className="relative">
                <div className="absolute inset-0 bg-chart-3/20 blur-2xl rounded-full" />
                <div className="relative h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center">
                  <ShoppingBag className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold text-3xl">Exclusive Merch</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Premium merchandise featuring the iconic DNA strand design and sacred geometry
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
