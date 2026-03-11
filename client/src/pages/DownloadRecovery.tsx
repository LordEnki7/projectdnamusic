import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseItem {
  songId: number | null;
  beatId: number | null;
  itemType: string;
  title: string;
  audioUrl: string | null;
}

export default function DownloadRecovery() {
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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

  const handleRecover = async () => {
    if (!paymentIntentId.trim()) {
      toast({
        title: "Payment Intent Required",
        description: "Please enter your payment intent ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-details/${paymentIntentId.trim()}`);
      
      if (!response.ok) {
        throw new Error('Purchase not found');
      }

      const data = await response.json();
      const digitalItems = data.items.filter((item: PurchaseItem) => 
        item.itemType === 'song' || item.itemType === 'beat'
      );

      if (digitalItems.length === 0) {
        toast({
          title: "No Downloads Found",
          description: "This purchase doesn't contain any digital downloads.",
        });
      } else {
        setItems(digitalItems);
        toast({
          title: "Downloads Found!",
          description: `Found ${digitalItems.length} download${digitalItems.length > 1 ? 's' : ''} for your purchase.`,
        });
      }
    } catch (error) {
      toast({
        title: "Recovery Failed",
        description: "Unable to find downloads for this payment. Please check your payment intent ID or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (audioUrl: string, title: string, item: PurchaseItem) => {
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

      toast({ title: "Preparing Download", description: `Getting ${title} ready...` });

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
      toast({
        title: "Download Failed",
        description: error.message || 'Unable to download the file. Please try again.',
        variant: "destructive",
      });
    } finally {
      setDownloadingItems(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!paymentIntentId) return;
    if (downloadingItems.has('zip')) return;

    try {
      setDownloadingItems(prev => new Set(prev).add('zip'));

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

      toast({ title: "Preparing Album", description: "Packaging your songs, this may take a moment..." });

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
      toast({
        title: "Download Failed",
        description: error.message || 'Unable to download the album.',
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display font-bold text-3xl">Download Recovery</h1>
          <p className="text-muted-foreground">
            Recover your downloads using your Stripe payment intent ID
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Intent ID</label>
            <div className="flex gap-2">
              <Input
                value={paymentIntentId}
                onChange={(e) => setPaymentIntentId(e.target.value)}
                placeholder="pi_xxxxxxxxxxxxx"
                data-testid="input-payment-intent"
              />
              <Button
                onClick={handleRecover}
                disabled={loading}
                data-testid="button-recover"
              >
                {loading ? 'Searching...' : 'Recover'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can find this in your Stripe receipt email or payment confirmation.
            </p>
          </div>

          {items.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl">Your Downloads</h2>
                {items.length > 1 && (
                  <Button
                    onClick={handleDownloadAll}
                    variant="default"
                    size="sm"
                    disabled={downloadingItems.has('zip')}
                    data-testid="button-download-all-recovery"
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
                {items.map((item, index) => (
                  <div 
                    key={`${item.itemType}-${item.songId || item.beatId}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                    data-testid={`download-item-${index}`}
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.itemType === 'song' ? 'Song' : 'Beat'}
                      </p>
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
        </div>

        <div className="border-t pt-4 space-y-2 text-center text-sm text-muted-foreground">
          <p>
            Can't find your payment intent ID? Check your Stripe receipt email or contact{' '}
            <a href="mailto:support@projectdnamusic.info" className="text-primary hover:underline">
              support@projectdnamusic.info
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
