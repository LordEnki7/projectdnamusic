import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Download, Loader2, Image as ImageIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AlbumCover {
  filename: string;
  displayName: string;
  downloadUrl: string;
  previewUrl: string;
}

export default function AlbumCovers() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: albumCovers, isLoading } = useQuery<AlbumCover[]>({
    queryKey: ["/api/album-covers"],
    enabled: !!user,
  });

  const handleDownload = async (cover: AlbumCover) => {
    try {
      const response = await fetch(cover.downloadUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cover.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${cover.displayName}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download album cover",
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-loading" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Members Only</CardTitle>
            <CardDescription>
              Album covers are exclusive to registered members. Sign up for free to download all album artwork.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => setLocation("/join")} data-testid="button-join">
              Join for Free
            </Button>
            <Button variant="outline" onClick={() => setLocation("/login")} data-testid="button-login">
              Already a Member? Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 font-orbitron bg-gradient-to-r from-chart-3 via-chart-2 to-chart-3 bg-clip-text text-transparent">
            Album Cover Gallery
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Download high-quality album artwork. Available exclusively to registered members.
          </p>
        </div>

        {!albumCovers || albumCovers.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No album covers available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albumCovers.map((cover) => (
              <Card key={cover.filename} className="overflow-hidden hover-elevate" data-testid={`card-album-cover-${cover.filename}`}>
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={cover.previewUrl}
                      alt={cover.displayName}
                      className="w-full h-full object-cover"
                      data-testid={`img-album-cover-${cover.filename}`}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 text-lg" data-testid={`text-album-name-${cover.filename}`}>
                      {cover.displayName}
                    </h3>
                    <Button
                      onClick={() => handleDownload(cover)}
                      className="w-full"
                      data-testid={`button-download-${cover.filename}`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
