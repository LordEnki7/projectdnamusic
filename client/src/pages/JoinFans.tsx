import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Mail, Gift, Sparkles, Radio, Users, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

const iForgiveYouCover = "/media/images/album-i-forgive-you.jpg";
const atTheEndCover = "/media/images/album-at-the-end.jpg";
const makeItAlrightCover = "/media/images/album-make-it-alright.jpg";
const highlightCover = "/media/images/album-highlight.png";
const shakimSingleCover = "/media/images/album-shakim-single.jpg";
const moveForwardCover = "/media/images/album-move-forward.jpg";
const greatAttractorCover = "/media/images/album-great-attractor-2.jpg";
const forTheLoveOfFreedomCover = "/media/images/album-freedom.jpg";
const allForYouCover = "/media/images/album-all-for-you.jpg";
const countrylineRdCover = "/media/images/album-countyline-mockup.jpg";
const iAmHumanCover = "/media/images/album-i-am-human.png";

export default function JoinFans() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const exclusiveReleases = [
    {
      title: "i am human.",
      artist: "projectDNA",
      cover: iAmHumanCover,
      type: "Album"
    },
    {
      title: "For The Love Of Freedom",
      artist: "Project DNA f/ ShaKim",
      cover: forTheLoveOfFreedomCover,
      type: "Single"
    },
    {
      title: "All For You",
      artist: "Shakim & Project DNA",
      cover: allForYouCover,
      type: "Single"
    },
    {
      title: "COUNTRYLINE Rd.",
      artist: "Project DNA",
      cover: countrylineRdCover,
      type: "Single"
    },
    {
      title: "I Forgive You",
      artist: "Shakim & Project DNA",
      cover: iForgiveYouCover,
      type: "Single"
    },
    {
      title: "At The End Of The Day",
      artist: "Shakim & Project DNA",
      cover: atTheEndCover,
      type: "Single"
    },
    {
      title: "Make It Alright",
      artist: "Shakim & Project DNA",
      cover: makeItAlrightCover,
      type: "Single"
    },
    {
      title: "Highlight Of My Life",
      artist: "Shakim & Project DNA",
      cover: highlightCover,
      type: "Single"
    },
    {
      title: "Move Forward",
      artist: "Shakim & Project DNA",
      cover: moveForwardCover,
      type: "Single"
    },
    {
      title: "The Great Attractor",
      artist: "Shakim & Project DNA",
      cover: greatAttractorCover,
      type: "Album"
    }
  ];

  const benefits = [
    {
      icon: Music2,
      title: "Exclusive Music",
      description: "Early access to new releases and unreleased tracks"
    },
    {
      icon: Gift,
      title: "Member Perks",
      description: "Special discounts on merchandise and limited editions"
    },
    {
      icon: Radio,
      title: "Behind the Scenes",
      description: "Exclusive content from the studio and live sessions"
    },
    {
      icon: Sparkles,
      title: "VIP Access",
      description: "Priority tickets to shows and meet & greet events"
    },
    {
      icon: Mail,
      title: "Direct Updates",
      description: "Get the latest news and announcements first"
    },
    {
      icon: Users,
      title: "Community",
      description: "Connect with other fans and join exclusive discussions"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-block">
              <div className="relative">
                <h1 className="text-5xl md:text-7xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                  Join the DNA Family
                </h1>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl -z-10" />
              </div>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Become part of an exclusive community and experience music that transcends dimensions
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-3xl font-display font-bold">Exclusive Fan Releases</h2>
              </div>
              <p className="text-muted-foreground">
                Get instant access to our exclusive single releases and special editions
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {exclusiveReleases.map((release, index) => (
                <div 
                  key={index}
                  className="group relative"
                  data-testid={`album-${index}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-card border border-primary/20 rounded-lg overflow-hidden hover-elevate transition-all duration-300">
                    <div className="aspect-square relative overflow-hidden">
                      <img 
                        src={release.cover}
                        alt={release.title}
                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                        <div className="p-3 w-full">
                          <p className="text-white font-semibold text-sm line-clamp-1">{release.title}</p>
                          <p className="text-white/80 text-xs">{release.artist}</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <div className="bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-semibold backdrop-blur-sm">
                          {release.type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-primary/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <p className="text-lg font-semibold">Fan-Only Collections</p>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    Join the DNA Family to unlock full access to our exclusive single releases, behind-the-scenes content, and special editions available only to our community members
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 shadow-2xl shadow-primary/10" data-testid="card-signup">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-3xl font-display">Get Exclusive Access</CardTitle>
              <CardDescription className="text-base">
                {user ? "You're already a member! Enjoy exclusive content" : "Sign up now and unlock a universe of exclusive content and benefits"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <Button
                    onClick={() => setLocation("/exclusive")}
                    data-testid="button-exclusive"
                    className="w-full h-12 text-lg font-semibold"
                  >
                    View Exclusive Content
                  </Button>
                  <Button
                    onClick={() => setLocation("/support")}
                    variant="outline"
                    data-testid="button-support"
                    className="w-full h-12 text-lg font-semibold"
                  >
                    Support the Music
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setLocation("/signup")}
                    data-testid="button-submit"
                    className="w-full h-12 text-lg font-semibold"
                  >
                    Create Account & Get 15% Off
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Already a member?{" "}
                    <button
                      onClick={() => setLocation("/login")}
                      className="text-primary hover:underline"
                      data-testid="link-login"
                    >
                      Login here
                    </button>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-8">
            <h2 className="text-3xl font-display font-bold text-center">Member Benefits</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <Card 
                  key={index} 
                  className="hover-elevate transition-all duration-300 border-primary/10" 
                  data-testid={`card-benefit-${index}`}
                >
                  <CardHeader className="space-y-3">
                    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <benefit.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-display font-bold">Ready to Experience the Future?</h3>
                <p className="text-muted-foreground">
                  Join thousands of fans already experiencing exclusive music, content, and community from Shakim & Project DNA
                </p>
                <Button 
                  size="lg" 
                  data-testid="button-join-bottom"
                  className="h-12 px-8 text-lg font-semibold"
                  onClick={() => user ? setLocation("/exclusive") : setLocation("/signup")}
                >
                  {user ? "View Exclusive Content" : "Join Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
