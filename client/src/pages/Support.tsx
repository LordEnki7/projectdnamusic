import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Fetch Stripe config from API (bypasses integration-injected keys)
async function getStripePromise(): Promise<Stripe | null> {
  try {
    const response = await fetch('/api/stripe/config');
    const { publicKey, mode } = await response.json();
    console.log(`🔑 Loading Stripe in ${mode} MODE`);
    return await loadStripe(publicKey);
  } catch (error) {
    console.error('Failed to load Stripe config:', error);
    return null;
  }
}
const stripePromise = getStripePromise();

interface DonationStats {
  total: number;
  count: number;
}

function DonationForm() {
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  const handleCreatePayment = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/donations", { amount, message });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/support?success=true`,
        },
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!clientSecret ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="amount">Support Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
              <span className="flex items-center text-muted-foreground">USD</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Leave a message of support..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="input-message"
            />
          </div>
          <Button
            onClick={handleCreatePayment}
            className="w-full"
            data-testid="button-create-payment"
          >
            <Heart className="mr-2 h-4 w-4" />
            Continue to Payment
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
            data-testid="button-submit-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Support with $${amount}`
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats } = useQuery<DonationStats>({
    queryKey: ["/api/donations/total"],
  });

  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success");

  if (success === "true") {
    toast({
      title: "Thank you for your support!",
      description: "Your donation means the world to us",
    });
    window.history.replaceState({}, "", "/support");
  }

  return (
    <div className="min-h-[calc(100vh-200px)] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Support the Music</h1>
          <p className="text-muted-foreground">
            Your support helps create more music and exclusive content
          </p>
        </div>

        {stats && stats.total > 0 && (
          <Card className="mb-8 text-center">
            <CardContent className="py-6">
              <div className="text-3xl font-bold text-primary">
                ${stats.total.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total support from {stats.count} amazing {stats.count === 1 ? 'supporter' : 'supporters'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Make a Donation</CardTitle>
            <CardDescription>
              Show your support and help create more amazing content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <DonationForm />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
