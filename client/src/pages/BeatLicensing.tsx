import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import BeatLicenseForm from '@/components/BeatLicenseForm';

interface CartItem {
  id: string;
  beatId: string | null;
  itemType: string;
  title: string;
  bpm: number | null;
  musicKey: string | null;
  genre: string | null;
  price: string;
}

interface BeatLicense {
  id: string;
  beatId: string;
  fullName: string;
  email: string;
  artistName: string | null;
  licenseType: string;
  signature: string;
  createdAt: string;
}

export default function BeatLicensing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
  });

  const { data: signedLicenses = [], isLoading: licensesLoading } = useQuery<BeatLicense[]>({
    queryKey: ['/api/beat-licenses'],
  });

  const beats = cartItems.filter(item => item.itemType === 'beat' && item.beatId);

  const signedBeatIds = new Set(signedLicenses.map(license => license.beatId));
  const unsignedBeats = beats.filter(beat => !signedBeatIds.has(beat.beatId!));

  const currentBeat = unsignedBeats[currentBeatIndex];

  const signLicenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/beat-licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to sign license');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beat-licenses'] });
      toast({
        title: "License signed!",
        description: "Beat license agreement has been signed successfully",
      });

      if (currentBeatIndex < unsignedBeats.length - 1) {
        setCurrentBeatIndex(currentBeatIndex + 1);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign license",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (beats.length === 0) {
      toast({
        title: "No beats in cart",
        description: "Add some beats to your cart first",
      });
      setLocation('/cart');
    }
  }, [beats.length, setLocation, toast]);

  useEffect(() => {
    if (!licensesLoading && unsignedBeats.length === 0 && beats.length > 0) {
      toast({
        title: "All licenses signed!",
        description: "Proceeding to checkout...",
      });
      setTimeout(() => {
        setLocation('/checkout');
      }, 1500);
    }
  }, [unsignedBeats.length, beats.length, licensesLoading, setLocation, toast]);

  if (licensesLoading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        </div>
      </div>
    );
  }

  if (unsignedBeats.length === 0 && beats.length > 0) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="p-12 text-center space-y-6">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-2xl">All Licenses Signed!</h2>
              <p className="text-muted-foreground">
                Redirecting to checkout...
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentBeat) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-4">
            Beat License Agreement
          </h1>
          <p className="text-muted-foreground text-lg">
            Please sign the licensing agreement for each beat in your cart
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {unsignedBeats.map((beat, index) => (
              <Badge
                key={beat.id}
                variant={index === currentBeatIndex ? "default" : "secondary"}
                className="px-3 py-1"
                data-testid={`badge-beat-${index}`}
              >
                Beat {index + 1}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {currentBeatIndex + 1} of {unsignedBeats.length}
          </p>
        </div>

        {beats.filter(beat => signedBeatIds.has(beat.beatId!)).length > 0 && (
          <Card className="p-4 border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold text-sm">
                  {beats.filter(beat => signedBeatIds.has(beat.beatId!)).length} of {beats.length} licenses signed
                </p>
                <p className="text-xs text-muted-foreground">
                  {beats.filter(beat => signedBeatIds.has(beat.beatId!)).map(b => b.title).join(', ')}
                </p>
              </div>
            </div>
          </Card>
        )}

        <BeatLicenseForm
          beatId={currentBeat.beatId!}
          beatTitle={currentBeat.title}
          onSubmit={(data) => signLicenseMutation.mutate(data)}
          onCancel={() => setLocation('/cart')}
          isSubmitting={signLicenseMutation.isPending}
        />

        <div className="text-center text-sm text-muted-foreground">
          <p>All licenses must be signed before proceeding to payment</p>
        </div>
      </div>
    </div>
  );
}
