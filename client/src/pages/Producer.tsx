import BeatCard from '@/components/BeatCard';
import ProducerServiceCard from '@/components/ProducerServiceCard';
import { Button } from '@/components/ui/button';
import { Music, Headphones, Sparkles, Award, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Beat } from '@shared/schema';
import { useLocation } from 'wouter';

const plaqueImg = '/media/images/plaque.jpeg';

export default function Producer() {
  const [, setLocation] = useLocation();
  const { data: beats = [], isLoading } = useQuery<Beat[]>({
    queryKey: ['/api/beats'],
  });

  const services = [
    {
      id: '1',
      title: 'Beat Lease',
      description: 'High-quality beat lease with unlimited streams',
      price: 49.99,
      features: [
        'MP3 & WAV files included',
        'Unlimited streams',
        'Distribution rights',
        '2,500 sales copies',
      ],
    },
    {
      id: '2',
      title: 'Exclusive Rights',
      description: 'Own the beat completely with full commercial rights',
      price: 299.99,
      features: [
        'All file formats (MP3, WAV, Stems)',
        'Unlimited streams & sales',
        'Full ownership transfer',
        'Commercial licensing',
        'Producer credit optional',
      ],
      popular: true,
    },
    {
      id: '3',
      title: 'Custom Production',
      description: 'Get a custom beat made specifically for your project',
      price: 499.99,
      features: [
        'Personalized production session',
        'Unlimited revisions',
        'All file formats included',
        'Full commercial rights',
        '48-hour delivery',
      ],
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-6">
          <h1 className="font-display font-bold text-4xl md:text-6xl bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            Shakim The Producer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional beat production and exclusive services for artists ready to elevate their sound.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 py-8">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display font-bold text-xl">Premium Beats</h3>
            <p className="text-sm text-muted-foreground">
              Industry-standard production quality
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-chart-2/10 flex items-center justify-center">
              <Headphones className="h-8 w-8 text-chart-2" />
            </div>
            <h3 className="font-display font-bold text-xl">Custom Services</h3>
            <p className="text-sm text-muted-foreground">
              Tailored production for your vision
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-chart-3/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-chart-3" />
            </div>
            <h3 className="font-display font-bold text-xl">Fast Delivery</h3>
            <p className="text-sm text-muted-foreground">
              Quick turnaround on all projects
            </p>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/80 via-primary/5 to-chart-2/10 backdrop-blur-sm p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-chart-2/10" />
          
          <div className="relative z-10 space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 to-chart-2/20 border border-primary/30 backdrop-blur-sm" data-testid="badge-major-achievement">
                <Trophy className="h-6 w-6 text-primary" data-testid="icon-trophy" />
                <span className="font-display font-bold text-lg bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  MAJOR ACHIEVEMENT
                </span>
                <Award className="h-6 w-6 text-chart-2" data-testid="icon-award" />
              </div>
              
              <h2 className="font-display font-black text-3xl md:text-5xl">
                <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
                  3+ Million Sales Worldwide
                </span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Honored for producing on <span className="font-display font-bold text-primary">Akon's First Album "Trouble"</span> with over 3 million sales in multiple countries. Worked with every major record label in the music industry as a songwriter and producer.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-chart-3 to-chart-2 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
                <div className="relative rounded-xl overflow-hidden border-2 border-primary/30 bg-background/50 backdrop-blur-sm">
                  <img 
                    src={plaqueImg} 
                    alt="Multi-Platinum Sales Award Plaque for Akon's Album 'Trouble'" 
                    className="w-full h-auto"
                    data-testid="img-achievement-plaque"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-4">
              <div className="text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-primary/20">
                <div className="font-display font-black text-3xl md:text-4xl bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent mb-2">
                  3M+
                </div>
                <p className="text-sm text-muted-foreground font-medium">Sales Worldwide</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-chart-2/20">
                <div className="font-display font-black text-3xl md:text-4xl bg-gradient-to-r from-chart-2 to-chart-3 bg-clip-text text-transparent mb-2">
                  Every
                </div>
                <p className="text-sm text-muted-foreground font-medium">Major Record Label</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-chart-3/20">
                <div className="font-display font-black text-3xl md:text-4xl bg-gradient-to-r from-chart-3 to-chart-4 bg-clip-text text-transparent mb-2">
                  Platinum
                </div>
                <p className="text-sm text-muted-foreground font-medium">Production Credits</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-display font-bold text-3xl mb-2">Available Beats</h2>
            <p className="text-muted-foreground">
              Browse and purchase high-quality beats ready for your next project.
            </p>
          </div>
          {isLoading ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Loading beats...</p>
            </div>
          ) : beats.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No beats available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {beats.map((beat) => (
                <BeatCard 
                  key={`beat-${beat.id}`} 
                  id={beat.id} 
                  title={beat.title} 
                  bpm={beat.bpm} 
                  musicKey={beat.musicKey} 
                  genre={beat.genre} 
                  price={parseFloat(beat.price)}
                  audioUrl={beat.audioUrl}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="font-display font-bold text-3xl mb-2">Production Services</h2>
            <p className="text-muted-foreground">
              Professional production packages tailored to your needs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service) => (
              <ProducerServiceCard key={service.id} {...service} />
            ))}
          </div>
        </section>

        <section className="bg-card border border-card-border rounded-lg p-8 md:p-12 text-center space-y-6">
          <h2 className="font-display font-bold text-3xl">Need Something Custom?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Contact us for custom beat production, mixing & mastering services, or collaboration opportunities.
          </p>
          <Button 
            size="lg" 
            className="font-display" 
            onClick={() => setLocation('/contact')}
            data-testid="button-contact-producer"
          >
            Get In Touch
          </Button>
        </section>
      </div>
    </div>
  );
}
