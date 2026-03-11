import { ShoppingCart, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

interface ProducerServiceCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export default function ProducerServiceCard({ 
  id, 
  title, 
  description, 
  price, 
  features,
  popular = false 
}: ProducerServiceCardProps) {
  const [, setLocation] = useLocation();
  
  const handlePurchase = () => {
    const params = new URLSearchParams({
      service: title,
      price: price.toString()
    });
    setLocation(`/contact?${params.toString()}`);
  };

  return (
    <Card className="p-6 space-y-4 hover-elevate relative" data-testid={`card-service-${id}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 font-display" data-testid="badge-popular">
          <Zap className="h-3 w-3 mr-1" />
          Popular
        </Badge>
      )}
      
      <div className="space-y-2">
        <h3 className="font-display font-bold text-2xl" data-testid={`text-service-title-${id}`}>
          {title}
        </h3>
        <p className="text-muted-foreground" data-testid={`text-service-desc-${id}`}>
          {description}
        </p>
      </div>

      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-3xl" data-testid={`text-service-price-${id}`}>
            ${price}
          </span>
        </div>
        <Button 
          className="w-full font-display" 
          size="lg"
          onClick={handlePurchase}
          data-testid={`button-purchase-service-${id}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase Service
        </Button>
      </div>
    </Card>
  );
}
