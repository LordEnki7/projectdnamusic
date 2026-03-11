import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, DollarSign, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface OrderItem {
  id: string;
  orderId: string;
  songId: string | null;
  merchId: string | null;
  beatId: string | null;
  itemType: string;
  title: string;
  price: string;
  quantity: number;
  size: string | null;
  audioUrl: string | null;
}

interface Order {
  id: string;
  userId: string | null;
  sessionId: string;
  email: string;
  subtotal: string;
  shippingCost: string;
  tax: string;
  total: string;
  status: string;
  stripePaymentIntentId: string | null;
  shippingAddressId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderHistory() {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="font-display font-bold text-4xl md:text-5xl">Order History</h1>
          <p className="text-muted-foreground">Please log in to view your orders</p>
          <Link href="/login">
            <Button data-testid="button-login">Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-8">Order History</h1>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-2" data-testid="heading-order-history">
            Order History
          </h1>
          <p className="text-muted-foreground">View your past purchases</p>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-display text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
            <Link href="/music">
              <Button data-testid="button-shop-now">Shop Now</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="p-6" data-testid={`order-${order.id}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-xl" data-testid={`order-id-${order.id}`}>
                        Order #{order.id.slice(0, 8)}
                      </h3>
                      <Badge variant="default" data-testid={`order-status-${order.id}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span data-testid={`order-date-${order.id}`}>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-display font-bold text-2xl" data-testid={`order-total-${order.id}`}>
                        ${parseFloat(order.total).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between gap-4 py-3 border-t"
                      data-testid={`order-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold" data-testid={`item-title-${item.id}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {item.itemType === 'song' && 'Song'}
                            {item.itemType === 'beat' && 'Beat'}
                            {item.itemType === 'merch' && `Merch${item.size ? ` (${item.size})` : ''}`}
                          </Badge>
                          {item.quantity > 1 && (
                            <span>Qty: {item.quantity}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold" data-testid={`item-price-${item.id}`}>
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </p>
                        {item.audioUrl && (item.itemType === 'song' || item.itemType === 'beat') && (
                          <a 
                            href={item.audioUrl} 
                            download 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-download-${item.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span data-testid={`order-subtotal-${order.id}`}>
                      ${parseFloat(order.subtotal).toFixed(2)}
                    </span>
                  </div>
                  {parseFloat(order.shippingCost) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span data-testid={`order-shipping-${order.id}`}>
                        ${parseFloat(order.shippingCost).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax:</span>
                    <span data-testid={`order-tax-${order.id}`}>
                      ${parseFloat(order.tax).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span data-testid={`order-final-total-${order.id}`}>
                      ${parseFloat(order.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
