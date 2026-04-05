import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Music2, Mail, Gift, Sparkles, Radio, Users, CheckCircle, ArrowRight, Headphones, Star, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const artistPhoto = "/media/images/album-i-am-human.png";
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

const PERKS = [
  { icon: Music2, label: "Early access to every new drop" },
  { icon: Download, label: "Exclusive tracks & unreleased music" },
  { icon: Gift, label: "15% off merch from day one" },
  { icon: Headphones, label: "DNA Radio — always-on stream" },
  { icon: Star, label: "VIP events & meet & greet priority" },
  { icon: Radio, label: "Behind-the-scenes studio content" },
];

const RELEASES = [
  { title: "i am human.", cover: iAmHumanCover, type: "Album" },
  { title: "For The Love Of Freedom", cover: forTheLoveOfFreedomCover, type: "Single" },
  { title: "All For You", cover: allForYouCover, type: "Single" },
  { title: "COUNTRYLINE Rd.", cover: countrylineRdCover, type: "Single" },
  { title: "I Forgive You", cover: iForgiveYouCover, type: "Single" },
  { title: "At The End Of The Day", cover: atTheEndCover, type: "Single" },
  { title: "Make It Alright", cover: makeItAlrightCover, type: "Single" },
  { title: "Highlight Of My Life", cover: highlightCover, type: "Single" },
  { title: "Move Forward", cover: moveForwardCover, type: "Single" },
  { title: "The Great Attractor", cover: greatAttractorCover, type: "Album" },
];

const SOCIAL_PROOF = [
  "1,029+ fans already in the family",
  "34 countries worldwide",
  "New drops every month",
];

export default function JoinFans() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await apiRequest("POST", "/api/public/join", {
        name: name.trim(),
        email: email.trim(),
        source: "join_page",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStatus("success");
      setMessage(data.message || "You're in!");
      // Redirect to welcome flow after short delay
      setTimeout(() => setLocation("/welcome"), 1800);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Something went wrong. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05050f] via-[#0a0720] to-[#05050f] text-white">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-cyan-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 pt-16 pb-10 max-w-5xl">
          {/* Top badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Official DNA Family
            </span>
          </div>

          <div className="text-center space-y-5 mb-10">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                Join the DNA Family
              </span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
              Direct from Shakim — exclusive music, early access, and a 15% discount on everything. No middlemen. Just us.
            </p>

            {/* Social proof pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {SOCIAL_PROOF.map(s => (
                <span key={s} className="text-xs text-slate-400 bg-slate-800/60 border border-slate-700/50 px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* ── EMAIL CAPTURE CARD ── */}
          <div className="max-w-md mx-auto">
            {user ? (
              <Card className="bg-gradient-to-br from-purple-900/30 to-cyan-900/20 border border-purple-500/30">
                <CardContent className="p-6 text-center space-y-4">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                  <p className="text-white font-semibold text-lg">You're already in the family!</p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => setLocation("/exclusive")} className="w-full" data-testid="button-exclusive">
                      Access Exclusive Content <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button onClick={() => setLocation("/music")} variant="outline" className="w-full" data-testid="button-music">
                      Browse the Catalog
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : status === "success" ? (
              <Card className="bg-gradient-to-br from-green-900/30 to-cyan-900/20 border border-green-500/40">
                <CardContent className="p-6 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto animate-bounce" />
                  <p className="text-white font-bold text-xl">You're in!</p>
                  <p className="text-slate-300 text-sm">{message}</p>
                  <p className="text-slate-500 text-xs">Taking you to your welcome page…</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/60 border border-purple-500/30 shadow-2xl shadow-purple-900/20">
                <CardContent className="p-6">
                  <div className="text-center mb-5">
                    <p className="text-white font-bold text-xl mb-1">Get Free Exclusive Access</p>
                    <p className="text-slate-400 text-sm">Drop your email. No password. No BS. Just music.</p>
                  </div>

                  <form onSubmit={handleJoin} className="space-y-3">
                    <Input
                      placeholder="Your first name (optional)"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="bg-black/40 border-purple-500/30 text-white placeholder:text-slate-500 h-11"
                      data-testid="input-join-name"
                    />
                    <Input
                      type="email"
                      placeholder="Your email address *"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="bg-black/40 border-purple-500/30 text-white placeholder:text-slate-500 h-11"
                      data-testid="input-join-email"
                    />

                    {status === "error" && (
                      <p className="text-red-400 text-sm text-center">{message}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={status === "loading" || !email.trim()}
                      className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 border-0"
                      data-testid="button-join-submit"
                    >
                      {status === "loading" ? (
                        <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Joining…</span>
                      ) : (
                        <span className="flex items-center gap-2">Join the DNA Family <ArrowRight className="w-4 h-4" /></span>
                      )}
                    </Button>

                    <p className="text-center text-xs text-slate-500">
                      Already have an account?{" "}
                      <button type="button" onClick={() => setLocation("/login")} className="text-purple-400 hover:underline" data-testid="link-login">
                        Log in here
                      </button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── PERKS STRIP ── */}
      <div className="border-y border-slate-800/50 bg-black/20 py-8 mt-6">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {PERKS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm text-slate-300">
                <div className="w-7 h-7 rounded-md bg-purple-900/50 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-purple-400" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MUSIC GRID ── */}
      <div className="container mx-auto px-4 py-14 max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">What You're Getting Into</h2>
          <p className="text-slate-400 text-sm">Albums, singles, and exclusive drops — all in one place.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {RELEASES.map((r, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-md" data-testid={`album-cover-${i}`}>
              <img src={r.cover} alt={r.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
                <p className="text-white text-xs font-semibold line-clamp-1">{r.title}</p>
                <p className="text-purple-300 text-xs">{r.type}</p>
              </div>
              <div className="absolute top-1.5 right-1.5">
                <span className="text-xs bg-purple-600/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded font-medium">{r.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="bg-gradient-to-t from-purple-950/40 to-transparent">
        <div className="container mx-auto px-4 py-14 max-w-lg text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Ready to tap in?
          </h3>
          <p className="text-slate-400">
            Join thousands of fans in 34 countries already rocking with Shakim & Project DNA — directly, no platform in between.
          </p>
          {!user && status !== "success" && (
            <Button
              size="lg"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="h-12 px-10 text-base font-bold bg-gradient-to-r from-purple-600 to-cyan-600 border-0"
              data-testid="button-join-bottom"
            >
              Join Now — It's Free
            </Button>
          )}
          {user && (
            <Button size="lg" onClick={() => setLocation("/exclusive")} className="h-12 px-10" data-testid="button-exclusive-bottom">
              Access Exclusive Content <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
