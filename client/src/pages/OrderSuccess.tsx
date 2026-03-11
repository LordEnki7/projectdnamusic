import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Download, Package, Loader2 } from 'lucide-react';
import { Link, useLocation, useSearch } from 'wouter';
import { useEffect, useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

interface PurchaseItem {
  songId: number | null;
  merchId: number | null;
  beatId: number | null;
  itemType: string;
  quantity: number;
  size: string | null;
  title: string;
  price: string;
  audioUrl: string | null;
  imageUrl: string | null;
}

interface PurchaseDetails {
  items: PurchaseItem[];
  subtotal: string;
  shippingCost: string;
  tax: string;
  total: string;
  paymentIntentId: string;
}

export default function OrderSuccess() {
  const search = useSearch();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const id = params.get('payment_intent');
    setPaymentIntentId(id);

    // Try to create order in background (for record keeping)
    if (id) {
      apiRequest('POST', '/api/orders', { paymentIntentId: id })
        .then(() => {
          setOrderCreated(true);
          queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        })
        .catch((err) => {
          console.log('Order creation handled by webhook or already exists:', err);
          setOrderCreated(true);
        });
    }
  }, [search]);

  const { data: purchaseDetails, isLoading, error } = useQuery<PurchaseDetails>({
    queryKey: ['/api/purchase-details', paymentIntentId],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-details/${paymentIntentId}`);
      if (!response.ok) {
        throw new Error('Failed to load purchase details');
      }
      return response.json();
    },
    enabled: !!paymentIntentId,
  });

  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleDownload = async (audioUrl: string, title: string, item: PurchaseItem) => {
    const { toast } = await import('@/hooks/use-toast');
    const itemId = item.songId || item.beatId;
    if (!itemId || !paymentIntentId) return;

    const key = String(itemId);
    if (downloadingItems.has(key)) return;

    try {
      setDownloadingItems(prev => new Set(prev).add(key));

      // Check download status first
      const statusResponse = await fetch(`/api/download-status/${paymentIntentId}/${itemId}`);
      const statusData = await statusResponse.json();

      if (!statusData.canDownload) {
        toast({
          title: "Download Limit Reached",
          description: `You've already downloaded this ${statusData.downloadLimit} times.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Preparing Download",
        description: `Getting ${title} ready...`,
      });

      // Fetch the file as a blob — reliable across all browsers
      const response = await fetch(`/api/secure-download/${paymentIntentId}/${itemId}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const filename = audioUrl.split('/').pop() || `${title}.mp3`;
      triggerBlobDownload(blob, filename);

      toast({
        title: "Download Started",
        description: `${title} is downloading. ${statusData.remaining - 1 > 0 ? `${statusData.remaining - 1} download${statusData.remaining - 1 !== 1 ? 's' : ''} remaining.` : 'Last download used.'}`,
      });
    } catch (error: any) {
      const { toast: t } = await import('@/hooks/use-toast');
      t({
        title: "Download Failed",
        description: error.message || 'Unable to download the file. Please try again.',
        variant: "destructive",
      });
    } finally {
      setDownloadingItems(prev => {
        const next = new Set(prev);
        next.delete(String(itemId));
        return next;
      });
    }
  };

  const handleDownloadAll = async () => {
    const { toast } = await import('@/hooks/use-toast');
    if (!paymentIntentId) return;

    const key = 'zip';
    if (downloadingItems.has(key)) return;

    try {
      setDownloadingItems(prev => new Set(prev).add(key));

      // Check ZIP download status first
      const statusResponse = await fetch(`/api/download-all-status/${paymentIntentId}`);
      const statusData = await statusResponse.json();

      if (!statusData.canDownload) {
        toast({
          title: "Download Limit Reached",
          description: `You've already downloaded the full album ${statusData.downloadLimit} times.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Preparing Album",
        description: "Packaging your songs, this may take a moment...",
      });

      // Fetch ZIP as a blob — reliable across all browsers
      const response = await fetch(`/api/secure-download-all/${paymentIntentId}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
      triggerBlobDownload(blob, 'project-dna-music.zip');

      toast({
        title: "Download Started",
        description: `Your album is downloading. ${statusData.remaining - 1 > 0 ? `${statusData.remaining - 1} download${statusData.remaining - 1 !== 1 ? 's' : ''} remaining.` : 'Last download used.'}`,
      });
    } catch (error: any) {
      const { toast: t } = await import('@/hooks/use-toast');
      t({
        title: "Download Failed",
        description: error.message || 'Unable to download the album. Please try again.',
        variant: "destructive",
      });
    } finally {
      setDownloadingItems(prev => {
        const next = new Set(prev);
        next.delete('zip');
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="max-w-2xl w-full p-8 text-center space-y-6">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <h2 className="font-display font-bold text-2xl">Loading your purchase...</h2>
          <p className="text-muted-foreground">Please wait a moment.</p>
        </Card>
      </div>
    );
  }

  if (error || !purchaseDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="max-w-2xl w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="w-16 h-16 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-bold text-3xl">Unable to Load Purchase</h1>
            <p className="text-muted-foreground">
              We couldn't load your purchase details. Please contact support with your payment confirmation.
            </p>
          </div>
          <Link href="/">
            <Button className="w-full">Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const digitalItems = purchaseDetails.items.filter(item => item.itemType === 'song' || item.itemType === 'beat');
  const merchItems = purchaseDetails.items.filter(item => item.itemType === 'merch');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle className="w-16 h-16 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2 text-center">
          <h1 className="font-display font-bold text-3xl">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
        </div>

        {digitalItems.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl">Your Downloads</h2>
              {digitalItems.length > 1 && (
                <Button
                  onClick={handleDownloadAll}
                  variant="default"
                  size="sm"
                  disabled={downloadingItems.has('zip')}
                  data-testid="button-download-all"
                >
                  {downloadingItems.has('zip') ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  {downloadingItems.has('zip') ? 'Preparing...' : 'Download All as ZIP'}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {digitalItems.map((item, index) => (
                <div 
                  key={`${item.itemType}-${item.songId || item.beatId}-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                  data-testid={`download-item-${index}`}
                >
                  <div className="flex items-center gap-4">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.itemType === 'song' ? 'Song' : 'Beat'} • ${item.price}
                      </p>
                    </div>
                  </div>
                  {item.audioUrl && (
                    <Button
                      onClick={() => handleDownload(item.audioUrl!, item.title, item)}
                      variant="default"
                      size="sm"
                      disabled={downloadingItems.has(String(item.songId || item.beatId))}
                      data-testid={`button-download-${index}`}
                    >
                      {downloadingItems.has(String(item.songId || item.beatId)) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {downloadingItems.has(String(item.songId || item.beatId)) ? 'Downloading...' : 'Download'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {merchItems.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="font-display font-bold text-xl">Merchandise</h2>
            <div className="space-y-3">
              {merchItems.map((item, index) => (
                <div 
                  key={`merch-${item.merchId}-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  data-testid={`merch-item-${index}`}
                >
                  <div className="flex items-center gap-4">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.size && `Size: ${item.size} • `}Qty: {item.quantity} • ${item.price}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Your merchandise will be shipped to the address provided during checkout.
            </p>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>${purchaseDetails.subtotal}</span>
          </div>
          {parseFloat(purchaseDetails.shippingCost) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping:</span>
              <span>${purchaseDetails.shippingCost}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax:</span>
            <span>${purchaseDetails.tax}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span>${purchaseDetails.total}</span>
          </div>
        </div>

        <div className="space-y-3 pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            A confirmation email will be sent shortly.
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              View your order history in <Link href="/orders" className="text-primary hover:underline">My Orders</Link>.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@projectdnamusic.info" className="text-primary hover:underline" data-testid="link-order-success-support">
              support@projectdnamusic.info
            </a>
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Link href="/music" className="flex-1">
            <Button variant="outline" className="w-full" data-testid="button-continue-shopping">
              Continue Shopping
            </Button>
          </Link>
          {user ? (
            <Link href="/orders" className="flex-1">
              <Button className="w-full" data-testid="button-view-orders">
                View Orders
              </Button>
            </Link>
          ) : (
            <Link href="/" className="flex-1">
              <Button className="w-full" data-testid="button-home">
                Back to Home
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
