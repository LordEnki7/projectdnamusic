import MerchCard from '@/components/MerchCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Merchandise } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export default function Merch() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: merchItems = [], isLoading } = useQuery<Merchandise[]>({
    queryKey: ['/api/merchandise'],
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ merchId, size }: { merchId: string; size?: string }) => {
      const response = await fetch(`/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ merchId, size }),
      });
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      if (data.message === "Item already in cart") {
        toast({
          title: "Already in cart",
          description: "This item is already in your cart!",
        });
      } else {
        toast({
          title: "Added to cart",
          description: "Item added to your cart successfully!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const filteredMerch = merchItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="font-display font-bold text-4xl md:text-5xl">Merchandise</h1>
          <p className="text-lg text-muted-foreground">
            Exclusive Project DNA Music merchandise featuring the iconic DNA strand design.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search merchandise..."
            className="pl-10 h-12 font-display"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-merch"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMerch.map((item) => (
                <MerchCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  description={item.description}
                  price={parseFloat(item.price)}
                  image={item.imageUrl || undefined}
                  videoUrl={item.videoUrl || undefined}
                  sizes={item.sizes || undefined}
                  onAddToCart={(size) => addToCartMutation.mutate({ merchId: item.id, size })}
                  isLoading={addToCartMutation.isPending}
                />
              ))}
            </div>

            {filteredMerch.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  {merchItems.length === 0 
                    ? "No merchandise available yet."
                    : "No merchandise found matching your search."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
