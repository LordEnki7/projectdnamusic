import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { ArrowLeft, Package, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertShippingAddressSchema, insertBeatLicenseSchema, type ShippingAddress } from '@shared/schema';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

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

interface CartItem {
  id: string;
  itemType: string;
  merchId: string | null;
  beatId: string | null;
  title: string;
  price: string;
}

const shippingFormSchema = insertShippingAddressSchema
  .omit({ sessionId: true, userId: true })
  .extend({
    email: z.string().email("Invalid email address"),
    zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
  });

const beatLicenseFormSchema = z.object({
  beatId: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  artistName: z.string().optional(),
  licenseType: z.string().default("non-exclusive"),
  signature: z.string().min(1, "Signature is required"),
  termsAccepted: z.literal(1, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;
type BeatLicenseFormData = z.infer<typeof beatLicenseFormSchema>;

const CheckoutForm = ({ shippingData }: { shippingData: ShippingFormData | null }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error("Stripe not loaded yet");
      return;
    }

    setIsProcessing(true);

    try {
      // Submit the payment elements to validate and collect billing details
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: "Validation Error",
          description: submitError.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
      });

      if (error) {
        console.error("Payment error:", error);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Payment exception:", err);
      toast({
        title: "Payment Failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[200px]">
        <PaymentElement 
          options={{
            defaultValues: {
              billingDetails: shippingData ? {
                email: shippingData.email,
                name: shippingData.fullName,
              } : undefined
            }
          }}
          onReady={() => {
            console.log("✅ PaymentElement is ready");
            setIsReady(true);
          }}
          onLoadError={(errorEvent) => {
            console.error("❌ PaymentElement failed to load - Full error:", errorEvent);
            const error = errorEvent.error;
            console.error("  - Error type:", error?.type);
            console.error("  - Error code:", error?.code);
            console.error("  - Error message:", error?.message);
            
            toast({
              title: "Payment Form Error",
              description: error?.message || "Failed to load payment form. Please refresh and try again.",
              variant: "destructive",
            });
          }}
        />
      </div>
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation('/cart')}
          className="flex-1"
          data-testid="button-back-to-cart"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !isReady || isProcessing}
          className="flex-1"
          data-testid="button-pay"
        >
          {isProcessing ? 'Processing...' : !isReady ? 'Loading...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
  const [beatLicenseData, setBeatLicenseData] = useState<Record<string, BeatLicenseFormData>>({});
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cartItems = [], isLoading: cartLoading } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
  });

  const { data: existingShippingAddress, isLoading: shippingLoading } = useQuery<ShippingAddress | null>({
    queryKey: ['/api/shipping-address'],
    enabled: cartItems.some(item => item.itemType === 'merch'),
  });

  const hasMerch = cartItems.some(item => item.itemType === 'merch');
  const beats = cartItems.filter(item => item.itemType === 'beat');
  const hasBeats = beats.length > 0;
  const allBeatsLicensed = hasBeats ? beats.every(beat => beatLicenseData[beat.beatId!]) : true;

  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
    },
  });

  const handleShippingSubmit = async (data: ShippingFormData) => {
    try {
      console.log("Shipping form submitted with data:", data);
      
      // Validate cart isn't empty before proceeding
      if (cartItems.length === 0) {
        toast({
          title: "Cart is Empty",
          description: "Your cart is empty. Please add items before checking out.",
          variant: "destructive",
        });
        setLocation('/cart');
        return;
      }
      
      setShippingData(data);
      setShowPayment(true);
      console.log("showPayment set to true");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save shipping information",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (existingShippingAddress && !shippingData && hasMerch) {
      const addressData: ShippingFormData = {
        fullName: existingShippingAddress.fullName,
        email: existingShippingAddress.email,
        phone: existingShippingAddress.phone || '',
        addressLine1: existingShippingAddress.addressLine1,
        addressLine2: existingShippingAddress.addressLine2 || '',
        city: existingShippingAddress.city,
        state: existingShippingAddress.state,
        zipCode: existingShippingAddress.zipCode,
        country: existingShippingAddress.country,
      };
      setShippingData(addressData);
      setShowPayment(true);
    }
  }, [existingShippingAddress, shippingData, hasMerch]);

  useEffect(() => {
    console.log("🔍 CHECKOUT DEBUG - useEffect triggered");
    console.log("  - hasMerch:", hasMerch);
    console.log("  - showPayment:", showPayment);
    console.log("  - allBeatsLicensed:", allBeatsLicensed);
    console.log("  - cartItems.length:", cartItems.length);
    console.log("  - shippingData:", shippingData ? "present" : "null");
    
    const shouldShowPayment = 
      allBeatsLicensed && 
      (!hasMerch || (hasMerch && showPayment));
    
    console.log("  - shouldShowPayment:", shouldShowPayment);
    
    if (shouldShowPayment && cartItems.length > 0) {
      console.log("✅ Creating payment intent...");
      const requestBody: any = {};
      
      if (hasMerch && shippingData) {
        console.log("  - Adding shipping address to request");
        requestBody.shippingAddress = shippingData;
      }
      
      if (hasBeats && Object.keys(beatLicenseData).length > 0) {
        console.log("  - Adding beat licenses to request");
        requestBody.beatLicenses = Object.entries(beatLicenseData).map(([beatId, data]) => ({
          ...data,
          beatId
        }));
      }
      
      console.log("  - Request body keys:", Object.keys(requestBody));
      
      apiRequest("POST", "/api/create-payment-intent", requestBody)
        .then((res) => res.json())
        .then((data) => {
          console.log("✅ Payment intent response:", data);
          if (data.clientSecret) {
            console.log("✅ Client secret received, showing payment form");
            setClientSecret(data.clientSecret);
          } else {
            console.error("❌ No client secret in response:", data);
            throw new Error(data.error || 'No client secret received');
          }
        })
        .catch((error) => {
          console.error("❌ Payment intent creation failed:", error);
          toast({
            title: "Payment Error",
            description: error.message || "Failed to initialize checkout. Please try again.",
            variant: "destructive",
          });
          setLocation('/cart');
        });
    } else if (!shouldShowPayment) {
      console.log("⏸️ Not ready to show payment yet");
    } else if (cartItems.length === 0) {
      console.error("❌ Cart is empty, cannot create payment intent");
    }
  }, [toast, setLocation, hasMerch, hasBeats, showPayment, shippingData, beatLicenseData, allBeatsLicensed, cartItems]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to your cart before checking out.",
        variant: "destructive",
      });
      setLocation('/cart');
    }
  }, [cartItems, cartLoading, toast, setLocation]);

  if (cartLoading || (hasMerch && shippingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" aria-label="Loading"/>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show beat licensing form if cart has beats and not all licensed
  if (hasBeats && !allBeatsLicensed) {
    const unlicensedBeat = beats.find(beat => !beatLicenseData[beat.beatId!]);
    if (!unlicensedBeat) return null;

    const BeatLicenseForm = () => {
      const beatForm = useForm<BeatLicenseFormData>({
        resolver: zodResolver(beatLicenseFormSchema),
        defaultValues: {
          beatId: unlicensedBeat.beatId!,
          fullName: '',
          email: '',
          artistName: '',
          licenseType: 'non-exclusive',
          signature: '',
          termsAccepted: 0 as any,
        },
      });

      const handleBeatLicenseSubmit = async (data: BeatLicenseFormData) => {
        setBeatLicenseData(prev => ({
          ...prev,
          [unlicensedBeat.beatId!]: data
        }));
      };

      return (
        <div className="min-h-screen py-12 px-4">
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <h1 className="font-display font-bold text-4xl md:text-5xl">Beat License Agreement</h1>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                License required for: {unlicensedBeat.title}
              </p>
            </div>

            <Card className="p-6">
              <Form {...beatForm}>
                <form onSubmit={beatForm.handleSubmit(handleBeatLicenseSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={beatForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Legal Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-beat-license-full-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={beatForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-beat-license-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={beatForm.control}
                    name="artistName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Artist/Stage Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} data-testid="input-beat-license-artist-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={beatForm.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Electronic Signature (Type your full name)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Type your full legal name" data-testid="input-beat-license-signature" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 bg-muted rounded-md space-y-2">
                    <h3 className="font-semibold">License Terms (Non-Exclusive)</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>You may use this beat for recording and distribution</li>
                      <li>Credit must be given to the producer</li>
                      <li>Beat may be sold to other artists (non-exclusive)</li>
                      <li>You retain ownership of your recorded work</li>
                    </ul>
                  </div>

                  <FormField
                    control={beatForm.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === 1}
                            onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                            data-testid="checkbox-beat-license-terms"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I agree to the license terms and conditions
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation('/cart')}
                      className="flex-1"
                      data-testid="button-back-to-cart"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Cart
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      data-testid="button-continue-beat-license"
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      );
    };

    return <BeatLicenseForm />;
  }

  // Show shipping form if cart has merch and shipping not yet provided
  if (hasMerch && !showPayment) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl">Shipping Information</h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              We need your shipping address for merchandise delivery
            </p>
          </div>

          <Card className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleShippingSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-full-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address-line-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} data-testid="input-address-line-2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-zip-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} disabled data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/cart')}
                    className="flex-1"
                    data-testid="button-back-to-cart"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Cart
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid="button-continue-to-payment"
                  >
                    Continue to Payment
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" aria-label="Loading"/>
          <p className="text-muted-foreground">Preparing checkout...</p>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    loader: 'auto' as const,
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl">Checkout</h1>
          <p className="text-muted-foreground mt-2">Complete your purchase securely</p>
        </div>

        {hasMerch && shippingData && (
          <Card className="p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">Shipping to:</p>
                <p className="text-sm text-muted-foreground">
                  {shippingData.fullName}<br/>
                  {shippingData.addressLine1}
                  {shippingData.addressLine2 && `, ${shippingData.addressLine2}`}<br/>
                  {shippingData.city}, {shippingData.state} {shippingData.zipCode}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPayment(false);
                  setClientSecret("");
                }}
                data-testid="button-edit-shipping"
              >
                Edit
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm shippingData={shippingData} />
          </Elements>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>🔒 Secure checkout powered by Stripe</p>
        </div>
      </div>
    </div>
  );
}
