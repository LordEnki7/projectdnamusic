import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Crown, Star, Check, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface MembershipTier {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  discountPercent: number;
  perks: string[];
  earlyAccessDays: number;
  exclusiveContentAccess: number;
  active: number;
  createdAt: string;
}

interface Membership {
  id: string;
  userId: string;
  tierId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  startedAt: string;
  renewsAt: string | null;
  canceledAt: string | null;
  trialEndsAt: string | null;
}

interface SubscriptionStatus {
  user: {
    id: string;
    email: string;
    tierId: string | null;
    discountOverride: number | null;
  };
  tier: MembershipTier | null;
  membership: Membership | null;
  discountPercent: number;
}

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery<MembershipTier[]>({
    queryKey: ['/api/membership-tiers'],
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/subscription/cancel');
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will be canceled at the end of your billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (tierId: string) => {
      return await apiRequest('POST', '/api/subscription/create-checkout', { tierId });
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start upgrade process. Please try again.",
        variant: "destructive",
      });
      setUpgradingTo(null);
    },
  });

  const handleUpgrade = (tierId: string) => {
    setUpgradingTo(tierId);
    upgradeMutation.mutate(tierId);
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel your subscription? You'll continue to have access until the end of your billing period.")) {
      cancelMutation.mutate();
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Account Access</CardTitle>
            <CardDescription>Please log in to view your account</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/login')} data-testid="button-login">
              Log In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (statusLoading || tiersLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentTier = status?.tier;
  const membership = status?.membership;
  const availableTiers = tiers?.filter(t => parseFloat(t.price) > 0) || [];
  const currentTierPrice = currentTier ? parseFloat(currentTier.price) : 0;
  const isCanceled = membership?.canceledAt !== null;

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">My Account</h1>
          <p className="text-muted-foreground">Manage your membership and subscription</p>
        </div>

        <Card data-testid="card-current-tier">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentTier?.name || "Free Member"}
                  {currentTierPrice > 0 && <Crown className="h-5 w-5 text-primary" />}
                </CardTitle>
                <CardDescription>
                  {currentTier?.price ? `$${currentTier.price}/month` : "Free forever"}
                </CardDescription>
              </div>
              {membership?.status && (
                <Badge variant={membership.status === 'active' ? 'default' : 'secondary'} data-testid="badge-status">
                  {membership.status === 'active' && !isCanceled ? 'Active' : 
                   isCanceled ? 'Canceling' : 
                   membership.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Your Benefits:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5" />
                  <span>{status?.discountPercent || 0}% discount on all purchases</span>
                </li>
                {currentTier?.earlyAccessDays ? (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>{currentTier.earlyAccessDays}-day early access to new releases</span>
                  </li>
                ) : null}
                {currentTier?.exclusiveContentAccess === 1 && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>Access to exclusive content</span>
                  </li>
                )}
                {currentTier?.perks?.map((perk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {membership?.renewsAt && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {isCanceled 
                    ? `Subscription ends on ${new Date(membership.renewsAt).toLocaleDateString()}` 
                    : `Renews on ${new Date(membership.renewsAt).toLocaleDateString()}`}
                </p>
              </div>
            )}

            {membership?.stripeSubscriptionId && !isCanceled && (
              <div className="pt-4">
                <Button 
                  variant="destructive" 
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {availableTiers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Upgrade Your Membership</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {availableTiers.map((tier) => {
                const tierPrice = parseFloat(tier.price);
                const isCurrentTier = currentTier?.id === tier.id;
                const canUpgrade = tierPrice > currentTierPrice;

                return (
                  <Card 
                    key={tier.id} 
                    className={isCurrentTier ? 'border-primary' : ''}
                    data-testid={`card-tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {tier.name}
                          {tierPrice >= 15 && <Star className="h-5 w-5 text-yellow-500" />}
                        </CardTitle>
                        {isCurrentTier && <Badge>Current</Badge>}
                      </div>
                      <CardDescription className="text-2xl font-bold">
                        ${tier.price}
                        <span className="text-base font-normal text-muted-foreground">
                          /{tier.billingCycle}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary mt-0.5" />
                          <span>{tier.discountPercent}% discount on all purchases</span>
                        </li>
                        {tier.earlyAccessDays > 0 && (
                          <li className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary mt-0.5" />
                            <span>{tier.earlyAccessDays}-day early access to new releases</span>
                          </li>
                        )}
                        {tier.exclusiveContentAccess === 1 && (
                          <li className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary mt-0.5" />
                            <span>Access to exclusive content</span>
                          </li>
                        )}
                        {tier.perks?.map((perk, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary mt-0.5" />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isCurrentTier ? (
                        <Button variant="outline" disabled className="w-full">
                          <Check className="mr-2 h-4 w-4" />
                          Current Plan
                        </Button>
                      ) : canUpgrade ? (
                        <Button
                          onClick={() => handleUpgrade(tier.id)}
                          disabled={upgradingTo !== null}
                          className="w-full"
                          data-testid={`button-upgrade-${tier.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {upgradingTo === tier.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            <>Upgrade to {tier.name}</>
                          )}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="w-full">
                          <X className="mr-2 h-4 w-4" />
                          Lower Tier
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
