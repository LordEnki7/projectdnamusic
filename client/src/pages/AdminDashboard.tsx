import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Package, Calendar, User, MessageSquare, DollarSign, RefreshCw, Edit, Trash2, CheckCircle, XCircle, Star, Heart, Music, Radio, ShoppingBag, Plus, Image, Video, Bot, Users } from "lucide-react";
import AdminAgentHub from "@/components/AdminAgentHub";
import FanPipeline from "@/components/FanPipeline";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AnimatedLogo from "@/components/AnimatedLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSongSchema, insertBeatSchema, insertMerchandiseSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface Order {
  id: string;
  email: string;
  subtotal: string;
  shippingCost: string;
  tax: string;
  total: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    title: string;
    itemType: string;
    price: string;
    quantity: number;
  }>;
}

interface ArtistMessage {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  videoUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  active: number;
  featured: number;
  createdAt: string;
}

interface FanWallMessage {
  id: string;
  userId: string | null;
  username: string;
  message: string;
  songId: string | null;
  songTitle: string | null;
  dedicatedTo: string | null;
  reaction: string | null;
  approved: number;
  featured: number;
  createdAt: string;
}

const songFormSchema = insertSongSchema.extend({
  trackNumber: z.coerce.number().min(1, "Track number must be at least 1"),
  duration: z.coerce.number().optional(),
  price: z.string().regex(/^\d+\.?\d{0,2}$/, "Price must be a valid number").default("0.99"),
  featured: z.coerce.number().optional(),
});

const beatFormSchema = insertBeatSchema.extend({
  bpm: z.coerce.number().min(1, "BPM must be at least 1"),
  price: z.string().regex(/^\d+\.?\d{0,2}$/, "Price must be a valid number").default("29.99"),
});

const merchFormSchema = insertMerchandiseSchema.extend({
  price: z.string().regex(/^\d+\.?\d{0,2}$/, "Price must be a valid number").default("19.99"),
  sizes: z.string().optional(),
});

type SongFormData = z.infer<typeof songFormSchema>;
type BeatFormData = z.infer<typeof beatFormSchema>;
type MerchFormData = z.infer<typeof merchFormSchema>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recoverEmail, setRecoverEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  const ADMIN_EMAIL = 'support@projectdnamusic.info';
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  const songForm = useForm<SongFormData>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      title: "",
      artist: "Shakim & Project DNA",
      album: "The Great Attractor",
      trackNumber: 1,
      audioUrl: "",
      duration: undefined,
      price: "0.99",
      featured: 0,
    },
  });

  const beatForm = useForm<BeatFormData>({
    resolver: zodResolver(beatFormSchema),
    defaultValues: {
      title: "",
      bpm: 140,
      musicKey: "Am",
      genre: "Hip Hop",
      audioUrl: "",
      price: "29.99",
    },
  });

  const merchForm = useForm<MerchFormData>({
    resolver: zodResolver(merchFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "19.99",
      imageUrl: undefined,
      sizes: undefined,
      category: undefined,
    },
  });

  const { data: contactMessages = [], isLoading: loadingMessages } = useQuery<ContactMessage[]>({
    queryKey: ['/api/admin/contact-messages'],
    enabled: isAdmin,
  });

  const { data: allOrders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['/api/admin/orders'],
    enabled: isAdmin,
  });

  const { data: artistMessages = [], isLoading: loadingArtistMessages } = useQuery<ArtistMessage[]>({
    queryKey: ['/api/admin/artist-messages'],
    enabled: isAdmin,
  });

  const { data: fanWallMessages = [], isLoading: loadingFanWallMessages } = useQuery<FanWallMessage[]>({
    queryKey: ['/api/admin/fan-wall'],
    enabled: isAdmin,
  });

  const toggleArtistMessageMutation = useMutation({
    mutationFn: async ({id, active}: {id: string, active: boolean}) => {
      return apiRequest('PATCH', `/api/admin/artist-messages/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/artist-messages'] });
      toast({ title: "Updated", description: "Artist message updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update artist message", variant: "destructive" });
    }
  });

  const approveFanWallMutation = useMutation({
    mutationFn: async ({id, approved}: {id: string, approved: boolean}) => {
      return apiRequest('PATCH', `/api/admin/fan-wall/${id}`, { approved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fan-wall'] });
      toast({ title: "Updated", description: "Fan message updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update fan message", variant: "destructive" });
    }
  });

  const { data: contentComments = [], isLoading: loadingContentComments } = useQuery<{id: string, userId: string, username: string, entityType: string, entityId: string, body: string, createdAt: string}[]>({
    queryKey: ['/api/admin/content-comments'],
    enabled: isAdmin,
  });

  const deleteContentCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest('DELETE', `/api/content-comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-comments'] });
      toast({ title: "Deleted", description: "Comment deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
    }
  });

  const addSongMutation = useMutation({
    mutationFn: async (data: SongFormData) => {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to add song");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
      toast({ title: "Success!", description: "Song added successfully to your music store" });
      songForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add song", variant: "destructive" });
    },
  });

  const addBeatMutation = useMutation({
    mutationFn: async (data: BeatFormData) => {
      const response = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to add beat");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beats'] });
      toast({ title: "Success!", description: "Beat added successfully to your producer catalog" });
      beatForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add beat", variant: "destructive" });
    },
  });

  const addMerchMutation = useMutation({
    mutationFn: async (data: MerchFormData) => {
      const sizesArray = data.sizes ? data.sizes.split(',').map(s => s.trim()).filter(s => s) : null;
      const response = await fetch("/api/merchandise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: data.price,
          imageUrl: data.imageUrl || null,
          sizes: sizesArray,
          category: data.category || null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to add merchandise");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merchandise'] });
      toast({ title: "Success!", description: "Merchandise added successfully to your store" });
      merchForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add merchandise", variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="font-display font-bold text-4xl md:text-5xl">Admin Dashboard</h1>
          <p className="text-muted-foreground">Please log in to access the admin dashboard</p>
          <Link href="/login">
            <Button data-testid="button-login">Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="font-display font-bold text-4xl md:text-5xl">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access this page</p>
          <Link href="/">
            <Button data-testid="button-home">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRecoverOrder = async () => {
    if (!recoverEmail || !recoverEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsRecovering(true);
    try {
      const result = await apiRequest('POST', '/api/admin/recover-order', { customerEmail: recoverEmail }) as unknown as { message: string };
      toast({
        title: "Recovery Complete",
        description: result.message,
      });
      setRecoverEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    } catch (error: any) {
      toast({
        title: "Recovery Failed",
        description: error.message || "Could not recover order",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const onSongSubmit = (data: SongFormData) => {
    addSongMutation.mutate(data);
  };

  const onBeatSubmit = (data: BeatFormData) => {
    addBeatMutation.mutate(data);
  };

  const onMerchSubmit = (data: MerchFormData) => {
    addMerchMutation.mutate(data);
  };

  const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
  const pendingFanMessages = fanWallMessages.filter(m => m.approved === 0).length;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col items-center gap-6">
          <Link href="/">
            <AnimatedLogo className="h-20 w-auto cursor-pointer" />
          </Link>
          <div className="text-center">
            <h1 className="font-display font-bold text-4xl md:text-5xl mb-2" data-testid="heading-admin-dashboard">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage content, orders, fan engagement, and site settings</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">Add Content</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="engagement" data-testid="tab-engagement">Engagement</TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline" className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Fan Pipeline
            </TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents" className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              AI Agents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allOrders.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contactMessages.length}</div>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Order Recovery Tool
            </CardTitle>
            <CardDescription>
              Recover lost orders when customers leave the confirmation page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If a customer completed payment but didn't receive their order confirmation email or download links,
              enter their email address below to recover the order from Stripe and send the confirmation.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="customer@example.com"
                value={recoverEmail}
                onChange={(e) => setRecoverEmail(e.target.value)}
                disabled={isRecovering}
                data-testid="input-recover-email"
              />
              <Button 
                onClick={handleRecoverOrder} 
                disabled={isRecovering || !recoverEmail}
                data-testid="button-recover-order"
              >
                {isRecovering ? 'Recovering...' : 'Recover Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Tabs defaultValue="songs" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="songs" className="gap-2">
                  <Music className="h-4 w-4" />
                  Add Song
                </TabsTrigger>
                <TabsTrigger value="beats" className="gap-2">
                  <Radio className="h-4 w-4" />
                  Add Beat
                </TabsTrigger>
                <TabsTrigger value="merch" className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Add Merch
                </TabsTrigger>
              </TabsList>

              <TabsContent value="songs">
                <Card>
                  <CardHeader>
                    <CardTitle>Song Details</CardTitle>
                    <CardDescription>
                      Fill in the information for your new song. Audio file should be uploaded to attached_assets folder first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...songForm}>
                      <form onSubmit={songForm.handleSubmit(onSongSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={songForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Song Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter song title" {...field} data-testid="input-song-title" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={songForm.control}
                            name="trackNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Track Number *</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="1" {...field} data-testid="input-track-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={songForm.control}
                            name="artist"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Artist</FormLabel>
                                <FormControl>
                                  <Input placeholder="Artist name" {...field} data-testid="input-artist" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={songForm.control}
                            name="album"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Album</FormLabel>
                                <FormControl>
                                  <Input placeholder="Album name" {...field} data-testid="input-album" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={songForm.control}
                          name="audioUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audio File Path *</FormLabel>
                              <FormControl>
                                <Input placeholder="/attached_assets/your-song.wav" {...field} data-testid="input-audio-url" />
                              </FormControl>
                              <FormDescription>
                                Upload your audio file to the attached_assets folder first, then enter the path here
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={songForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (seconds)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="180" {...field} data-testid="input-duration" />
                                </FormControl>
                                <FormDescription>Optional - length in seconds</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={songForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price ($)</FormLabel>
                                <FormControl>
                                  <Input placeholder="0.99" {...field} data-testid="input-price" />
                                </FormControl>
                                <FormDescription>Price in dollars</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={songForm.control}
                          name="featured"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Featured Song</FormLabel>
                                <FormDescription>Mark this song as featured to highlight it</FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value === 1}
                                  onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                  data-testid="switch-featured"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" size="lg" className="w-full" disabled={addSongMutation.isPending} data-testid="button-add-song">
                          <Plus className="h-5 w-5 mr-2" />
                          {addSongMutation.isPending ? "Adding Song..." : "Add Song to Store"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="beats">
                <Card>
                  <CardHeader>
                    <CardTitle>Beat Details</CardTitle>
                    <CardDescription>
                      Fill in the information for your new beat. Audio file should be uploaded to attached_assets folder first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...beatForm}>
                      <form onSubmit={beatForm.handleSubmit(onBeatSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={beatForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Beat Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter beat title" {...field} data-testid="input-beat-title" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={beatForm.control}
                            name="bpm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>BPM *</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="140" {...field} data-testid="input-bpm" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={beatForm.control}
                            name="musicKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Key *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Am" {...field} data-testid="input-music-key" />
                                </FormControl>
                                <FormDescription>e.g., Am, Dm, C#m</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={beatForm.control}
                            name="genre"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Genre *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Hip Hop" {...field} data-testid="input-genre" />
                                </FormControl>
                                <FormDescription>e.g., Hip Hop, Trap, R&B</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={beatForm.control}
                          name="audioUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audio File Path *</FormLabel>
                              <FormControl>
                                <Input placeholder="/attached_assets/your-beat.wav" {...field} data-testid="input-beat-audio-url" />
                              </FormControl>
                              <FormDescription>
                                Upload your audio file to the attached_assets folder first, then enter the path here
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={beatForm.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input placeholder="29.99" {...field} data-testid="input-beat-price" />
                              </FormControl>
                              <FormDescription>Price in dollars</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" size="lg" className="w-full" disabled={addBeatMutation.isPending} data-testid="button-add-beat">
                          <Plus className="h-5 w-5 mr-2" />
                          {addBeatMutation.isPending ? "Adding Beat..." : "Add Beat to Producer Catalog"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="merch">
                <Card>
                  <CardHeader>
                    <CardTitle>Merchandise Details</CardTitle>
                    <CardDescription>
                      Fill in the information for your new merchandise item. Upload images to attached_assets folder first.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...merchForm}>
                      <form onSubmit={merchForm.handleSubmit(onMerchSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={merchForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter product name" {...field} data-testid="input-merch-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={merchForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., T-Shirt, Hoodie, Hat" {...field} value={field.value || ""} data-testid="input-merch-category" />
                                </FormControl>
                                <FormDescription>Optional product category</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={merchForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Describe the product" {...field} data-testid="input-merch-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={merchForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price ($)</FormLabel>
                                <FormControl>
                                  <Input placeholder="19.99" {...field} data-testid="input-merch-price" />
                                </FormControl>
                                <FormDescription>Price in dollars</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={merchForm.control}
                            name="sizes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Available Sizes</FormLabel>
                                <FormControl>
                                  <Input placeholder="S, M, L, XL" {...field} value={field.value || ""} data-testid="input-merch-sizes" />
                                </FormControl>
                                <FormDescription>Optional, comma-separated</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={merchForm.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="/attached_assets/your-image.jpg" {...field} value={field.value || ""} data-testid="input-merch-image" />
                              </FormControl>
                              <FormDescription>Upload image to attached_assets folder first</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" size="lg" className="w-full" disabled={addMerchMutation.isPending} data-testid="button-add-merch">
                          <Plus className="h-5 w-5 mr-2" />
                          {addMerchMutation.isPending ? "Adding Merchandise..." : "Add Merchandise to Store"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Production Service Inquiries
            </CardTitle>
            <CardDescription>
              Client messages from the contact form
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
              </div>
            ) : contactMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No inquiries yet
              </div>
            ) : (
              <div className="space-y-4">
                {contactMessages.map((msg) => (
                  <Card key={msg.id} data-testid={`inquiry-${msg.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-lg">{msg.subject}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {msg.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {msg.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                          data-testid={`button-reply-${msg.id}`}
                        >
                          <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}>
                            Reply
                          </a>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {msg.message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>
              Latest customer purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
              </div>
            ) : allOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders yet
              </div>
            ) : (
              <div className="space-y-4">
                {allOrders.slice(0, 10).map((order) => (
                  <Card key={order.id} data-testid={`order-${order.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-base font-mono">
                            #{order.id.substring(0, 8)}
                          </CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {order.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-2">
                            {order.status}
                          </Badge>
                          <div className="text-lg font-bold">${order.total}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.title} ({item.itemType}) x{item.quantity}
                            </span>
                            <span className="font-medium">${parseFloat(item.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Artist Messages
            </CardTitle>
            <CardDescription>
              Manage homepage messages from Shakim
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingArtistMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
              </div>
            ) : artistMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No artist messages yet
              </div>
            ) : (
              <div className="space-y-4">
                {artistMessages.map((msg) => (
                  <Card key={msg.id} data-testid={`artist-message-${msg.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-lg">{msg.title}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(msg.createdAt)}
                            </span>
                            <Badge variant={msg.active ? "default" : "outline"}>
                              {msg.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          variant={msg.active ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleArtistMessageMutation.mutate({ id: msg.id, active: !msg.active })}
                          data-testid={`button-toggle-artist-message-${msg.id}`}
                        >
                          {msg.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {msg.message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comment Moderation
            </CardTitle>
            <CardDescription>
              Review and delete comments on songs and videos ({contentComments.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingContentComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
              </div>
            ) : contentComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comments yet
              </div>
            ) : (
              <div className="space-y-3">
                {contentComments.slice(0, 30).map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid={`admin-comment-${comment.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{comment.username}</span>
                        <Badge variant="outline" className="text-xs">
                          {comment.entityType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{comment.body}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteContentCommentMutation.mutate(comment.id)}
                      data-testid={`button-delete-admin-comment-${comment.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Fan Wall Moderation
            </CardTitle>
            <CardDescription>
              Review and approve fan messages ({pendingFanMessages} pending)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFanWallMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
              </div>
            ) : fanWallMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No fan wall messages yet
              </div>
            ) : (
              <div className="space-y-4">
                {fanWallMessages.slice(0, 20).map((msg) => (
                  <Card key={msg.id} data-testid={`fan-wall-message-${msg.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{msg.username}</CardTitle>
                            <Badge variant={msg.approved ? "default" : "outline"}>
                              {msg.approved ? "Approved" : "Pending"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {msg.songTitle && (
                              <span className="flex items-center gap-1">
                                Dedicated to song: {msg.songTitle}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!msg.approved && (
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={() => approveFanWallMutation.mutate({ id: msg.id, approved: true })}
                              data-testid={`button-approve-fan-message-${msg.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {msg.approved && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => approveFanWallMutation.mutate({ id: msg.id, approved: false })}
                              data-testid={`button-unapprove-fan-message-${msg.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Unapprove
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {msg.message}
                      </p>
                      {msg.dedicatedTo && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Dedicated to: {msg.dedicatedTo}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" /> Fan Pipeline — N1M Conversion System
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Track N1M fans, draft messages, generate campaign links, and run AI agents that work the pipeline every day automatically.
              </p>
            </div>
            <FanPipeline />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <AdminAgentHub />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
