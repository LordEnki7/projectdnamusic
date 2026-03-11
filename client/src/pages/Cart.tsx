import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface CartItem {
  id: string;
  songId: string | null;
  merchId: string | null;
  beatId: string | null;
  itemType: string;
  quantity: number;
  size: string | null;
  title: string;
  artist: string | null;
  album: string | null;
  description: string | null;
  bpm: number | null;
  musicKey: string | null;
  genre: string | null;
  price: string;
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: cartItems = [], isLoading } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to remove from cart');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item from cart",
        variant: "destructive",
      });
    },
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const memberDiscount = user ? subtotal * 0.15 : 0;
  const discountedSubtotal = subtotal - memberDiscount;
  const tax = discountedSubtotal * 0.08;
  const total = discountedSubtotal + tax;

  const handleRemoveItem = (id: string) => {
    removeFromCartMutation.mutate(id);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }
    
    const hasBeats = cartItems.some(item => item.itemType === 'beat');
    if (hasBeats) {
      setLocation('/beat-licensing');
    } else {
      setLocation('/checkout');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-8">Shopping Cart</h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl">Shopping Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <Card className="p-12 text-center space-y-6">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-2xl">Your cart is empty</h2>
              <p className="text-muted-foreground">
                Add some music or merchandise to get started!
              </p>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/music">
                <Button className="font-display" data-testid="button-browse-music">
                  Browse Music
                </Button>
              </Link>
              <Link href="/merch">
                <Button variant="outline" className="font-display" data-testid="button-browse-merch">
                  Browse Merch
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4" data-testid={`cart-item-${item.id}`}>
                  <div className="flex gap-4 items-start">
                    <div className="h-20 w-20 rounded bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-bold text-primary/50">
                        {item.itemType === 'merch' ? 'MERCH' : item.itemType === 'beat' ? 'BEAT' : 'DNA'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-display font-semibold text-lg" data-testid={`text-cart-item-name-${item.id}`}>
                          {item.title}
                        </h3>
                        {item.itemType === 'song' ? (
                          <>
                            {item.artist && <p className="text-sm text-muted-foreground">{item.artist}</p>}
                            {item.album && <p className="text-sm text-muted-foreground">{item.album}</p>}
                          </>
                        ) : item.itemType === 'beat' ? (
                          <>
                            {item.bpm && <p className="text-sm text-muted-foreground">{item.bpm} BPM</p>}
                            {item.genre && <p className="text-sm text-muted-foreground">{item.genre}</p>}
                          </>
                        ) : (
                          <>
                            {item.description && <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>}
                            {item.size && <p className="text-sm text-muted-foreground">Size: {item.size}</p>}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-display font-bold" data-testid={`text-cart-item-price-${item.id}`}>
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removeFromCartMutation.isPending}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div>
              <Card className="p-6 space-y-6 sticky top-20">
                <h2 className="font-display font-bold text-2xl">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display" data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
                  </div>
                  {user && memberDiscount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span className="font-semibold">Member Discount (15%)</span>
                      <span className="font-display font-semibold" data-testid="text-member-discount">-${memberDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-display" data-testid="text-tax">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="font-display font-bold text-xl">Total</span>
                    <span className="font-display font-bold text-2xl" data-testid="text-total">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full font-display"
                  onClick={handleCheckout}
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Secure checkout powered by Stripe</p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
