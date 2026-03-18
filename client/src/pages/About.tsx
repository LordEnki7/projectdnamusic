import AnimatedLogo from '@/components/AnimatedLogo';

const albumCover = '/media/images/album-cover-main.jpg';
const artistPhoto = '/media/images/artist-photo.jpg';

export default function About() {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto space-y-20">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <AnimatedLogo className="h-40 w-auto drop-shadow-2xl" />
          </div>
          <h1 className="font-display font-black text-5xl md:text-7xl">
            <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
              About Project DNA Music
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The intersection of consciousness, creativity, and cosmic energy
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-chart-2/30 rounded-2xl blur-2xl" />
            <img 
              src={artistPhoto}
              alt="Shakim - The Artist"
              className="relative z-10 w-full h-96 object-cover rounded-2xl shadow-2xl border-2 border-primary/20 transform transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-chart-3/30 to-chart-2/30 rounded-2xl blur-2xl" />
            <img 
              src={albumCover}
              alt="The Great Attractor Album"
              className="relative z-10 w-full h-96 object-cover rounded-2xl shadow-2xl border-2 border-chart-3/20 transform transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>

        <div className="space-y-12 text-lg">
          <div className="space-y-6 p-8 rounded-2xl bg-card/30 backdrop-blur-sm border border-primary/10">
            <h2 className="font-display font-black text-4xl md:text-5xl bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
              The DNA Strand Philosophy
            </h2>
            <p className="text-foreground/80 leading-relaxed text-xl">
              Project DNA Music LLC isn't just a record label — it's a living frequency.
              It's where spirit, sound, and science fuse into one vibration. Founded by visionary artist Shakim, Project DNA dives deep into the blueprint of human experience — the rhythm of existence itself. Just as DNA encodes life, this movement encodes emotion, evolution, and enlightenment through music.
            </p>
          </div>

          <div className="space-y-6 p-8 rounded-2xl bg-card/30 backdrop-blur-sm border border-chart-2/10">
            <h2 className="font-display font-black text-4xl md:text-5xl bg-gradient-to-r from-chart-2 to-chart-3 bg-clip-text text-transparent">
              Shakim & Project DNA
            </h2>
            <p className="text-foreground/80 leading-relaxed text-xl">
              With over 3000 original compositions, Shakim & Project DNA are the architects of a new sonic language — one built from energy, light, and love.
              Every song is a strand in the musical helix, carrying stories of struggle, triumph, and awakening. Each verse is alive — a living molecule of human truth shaped into sound.
            </p>
            <p className="text-foreground/80 leading-relaxed text-xl">
              Drawing from ancient Egyptian wisdom and futuristic production, the music bridges two worlds: sacred knowledge and modern pulse. The result is a rare kind of resonance — one that speaks to the soul while moving the body. It's both medicine and motion.
            </p>
          </div>

          <div className="space-y-6 p-8 rounded-2xl bg-card/30 backdrop-blur-sm border border-chart-3/10">
            <h2 className="font-display font-black text-4xl md:text-5xl bg-gradient-to-r from-chart-3 to-chart-4 bg-clip-text text-transparent">
              The Musical Journey
            </h2>
            <p className="text-foreground/80 leading-relaxed text-xl">
              Every track in the Project DNA catalog is a chapter in an evolving chronicle — a reflection of life's trials, transformations, and transcendence.
              The music doesn't just speak the story… it activates it. Listeners aren't just hearing; they're remembering.
              They're reconnecting with the parts of themselves that hum beneath the surface — the divine code within their own DNA.
            </p>
            <p className="text-foreground/80 leading-relaxed text-xl font-display italic">
              Project DNA isn't simply heard.<br />
              It's felt.<br />
              It's lived.<br />
              It's you — decoded through sound.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="p-6 rounded-lg bg-card border border-card-border space-y-2">
              <div className="font-display font-bold text-4xl text-primary">47+</div>
              <div className="font-display font-semibold">Songs</div>
              <div className="text-sm text-muted-foreground">Tracks in discography</div>
            </div>
            <div className="p-6 rounded-lg bg-card border border-card-border space-y-2">
              <div className="font-display font-bold text-4xl text-chart-2">3</div>
              <div className="font-display font-semibold">Core Principles</div>
              <div className="text-sm text-muted-foreground">Energy, Light & Love</div>
            </div>
            <div className="p-6 rounded-lg bg-card border border-card-border space-y-2">
              <div className="font-display font-bold text-4xl text-chart-3">∞</div>
              <div className="font-display font-semibold">Possibilities</div>
              <div className="text-sm text-muted-foreground">Limitless expression</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
