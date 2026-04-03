import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Send, Music, ShoppingBag, Star, ArrowRight } from 'lucide-react';

interface Message {
  id: string;
  from: 'shakim' | 'user';
  text: string;
  delay?: number;
}

const VIBES = ['Smooth', 'Deep', 'Soulful', 'Straight Energy'];

const vibeColors: Record<string, string> = {
  Smooth: 'from-blue-600 to-cyan-600',
  Deep: 'from-indigo-600 to-purple-600',
  Soulful: 'from-purple-600 to-pink-600',
  'Straight Energy': 'from-orange-600 to-red-600',
};

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">S</div>
      <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isShakim = msg.from === 'shakim';
  return (
    <div className={`flex items-end gap-2 ${isShakim ? '' : 'flex-row-reverse'}`}>
      {isShakim && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">S</div>
      )}
      <div className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isShakim
          ? 'bg-slate-800 text-white rounded-bl-sm'
          : 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white rounded-br-sm'
      }`}>
        {msg.text}
      </div>
    </div>
  );
}

export default function Welcome() {
  const { user, checkAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [cityInput, setCityInput] = useState('');
  const [cityValue, setCityValue] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // If no user, redirect to signup
  useEffect(() => {
    if (!user) setLocation('/signup');
  }, [user]);

  // If already completed onboarding, skip to exclusive
  useEffect(() => {
    if (user && (user.onboardingStep ?? 0) >= 3) setLocation('/exclusive');
  }, [user]);

  const addShakimMessage = (text: string, onDone?: () => void) => {
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      setMessages(prev => [...prev, { id: Date.now().toString(), from: 'shakim', text }]);
      onDone?.();
    }, 1200 + text.length * 15);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), from: 'user', text }]);
  };

  // Kick off the first message
  useEffect(() => {
    if (!user || (user.onboardingStep ?? 0) >= 3) return;
    const greeting = `${user.username}, appreciate you rocking with my music for real.`;
    setTimeout(() => {
      addShakimMessage(greeting, () => {
        setTimeout(() => {
          addShakimMessage("What city you listening from?", () => setStep(1));
        }, 600);
      });
    }, 400);
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  const handleCitySubmit = async () => {
    if (!cityInput.trim()) return;
    const city = cityInput.trim();
    setCityValue(city);
    addUserMessage(city);
    setCityInput('');
    setStep(0);

    await apiRequest('PATCH', '/api/auth/onboarding', { city, onboardingStep: 1 });
    await checkAuth();

    setTimeout(() => {
      addShakimMessage(`Love that. ${city} in the building.`, () => {
        setTimeout(() => {
          addShakimMessage("What kind of tracks from me hit you the hardest — smooth, deep, soulful, or straight energy?", () => setStep(2));
        }, 700);
      });
    }, 400);
  };

  const handleVibeSelect = async (vibe: string) => {
    setSelectedVibe(vibe);
    addUserMessage(vibe);
    setStep(0);

    await apiRequest('PATCH', '/api/auth/onboarding', { musicVibe: vibe, onboardingStep: 2 });

    const vibeResponses: Record<string, string> = {
      Smooth: "That smooth sound — that's where I live. The kind of music that hits different at 2am.",
      Deep: "Deep cuts are where the real message is. I put everything into those.",
      Soulful: "Soulful is the core of Project DNA. Real emotion, real music — that's the foundation.",
      'Straight Energy': "Then you need the full experience. I made those records for people who need something that moves.",
    };

    setTimeout(() => {
      addShakimMessage(vibeResponses[vibe] || "That's real.", () => {
        setTimeout(() => {
          addShakimMessage("You're in the right place. I keep my best exclusive drops and everything right here on the site — more than I post anywhere else.", async () => {
            setIsSubmitting(true);
            await apiRequest('PATCH', '/api/auth/onboarding', { onboardingStep: 3 });
            await checkAuth();
            setIsSubmitting(false);
            setStep(3);
          });
        }, 800);
      });
    }, 400);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-black to-black pointer-events-none" />

      <div className="relative flex flex-col max-w-lg mx-auto w-full h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">S</div>
          <div>
            <p className="text-white font-semibold text-sm">Shakim — Project DNA</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-green-400 text-xs">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
          {showTyping && <TypingIndicator />}

          {/* Step 3: Completion cards */}
          {step === 3 && (
            <div className="mt-4 space-y-3">
              <p className="text-slate-400 text-xs text-center font-mono">Check these out ↓</p>
              <div className="grid grid-cols-1 gap-3">
                <Link href="/catalog">
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-purple-500/30 bg-purple-950/30 hover-elevate cursor-pointer" data-testid="link-welcome-catalog">
                    <Music className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold text-sm">Full Catalog</p>
                      <p className="text-slate-500 text-xs">Every track, every drop</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 ml-auto" />
                  </div>
                </Link>
                <Link href="/exclusive">
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover-elevate cursor-pointer" data-testid="link-welcome-exclusive">
                    <Star className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold text-sm">Exclusive Content</p>
                      <p className="text-slate-500 text-xs">Members only — you're in</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 ml-auto" />
                  </div>
                </Link>
                <Link href="/merch">
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700/50 bg-slate-900/30 hover-elevate cursor-pointer" data-testid="link-welcome-merch">
                    <ShoppingBag className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold text-sm">Merch</p>
                      <p className="text-slate-500 text-xs">15% off your first order</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 ml-auto" />
                  </div>
                </Link>
              </div>
              <div className="text-center pt-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-slate-500" data-testid="button-welcome-go-home">
                    Go to homepage
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {step === 1 && (
          <div className="px-4 py-4 border-t border-slate-800/60">
            <div className="flex gap-2">
              <Input
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCitySubmit(); }}
                placeholder="Type your city..."
                autoFocus
                data-testid="input-onboarding-city"
                className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
              />
              <Button onClick={handleCitySubmit} disabled={!cityInput.trim()} data-testid="button-onboarding-city-send"
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-4 py-4 border-t border-slate-800/60">
            <div className="grid grid-cols-2 gap-2">
              {VIBES.map(vibe => (
                <button
                  key={vibe}
                  onClick={() => handleVibeSelect(vibe)}
                  data-testid={`button-onboarding-vibe-${vibe.toLowerCase().replace(' ', '-')}`}
                  className={`px-4 py-3 rounded-xl bg-gradient-to-r ${vibeColors[vibe]} text-white text-sm font-semibold hover-elevate active-elevate-2 transition-all`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
