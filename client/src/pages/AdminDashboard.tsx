import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Package, Calendar, User, MessageSquare, DollarSign, RefreshCw, Edit, Trash2, CheckCircle, XCircle, Star, Heart, Music, Radio, ShoppingBag, Plus, Image, Video, Bot, Users, Mic2, Send, Link2, Crown } from "lucide-react";
import AdminAgentHub from "@/components/AdminAgentHub";
import FanPipeline from "@/components/FanPipeline";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
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

interface CampaignStatus {
  status: 'idle' | 'running' | 'done' | 'error';
  total: number; sent: number; failed: number;
  startedAt: string | null; finishedAt: string | null;
  lastError: string | null; contactCount: number;
}

interface FanContact { name: string; email: string; location: string; }
interface ContactsResponse { contacts: FanContact[]; total: number; page: number; pages: number; }

function CampaignTab() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [campaign, setCampaign] = useState<CampaignStatus | null>(null);
  const [followUp, setFollowUp] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFollowUpPreview, setShowFollowUpPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<'send' | 'followup' | 'sequence' | 'funnel' | 'contacts' | 'upload'>('send');
  const pollRef = useRef<number | null>(null);
  const followPollRef = useRef<number | null>(null);

  // Contact list state — using TanStack Query for caching across remounts
  const [contactsPage, setContactsPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // CSV upload state
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPlatform, setUploadPlatform] = useState('generic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cached contacts via TanStack Query — survives tab switching
  const { data: contactsData, isLoading: loadingContacts, refetch: refetchContacts } = useQuery<ContactsResponse>({
    queryKey: ['/api/admin/campaign/contacts', contactsPage, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/campaign/contacts?page=${contactsPage}&limit=50&search=${encodeURIComponent(debouncedSearch)}`,
        { credentials: 'include' }
      );
      if (res.status === 401) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setLocation('/login');
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed to load contacts');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: false,
  });

  const contacts = contactsData?.contacts ?? [];
  const contactsTotal = contactsData?.total ?? 0;
  const contactsPages = contactsData?.pages ?? 1;

  const { data: seqStats, refetch: refetchSeq } = useQuery<{ enrolled: number; steps: { stepIndex: number; subject: string; delayDays: number; sent: number }[] }>({
    queryKey: ['/api/admin/sequence/stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sequence/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 1000 * 60 * 2,
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/campaign/status', { credentials: 'include' });
      if (res.ok) setCampaign(await res.json());
    } catch { /* ignore */ }
  };

  const fetchFollowUpStatus = async () => {
    try {
      const res = await fetch('/api/admin/campaign/followup-status', { credentials: 'include' });
      if (res.ok) setFollowUp(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); fetchFollowUpStatus(); }, []);

  useEffect(() => {
    if (campaign?.status === 'running') {
      pollRef.current = window.setInterval(fetchStatus, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [campaign?.status]);

  useEffect(() => {
    if (followUp?.status === 'running') {
      followPollRef.current = window.setInterval(fetchFollowUpStatus, 2000);
    } else {
      if (followPollRef.current) clearInterval(followPollRef.current);
    }
    return () => { if (followPollRef.current) clearInterval(followPollRef.current); };
  }, [followUp?.status]);

  // Debounce search input so we don't fire on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setContactsPage(1);
  };

  const handleSend = async () => {
    if (!confirm(`This will send the campaign email to all ${campaign?.contactCount ?? 1029} fans. Continue?`)) return;
    setIsSending(true);
    try {
      const res = await apiRequest('POST', '/api/admin/campaign/send', {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      toast({ title: "Campaign started!", description: "Emails are going out in the background." });
      setTimeout(fetchStatus, 1000);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsSending(false); }
  };

  const handleCancel = async () => {
    await apiRequest('POST', '/api/admin/campaign/cancel', {});
    fetchStatus();
  };

  const handleSendFollowUp = async () => {
    if (!confirm(`Send the re-engagement email to all ${followUp?.contactCount ?? 1029} fans? Continue?`)) return;
    setIsSendingFollowUp(true);
    try {
      const res = await apiRequest('POST', '/api/admin/campaign/send-followup', {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      toast({ title: "Follow-up started!", description: "Re-engagement emails going out now." });
      setTimeout(fetchFollowUpStatus, 1000);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setIsSendingFollowUp(false); }
  };

  const handleCancelFollowUp = async () => {
    await apiRequest('POST', '/api/admin/campaign/cancel-followup', {});
    fetchFollowUpStatus();
  };

  const handleEnrollAll = async () => {
    if (!confirm('Enroll all existing users in the welcome email sequence?')) return;
    try {
      const res = await apiRequest('POST', '/api/admin/sequence/enroll-all', {});
      const data = await res.json();
      toast({ title: "Enrolled!", description: data.message });
      refetchSeq();
    } catch {
      toast({ title: "Error", description: "Failed to enroll users", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadStatus(null);
    try {
      const text = await file.text();
      const res = await apiRequest('POST', '/api/admin/campaign/upload-csv', { csvContent: text, platform: uploadPlatform });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      setUploadStatus(`Uploaded successfully — ${data.count} contacts loaded.`);
      toast({ title: "CSV uploaded", description: `${data.count} contacts ready to send.` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaign/contacts'] });
      fetchStatus();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const progress = campaign && campaign.total > 0
    ? Math.round(((campaign.sent + campaign.failed) / campaign.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" /> Fan Email Campaign
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage your fan contact list and send personalized outreach emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-sm ${
            campaign?.status === 'running' ? 'text-yellow-400 border-yellow-400/40' :
            campaign?.status === 'done' ? 'text-green-400 border-green-400/40' :
            campaign?.status === 'error' ? 'text-red-400 border-red-400/40' : 'text-slate-400'
          }`}>
            {campaign?.status === 'running' ? 'Sending…' :
             campaign?.status === 'done' ? 'Completed' :
             campaign?.status === 'error' ? 'Error' : 'Ready'}
          </Badge>
        </div>
      </div>

      {/* Section nav */}
      <div className="flex gap-1 border-b border-slate-800 pb-1 flex-wrap">
        {([
          { key: 'send', label: 'Campaign #1' },
          { key: 'followup', label: 'Follow-Up' },
          { key: 'sequence', label: `Welcome Series (${seqStats?.enrolled ?? 0})` },
          { key: 'funnel', label: 'Funnel Map' },
          { key: 'contacts', label: `Fan List (${campaign?.contactCount ?? 1029})` },
          { key: 'upload', label: 'Upload CSV' },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            data-testid={`button-campaign-section-${s.key}`}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeSection === s.key ? 'text-white border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── SEND SECTION ── */}
      {activeSection === 'send' && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Contacts', value: campaign?.contactCount ?? 1029, color: 'text-white' },
              { label: 'Sent', value: campaign?.sent ?? 0, color: 'text-green-400' },
              { label: 'Failed', value: campaign?.failed ?? 0, color: 'text-red-400' },
              { label: 'Progress', value: `${progress}%`, color: 'text-purple-400' },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress bar when running */}
          {campaign?.status === 'running' && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Sending emails…</span>
                  <span>{campaign.sent + campaign.failed} / {campaign.total}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }} />
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Batches of 50 · ~{Math.ceil(((campaign.total - campaign.sent - campaign.failed) * 0.15) / 60)} min remaining
                </p>
              </CardContent>
            </Card>
          )}

          {campaign?.status === 'done' && (
            <div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30">
              <p className="text-green-400 font-semibold">Campaign complete</p>
              <p className="text-slate-400 text-sm mt-1">
                {campaign.sent} delivered · {campaign.failed} failed
                {campaign.finishedAt && ` · Finished ${new Date(campaign.finishedAt).toLocaleString()}`}
              </p>
            </div>
          )}

          {/* Email preview */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Email Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}
                  data-testid="button-campaign-preview">
                  {showPreview ? 'Hide' : 'Show'}
                </Button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-3"><span className="text-slate-500 w-16 flex-shrink-0">From</span><span className="text-slate-300">Shakim &lt;noreply@projectdnamusic.info&gt;</span></div>
                <div className="flex gap-3"><span className="text-slate-500 w-16 flex-shrink-0">Subject</span><span className="text-slate-300">We stepped into something bigger — come check it out</span></div>
                <div className="flex gap-3"><span className="text-slate-500 w-16 flex-shrink-0">To</span><span className="text-slate-300">{campaign?.contactCount ?? 1029} fans, personalized by first name</span></div>
              </div>
              {showPreview && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-slate-300 space-y-2 leading-relaxed">
                  <p className="text-white font-semibold">Hey [First Name],</p>
                  <p>First off… I just want to say <strong className="text-white">thank you</strong>. For real.</p>
                  <p>Out of all the music out there, you chose to tap in with me — and that means more than you probably know.</p>
                  <p>I've officially built out a new home for everything — music, exclusives, updates, and the full <strong className="text-white">Shakim & Project DNA</strong> experience.</p>
                  <p className="text-purple-400 font-bold">→ projectdnamusic.info</p>
                  <p className="text-slate-500 text-xs mt-2">+ bullet points, CTA button, P.S. about N1M drops</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {campaign?.status !== 'running' ? (
              <Button onClick={handleSend} disabled={isSending}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0 px-8"
                data-testid="button-campaign-send">
                {isSending
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Starting…</>
                  : <><Send className="w-4 h-4 mr-2" />Send to All {campaign?.contactCount ?? 1029} Fans</>}
              </Button>
            ) : (
              <Button onClick={handleCancel} variant="outline" className="border-red-500/50 text-red-400"
                data-testid="button-campaign-cancel">Stop Campaign</Button>
            )}
            <Button variant="ghost" onClick={fetchStatus} size="sm" data-testid="button-campaign-refresh">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
          <p className="text-slate-600 text-xs">
            Emails send in background — batches of 50, short delays between each. You can navigate away safely.
          </p>
        </div>
      )}

      {/* ── FOLLOW-UP SECTION ── */}
      {activeSection === 'followup' && (() => {
        const fuProgress = followUp && followUp.total > 0
          ? Math.round(((followUp.sent + followUp.failed) / followUp.total) * 100) : 0;
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-white font-semibold mb-1">Re-Engagement Email</h3>
              <p className="text-slate-400 text-sm">For fans who didn't click your first campaign. A softer re-touch that makes it simple to tap in.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Contacts', value: followUp?.contactCount ?? 1029, color: 'text-white' },
                { label: 'Sent', value: followUp?.sent ?? 0, color: 'text-green-400' },
                { label: 'Failed', value: followUp?.failed ?? 0, color: 'text-red-400' },
                { label: 'Progress', value: `${fuProgress}%`, color: 'text-purple-400' },
              ].map(stat => (
                <Card key={stat.label}><CardContent className="pt-4 pb-4 text-center">
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
                </CardContent></Card>
              ))}
            </div>

            {followUp?.status === 'running' && (
              <Card><CardContent className="pt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Sending follow-up…</span>
                  <span>{followUp.sent + followUp.failed} / {followUp.total}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${fuProgress}%` }} />
                </div>
              </CardContent></Card>
            )}
            {followUp?.status === 'done' && (
              <div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30">
                <p className="text-green-400 font-semibold">Follow-up complete</p>
                <p className="text-slate-400 text-sm mt-1">{followUp.sent} delivered · {followUp.failed} failed{followUp.finishedAt && ` · ${new Date(followUp.finishedAt).toLocaleString()}`}</p>
              </div>
            )}

            <Card><CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Email Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowFollowUpPreview(!showFollowUpPreview)}>
                  {showFollowUpPreview ? 'Hide' : 'Show'}
                </Button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-3"><span className="text-slate-500 w-16 flex-shrink-0">Subject</span><span className="text-slate-300">Hey, I wanted to reach back out real quick…</span></div>
                <div className="flex gap-3"><span className="text-slate-500 w-16 flex-shrink-0">To</span><span className="text-slate-300">{followUp?.contactCount ?? 1029} fans from N1M list</span></div>
              </div>
              {showFollowUpPreview && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-slate-300 space-y-2 leading-relaxed">
                  <p className="text-white font-semibold">Hey [First Name],</p>
                  <p>I wanted to reach back out real quick… I sent you something the other day about the new Project DNA home, but I know how life gets — things get missed.</p>
                  <p className="text-cyan-400 font-bold">→ projectdnamusic.info</p>
                  <p>Exclusive music · Early drops · Behind-the-scenes</p>
                  <p className="italic text-slate-500 text-xs">P.S. When you land on the site… don't just listen — join the list.</p>
                </div>
              )}
            </CardContent></Card>

            <div className="flex items-center gap-3 flex-wrap">
              {followUp?.status !== 'running' ? (
                <Button onClick={handleSendFollowUp} disabled={isSendingFollowUp}
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white border-0 px-8"
                  data-testid="button-followup-send">
                  {isSendingFollowUp ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Starting…</> : <><Send className="w-4 h-4 mr-2" />Send Follow-Up to All {followUp?.contactCount ?? 1029} Fans</>}
                </Button>
              ) : (
                <Button onClick={handleCancelFollowUp} variant="outline" className="border-red-500/50 text-red-400">Stop</Button>
              )}
              <Button variant="ghost" onClick={fetchFollowUpStatus} size="sm"><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            </div>
          </div>
        );
      })()}

      {/* ── WELCOME SEQUENCE SECTION ── */}
      {activeSection === 'sequence' && (
        <div className="space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">5-Email Welcome Series</h3>
              <p className="text-slate-400 text-sm">Automatically sent to every new signup. Builds relationship over 7 days — trust, story, offer, VIP.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleEnrollAll} data-testid="button-sequence-enroll-all">
              Enroll Existing Users
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{seqStats?.enrolled ?? 0}</p>
              <p className="text-slate-400 text-xs mt-1">Users Enrolled</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">{seqStats?.steps?.reduce((a, s) => a + s.sent, 0) ?? 0}</p>
              <p className="text-slate-400 text-xs mt-1">Total Emails Sent</p>
            </CardContent></Card>
          </div>

          <Card><CardContent className="pt-5 space-y-3">
            <h4 className="text-white font-semibold text-sm mb-3">Email Steps</h4>
            {(seqStats?.steps ?? [
              { stepIndex: 0, subject: 'Welcome…', delayDays: 0, sent: 0 },
              { stepIndex: 1, subject: 'I want you to hear something a little deeper…', delayDays: 1, sent: 0 },
              { stepIndex: 2, subject: 'Let me tell you something real…', delayDays: 3, sent: 0 },
              { stepIndex: 3, subject: "If you've been rocking with what I'm doing…", delayDays: 5, sent: 0 },
              { stepIndex: 4, subject: "You've been tapped in for a minute now…", delayDays: 7, sent: 0 },
            ]).map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{step.subject}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{step.delayDays === 0 ? 'Sent immediately' : `Day ${step.delayDays}`}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-green-400 text-sm font-semibold">{step.sent}</p>
                  <p className="text-slate-600 text-xs">sent</p>
                </div>
              </div>
            ))}
          </CardContent></Card>
          <p className="text-slate-600 text-xs">The scheduler checks every 15 minutes. New signups are enrolled automatically. Use "Enroll Existing Users" to backfill accounts that signed up before this feature was added.</p>
        </div>
      )}

      {/* ── FUNNEL MAP SECTION ── */}
      {activeSection === 'funnel' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-1">Fan Conversion Funnel</h3>
            <p className="text-slate-400 text-sm">Your complete N1M → loyal supporter pipeline — 7 stages, simple and effective.</p>
          </div>
          {[
            { stage: 1, label: 'N1M — Attention', Icon: Radio, iconColor: 'text-slate-400', color: 'border-slate-600', desc: 'Message fans · Build curiosity · No links yet', action: null },
            { stage: 2, label: 'Engagement', Icon: MessageSquare, iconColor: 'text-blue-400', color: 'border-blue-500/40', desc: 'Ask questions · Talk about music · Make it personal', action: null },
            { stage: 3, label: 'Conversion — Move Them', Icon: Link2, iconColor: 'text-purple-400', color: 'border-purple-500/40', desc: 'Send them to projectdnamusic.info — exclusive, deeper, not on N1M', action: 'Campaign #1 + Follow-Up' },
            { stage: 4, label: 'Capture — Get Email', Icon: Mail, iconColor: 'text-cyan-400', color: 'border-cyan-500/40', desc: 'Fan signs up → enters the welcome sequence automatically', action: 'Welcome Series' },
            { stage: 5, label: 'Nurture — Build Trust', Icon: Music, iconColor: 'text-green-400', color: 'border-green-500/40', desc: 'Music · Story · Connection over 7 days (5 emails)', action: 'Welcome Series' },
            { stage: 6, label: 'Monetize — First Sale', Icon: DollarSign, iconColor: 'text-yellow-400', color: 'border-yellow-500/40', desc: 'Email 4: soft offer — music, merch, bundle', action: 'Email 4 (day 5)' },
            { stage: 7, label: 'Loyalty — The Gold', Icon: Crown, iconColor: 'text-orange-400', color: 'border-orange-500/40', desc: 'VIP circle · Early access · Repeat buyers · Promoters', action: 'Email 5 (day 7)' },
          ].map((s, i) => (
            <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${s.color} bg-slate-900/40`}>
              <div className={`mt-0.5 flex-shrink-0 ${s.iconColor}`}><s.Icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-mono">STAGE {s.stage}</span>
                  <span className="text-white font-semibold text-sm">{s.label}</span>
                  {s.action && <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-xs">{s.action}</Badge>}
                </div>
                <p className="text-slate-400 text-sm mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30">
            <p className="text-purple-300 font-semibold text-sm">The simple flow</p>
            <p className="text-slate-400 text-sm mt-1">N1M → Conversation → Website → Email Capture → Welcome Series → Offer → VIP → Repeat</p>
            <p className="text-slate-500 text-xs mt-2">1,029 fans can become 100 real supporters + consistent income + momentum</p>
          </div>
        </div>
      )}

      {/* ── CONTACTS SECTION ── */}
      {activeSection === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text" placeholder="Search by name, email, or city…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              data-testid="input-campaign-search"
              className="flex-1 min-w-48 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            <span className="text-slate-400 text-sm">{contactsTotal} contacts</span>
            <a
              href="/api/admin/campaign/export.csv"
              download="n1m_fan_contacts.csv"
              data-testid="link-export-contacts"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-green-500/40 text-green-400 hover:text-green-300 hover:border-green-400/60 transition-colors"
            >
              ↓ Export All CSV
            </a>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-slate-400 font-medium px-4 py-3">#</th>
                      <th className="text-left text-slate-400 font-medium px-4 py-3">Name</th>
                      <th className="text-left text-slate-400 font-medium px-4 py-3">Email</th>
                      <th className="text-left text-slate-400 font-medium px-4 py-3">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingContacts ? (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-500">Loading…</td></tr>
                    ) : contacts.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-500">No contacts found</td></tr>
                    ) : contacts.map((c, i) => (
                      <tr key={c.email} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        data-testid={`row-contact-${i}`}>
                        <td className="px-4 py-3 text-slate-500">{(contactsPage - 1) * 50 + i + 1}</td>
                        <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-slate-300">{c.email}</td>
                        <td className="px-4 py-3 text-slate-400">{c.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {contactsPages > 1 && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setContactsPage(p => p - 1)}
                disabled={contactsPage <= 1} data-testid="button-contacts-prev">← Prev</Button>
              <span className="text-slate-400 text-sm">Page {contactsPage} of {contactsPages}</span>
              <Button variant="ghost" size="sm" onClick={() => setContactsPage(p => p + 1)}
                disabled={contactsPage >= contactsPages} data-testid="button-contacts-next">Next →</Button>
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD SECTION ── */}
      {activeSection === 'upload' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <h3 className="text-white font-semibold mb-1">Import Fan List from Another Platform</h3>
                <p className="text-slate-400 text-sm">Upload any CSV — new contacts are added, duplicates skipped automatically.</p>
              </div>

              {/* Platform preset selector */}
              <div className="space-y-2">
                <p className="text-slate-300 text-xs font-medium uppercase tracking-wider">Platform / Source</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'generic', label: 'Generic / N1M', hint: 'Name, Email, Location' },
                    { id: 'bandcamp', label: 'Bandcamp', hint: 'Name, Email, Country' },
                    { id: 'patreon', label: 'Patreon', hint: 'Full Name, Email, Status' },
                    { id: 'distrokid', label: 'DistroKid', hint: 'First, Last, Email, Country' },
                    { id: 'mailchimp', label: 'Mailchimp', hint: 'Fname, Lname, Email' },
                    { id: 'yahoo', label: 'Yahoo Contacts', hint: 'First Name, Last Name, Email, City/State/Country' },
                    { id: 'google', label: 'Google Contacts', hint: 'First Name, Last Name, E-mail 1 - Value' },
                    { id: 'generic', label: 'Other / Auto-detect', hint: 'Any CSV with Email column' },
                  ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id && x.label === p.label) === i).map(preset => (
                    <button
                      key={preset.id + preset.label}
                      onClick={() => setUploadPlatform(preset.id)}
                      data-testid={`button-platform-${preset.id}`}
                      className={`text-left p-3 rounded-lg border text-sm transition-colors ${uploadPlatform === preset.id && preset.label !== 'Other / Auto-detect'
                        ? 'border-purple-500/60 bg-purple-900/30 text-white'
                        : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-600'}`}
                    >
                      <div className="font-medium text-inherit">{preset.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{preset.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover-elevate cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-csv-upload-area">
                <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium mb-1">Click to select a CSV file</p>
                <p className="text-slate-500 text-sm">Platform: <span className="text-purple-400 font-medium capitalize">{uploadPlatform}</span> — columns auto-mapped</p>
                <input
                  ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={handleFileUpload} data-testid="input-csv-file"
                />
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Parsing and importing contacts…
                </div>
              )}
              {uploadStatus && (
                <div className="p-3 rounded-lg bg-green-950/30 border border-green-500/30">
                  <p className="text-green-400 text-sm">{uploadStatus}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {[
                  { platform: 'Bandcamp', cols: 'Name, Email, Country, ...' },
                  { platform: 'Patreon', cols: 'Full Name, Email, Status, ...' },
                  { platform: 'DistroKid', cols: 'First Name, Last Name, Email, ...' },
                  { platform: 'Mailchimp', cols: 'First Name, Last Name, Email Address, ...' },
                  { platform: 'Yahoo Contacts', cols: 'First Name, Middle Name, Last Name, Company, Job Title, Email, Home Email, Work Email, ..., Home City, Home State, ..., Home Country, ...' },
                  { platform: 'Google Contacts', cols: 'First Name, Middle Name, Last Name, ..., E-mail 1 - Label, E-mail 1 - Value, Phone 1 - Label, Phone 1 - Value, ...' },
                ].map(({ platform, cols }) => (
                  <div key={platform} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <span className="text-purple-400 font-medium">{platform}:</span>
                    <span className="text-slate-500 ml-1">{cols}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-slate-600 text-xs">
            Uploading a new CSV replaces the current list for future campaigns. Previous send history is preserved.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

  // Radio tracks (MP3 rotation)
  const { data: radioTracksList = [] } = useQuery<{id: number, title: string, artist: string, audioUrl: string, duration: number, isActive: number, position: number}[]>({
    queryKey: ['/api/radio/tracks'], enabled: isAdmin,
  });
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackDuration, setNewTrackDuration] = useState('');
  const addTrackMutation = useMutation({
    mutationFn: (d: {title: string, artist: string, audioUrl: string, duration: number}) => apiRequest('POST', '/api/admin/radio/tracks', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/radio/tracks'] });
      setNewTrackTitle(''); setNewTrackArtist(''); setNewTrackUrl(''); setNewTrackDuration('');
      toast({ title: 'Track added to DNA Radio rotation' });
    },
  });
  const toggleTrackMutation = useMutation({
    mutationFn: ({id, isActive}: {id: number, isActive: number}) => apiRequest('PATCH', `/api/admin/radio/tracks/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/radio/tracks'] }),
  });
  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/radio/tracks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/radio/tracks'] }); toast({ title: 'Track removed' }); },
  });

  // Radio bumpers
  const { data: radioBumpersList = [] } = useQuery<{id: number, title: string, audioUrl: string, isActive: number}[]>({
    queryKey: ['/api/radio/bumpers'], enabled: isAdmin,
  });
  const [newBumperTitle, setNewBumperTitle] = useState('');
  const [newBumperUrl, setNewBumperUrl] = useState('');
  const addBumperMutation = useMutation({
    mutationFn: (d: {title: string, audioUrl: string}) => apiRequest('POST', '/api/admin/radio/bumpers', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/radio/bumpers'] }); setNewBumperTitle(''); setNewBumperUrl(''); toast({ title: 'Bumper added' }); },
  });
  const toggleBumperMutation = useMutation({
    mutationFn: ({id, isActive}: {id: number, isActive: number}) => apiRequest('PATCH', `/api/admin/radio/bumpers/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/radio/bumpers'] }),
  });
  const deleteBumperMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/radio/bumpers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/radio/bumpers'] }),
  });

  // Song requests
  const { data: songRequestsList = [] } = useQuery<{id: number, fanName: string, songTitle: string, artist: string | null, message: string | null, status: string, createdAt: string}[]>({
    queryKey: ['/api/admin/song-requests'], enabled: isAdmin,
  });
  const updateSongRequestMutation = useMutation({
    mutationFn: ({id, status}: {id: number, status: string}) => apiRequest('PATCH', `/api/admin/song-requests/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/song-requests'] }); toast({ title: 'Request updated' }); },
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
        <div className="relative flex flex-col items-center gap-6">
          <Link href="/">
            <AnimatedLogo className="h-20 w-auto cursor-pointer" />
          </Link>
          <div className="text-center">
            <h1 className="font-display font-bold text-4xl md:text-5xl mb-2" data-testid="heading-admin-dashboard">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage content, orders, fan engagement, and site settings</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await logout(); setLocation('/login'); }}
            data-testid="button-admin-signout"
            className="absolute top-0 right-0 flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="engagement" data-testid="tab-engagement">Engagement</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline" className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Pipeline
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
          {/* ===== RADIO TRACKS (MP3 ROTATION) ===== */}
          <Card className="border-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-cyan-400" />
                DNA Radio Tracks
                <Badge variant="outline" className="ml-auto text-cyan-400 border-cyan-500/40">
                  {radioTracksList.filter(t => t.isActive).length} active
                </Badge>
              </CardTitle>
              <CardDescription>
                MP3 tracks that play in the DNA Radio rotation. Add a public URL or a path like <code className="text-cyan-400">/media/radio/yourfile.mp3</code> for files you upload to the server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input placeholder="Track title (e.g. Champions)" value={newTrackTitle}
                  onChange={e => setNewTrackTitle(e.target.value)} data-testid="input-track-title" />
                <Input placeholder="Artist (default: Shakim & Project DNA)" value={newTrackArtist}
                  onChange={e => setNewTrackArtist(e.target.value)} data-testid="input-track-artist" />
                <Input placeholder="Audio URL or /media/radio/filename.mp3" value={newTrackUrl}
                  onChange={e => setNewTrackUrl(e.target.value)} data-testid="input-track-url" className="sm:col-span-2" />
                <Input placeholder="Duration in seconds (e.g. 203)" value={newTrackDuration}
                  onChange={e => setNewTrackDuration(e.target.value)} data-testid="input-track-duration" type="number" />
                <Button
                  onClick={() => {
                    if (!newTrackTitle || !newTrackUrl) return;
                    addTrackMutation.mutate({
                      title: newTrackTitle,
                      artist: newTrackArtist || 'Shakim & Project DNA',
                      audioUrl: newTrackUrl,
                      duration: parseInt(newTrackDuration) || 240,
                    });
                  }}
                  disabled={!newTrackTitle || !newTrackUrl || addTrackMutation.isPending}
                  data-testid="button-add-radio-track"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add to Rotation
                </Button>
              </div>
              {radioTracksList.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No tracks yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {radioTracksList.map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500 w-5 text-right flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 truncate">{t.artist} &bull; {Math.floor(t.duration / 60)}:{String(t.duration % 60).padStart(2, '0')}</p>
                      </div>
                      <Badge variant={t.isActive ? 'default' : 'outline'} className="flex-shrink-0">
                        {t.isActive ? 'On Air' : 'Off'}
                      </Badge>
                      <Button size="sm" variant="outline"
                        onClick={() => toggleTrackMutation.mutate({ id: t.id, isActive: t.isActive ? 0 : 1 })}
                        data-testid={`button-toggle-track-${t.id}`}>
                        {t.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => deleteTrackMutation.mutate(t.id)}
                        data-testid={`button-delete-track-${t.id}`}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== RADIO BUMPERS ===== */}
          <Card className="border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic2 className="h-5 w-5 text-purple-400" />
                Station Bumpers
              </CardTitle>
              <CardDescription>
                Short audio clips that play between every 3 songs on DNA Radio and My Station. Paste a public audio URL (MP3/WAV).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Bumper title (e.g. DNA Radio Station ID)" value={newBumperTitle}
                  onChange={e => setNewBumperTitle(e.target.value)} data-testid="input-bumper-title"
                  className="flex-1 min-w-[160px]" />
                <Input placeholder="Audio URL (https://...)" value={newBumperUrl}
                  onChange={e => setNewBumperUrl(e.target.value)} data-testid="input-bumper-url"
                  className="flex-1 min-w-[220px]" />
                <Button
                  onClick={() => { if (newBumperTitle && newBumperUrl) addBumperMutation.mutate({ title: newBumperTitle, audioUrl: newBumperUrl }); }}
                  disabled={!newBumperTitle || !newBumperUrl || addBumperMutation.isPending}
                  data-testid="button-add-bumper"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Bumper
                </Button>
              </div>
              {radioBumpersList.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No bumpers yet. Add one above.</p>
              ) : (
                <div className="space-y-2">
                  {radioBumpersList.map(b => (
                    <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800">
                      <Mic2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.title}</p>
                        <p className="text-xs text-slate-500 truncate">{b.audioUrl}</p>
                      </div>
                      <Badge variant={b.isActive ? 'default' : 'outline'} className="flex-shrink-0">
                        {b.isActive ? 'Active' : 'Off'}
                      </Badge>
                      <Button size="sm" variant="outline"
                        onClick={() => toggleBumperMutation.mutate({ id: b.id, isActive: b.isActive ? 0 : 1 })}
                        data-testid={`button-toggle-bumper-${b.id}`}>
                        {b.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="icon" variant="ghost"
                        onClick={() => deleteBumperMutation.mutate(b.id)}
                        data-testid={`button-delete-bumper-${b.id}`}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== SONG REQUESTS ===== */}
          <Card className="border-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-cyan-400" />
                Song Requests
                {songRequestsList.filter(r => r.status === 'pending').length > 0 && (
                  <Badge className="ml-2">{songRequestsList.filter(r => r.status === 'pending').length} new</Badge>
                )}
              </CardTitle>
              <CardDescription>Fan song requests submitted from the Radio page.</CardDescription>
            </CardHeader>
            <CardContent>
              {songRequestsList.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {songRequestsList.slice().reverse().map(r => (
                    <div key={r.id} data-testid={`song-request-${r.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-800">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{r.fanName}</p>
                          <span className="text-slate-500 text-xs">→</span>
                          <p className="text-sm text-purple-300">"{r.songTitle}"</p>
                          {r.artist && <span className="text-slate-500 text-xs">by {r.artist}</span>}
                        </div>
                        {r.message && <p className="text-xs text-slate-400 mt-1 italic">"{r.message}"</p>}
                        <p className="text-xs text-slate-600 mt-0.5">{r.createdAt?.slice(0, 10)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={r.status === 'pending' ? 'default' : r.status === 'played' ? 'outline' : 'secondary'}>
                          {r.status}
                        </Badge>
                        {r.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline"
                              onClick={() => updateSongRequestMutation.mutate({ id: r.id, status: 'played' })}
                              data-testid={`button-request-played-${r.id}`}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />Played
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => updateSongRequestMutation.mutate({ id: r.id, status: 'declined' })}
                              data-testid={`button-request-decline-${r.id}`}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <CampaignTab />
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
