import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Music, Video, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExclusiveContentItem {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  contentUrl: string;
  thumbnailUrl: string | null;
  releaseDate: string;
}

export default function ExclusiveContent() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: content, isLoading } = useQuery<ExclusiveContentItem[]>({
    queryKey: ["/api/exclusive-content"],
    enabled: !!user,
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              This content is exclusive to fan club members
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => setLocation("/join")} data-testid="button-join">
              Join the Fan Club
            </Button>
            <Button variant="outline" onClick={() => setLocation("/login")} data-testid="button-login">
              Already a Member? Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getContentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'music':
        return <Music className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Exclusive Content</h1>
          <p className="text-muted-foreground">
            Welcome {user.username}! Enjoy your member-only content
          </p>
          {user.signupDiscount > 0 && (
            <Badge className="mt-4" variant="default">
              You have {user.signupDiscount}% off your next purchase!
            </Badge>
          )}
        </div>

        {!content || content.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No exclusive content available yet. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {content.map((item) => (
              <Card key={item.id} className="overflow-hidden hover-elevate" data-testid={`card-content-${item.id}`}>
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {getContentIcon(item.contentType)}
                    <Badge variant="secondary">{item.contentType}</Badge>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  {item.description && (
                    <CardDescription>{item.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => window.open(item.contentUrl, '_blank')}
                    data-testid={`button-view-${item.id}`}
                  >
                    View Content
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
