import { ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useRef } from 'react';

interface MerchCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  videoUrl?: string;
  sizes?: string[];
  onAddToCart: (size?: string) => void;
  isLoading?: boolean;
}

export default function MerchCard({ id, name, description, price, image, videoUrl, sizes, onAddToCart, isLoading }: MerchCardProps) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizes?.[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleAddToCart = () => {
    if (sizes && sizes.length > 0) {
      setDialogOpen(true);
    } else {
      onAddToCart(undefined);
    }
  };

  const handleConfirmAddToCart = () => {
    onAddToCart(selectedSize);
    setDialogOpen(false);
  };

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => console.log('Merch video play failed:', err));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-merch-${id}`}>
      <div className="aspect-square relative bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={image}
            muted
            playsInline
            className="w-full h-full object-cover transition-opacity duration-300"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label={name}
          />
        ) : image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl font-display font-bold text-primary/30">MERCH</div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-lg" data-testid={`text-merch-name-${id}`}>
            {name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-merch-desc-${id}`}>
            {description}
          </p>
        </div>

        {sizes && sizes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {sizes.map((size) => (
              <Badge key={size} variant="outline" className="text-xs">
                {size}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="font-display font-bold text-xl" data-testid={`text-merch-price-${id}`}>
            ${price.toFixed(2)}
          </span>
          
          {sizes && sizes.length > 0 ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  data-testid={`button-add-merch-${id}`}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Size</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map((size) => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "default" : "outline"}
                        onClick={() => setSelectedSize(size)}
                        data-testid={`button-size-${size}`}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={handleConfirmAddToCart}
                    disabled={isLoading || !selectedSize}
                    className="w-full"
                    data-testid="button-confirm-add-cart"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              onClick={handleAddToCart}
              disabled={isLoading}
              data-testid={`button-add-merch-${id}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
