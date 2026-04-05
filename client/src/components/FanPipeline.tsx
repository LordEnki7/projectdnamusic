import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Radio, MessageSquare, Link2, BarChart3, Plus, Copy, Zap,
  Star, TrendingUp, AlertCircle, CheckCircle, Loader2, ExternalLink,
  ChevronDown, ChevronUp, RefreshCw, Send, UserPlus, Eye, Trash2
} from "lucide-react";
import type { Fan, CampaignLink, FanDailyReport } from "@shared/schema";

const STAGES = [
  { value: "cold_follower", label: "Cold Follower", color: "bg-slate-500" },
  { value: "contacted", label: "Contacted", color: "bg-blue-500" },
  { value: "engaged", label: "Engaged", color: "bg-indigo-500" },
  { value: "qualified", label: "Qualified", color: "bg-violet-500" },
  { value: "clicked", label: "Clicked", color: "bg-amber-500" },
  { value: "captured", label: "Captured", color: "bg-orange-500" },
  { value: "converted", label: "Converted", color: "bg-green-500" },
  { value: "loyal_supporter", label: "Loyal Supporter", color: "bg-emerald-600" },
  { value: "inactive", label: "Inactive", color: "bg-red-500" },
];

function getStageInfo(stage: string) {
  return STAGES.find(s => s.value === stage) || { value: stage, label: stage, color: "bg-slate-400" };
}

function getScoreBand(score: number) {
  if (score >= 100) return { label: "VIP", color: "text-emerald-400" };
  if (score >= 61) return { label: "High Value", color: "text-green-400" };
  if (score >= 31) return { label: "Engaged", color: "text-amber-400" };
  if (score >= 11) return { label: "Warming", color: "text-blue-400" };
  return { label: "Low Intent", color: "text-slate-400" };
}

// ─── Fan Card ─────────────────────────────────────────────────────────────────

function FanCard({ fan, onDraftMessage, onLogInteraction }: {
  fan: Fan;
  onDraftMessage: (fanId: string) => void;
  onLogInteraction: (fan: Fan) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const stageInfo = getStageInfo(fan.stage);
  const scoreBand = getScoreBand(fan.leadScore);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/fans/${fan.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fans"] });
      toast({ title: "Fan removed" });
    },
  });

  return (
    <Card className="border border-purple-500/20 bg-black/40" data-testid={`card-fan-${fan.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
              {(fan.username || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-white">{fan.username || fan.displayName || "Unknown"}</div>
              <div className="text-xs text-slate-400">{fan.city ? `${fan.city}` : ""}{fan.city && fan.country ? ", " : ""}{fan.country || ""}</div>
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full text-white ${stageInfo.color}`}>
              {stageInfo.label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`font-bold text-lg ${scoreBand.color}`}>{fan.leadScore}</div>
              <div className="text-xs text-slate-500">{scoreBand.label}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setExpanded(!expanded)} data-testid={`button-expand-fan-${fan.id}`}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-purple-500/10 pt-3">
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              {fan.email && <div><span className="text-slate-500">Email: </span>{fan.email}</div>}
              {fan.phone && <div><span className="text-slate-500">Phone: </span>{fan.phone}</div>}
              {fan.favoriteSong && <div><span className="text-slate-500">Fav song: </span>{fan.favoriteSong}</div>}
              {fan.sourcePlatform && <div><span className="text-slate-500">Source: </span>{fan.sourcePlatform}</div>}
              <div><span className="text-slate-500">Site clicked: </span>{fan.websiteClicked ? "✓ Yes" : "No"}</div>
              <div><span className="text-slate-500">Email captured: </span>{fan.emailCaptured ? "✓ Yes" : "No"}</div>
              {fan.lastContactDate && <div className="col-span-2"><span className="text-slate-500">Last contact: </span>{new Date(fan.lastContactDate).toLocaleDateString()}</div>}
            </div>
            {fan.notes && <p className="text-xs text-slate-400 italic">{fan.notes}</p>}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1.5 border-purple-500/30 text-purple-300" onClick={() => onDraftMessage(fan.id)} data-testid={`button-draft-${fan.id}`}>
                <MessageSquare className="w-3.5 h-3.5" /> Draft Message
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-cyan-500/30 text-cyan-300" onClick={() => onLogInteraction(fan)} data-testid={`button-log-${fan.id}`}>
                <Plus className="w-3.5 h-3.5" /> Log Interaction
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate()} data-testid={`button-delete-fan-${fan.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Fan Dialog ────────────────────────────────────────────────────────────

function AddFanDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", displayName: "", city: "", country: "", email: "", phone: "", favoriteSong: "", notes: "", sourcePlatform: "N1M" });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fans", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fans"] });
      toast({ title: "Fan added to pipeline" });
      setOpen(false);
      setForm({ username: "", displayName: "", city: "", country: "", email: "", phone: "", favoriteSong: "", notes: "", sourcePlatform: "N1M" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-purple-600 hover:bg-purple-700" data-testid="button-add-fan">
          <UserPlus className="w-4 h-4" /> Add Fan
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fan to Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="N1M Username *" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-username" />
            <Input placeholder="Display Name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-displayname" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-city" />
            <Input placeholder="Country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-country" />
          </div>
          <Input placeholder="Email (if shared)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-email" />
          <Input placeholder="Favorite Song" value={form.favoriteSong} onChange={e => setForm(f => ({ ...f, favoriteSong: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-song" />
          <Select value={form.sourcePlatform} onValueChange={v => setForm(f => ({ ...f, sourcePlatform: v }))}>
            <SelectTrigger className="bg-black/40 border-purple-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-purple-500/30 text-white">
              <SelectItem value="N1M">N1M</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
              <SelectItem value="YouTube">YouTube</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white resize-none" rows={2} data-testid="input-fan-notes" />
          <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => addMutation.mutate()} disabled={!form.username || addMutation.isPending} data-testid="button-confirm-add-fan">
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Fan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Interaction Dialog ────────────────────────────────────────────────────

function LogInteractionDialog({ fan, open, onClose }: { fan: Fan | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ interactionType: "reply_received", direction: "inbound", messageText: "" });

  const logMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/fans/${fan?.id}/interactions`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fans"] });
      toast({ title: "Interaction logged + score updated" });
      onClose();
    },
  });

  if (!fan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Log Interaction — {fan.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={form.interactionType} onValueChange={v => setForm(f => ({ ...f, interactionType: v }))}>
            <SelectTrigger className="bg-black/40 border-purple-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-purple-500/30 text-white">
              <SelectItem value="reply_received">Reply Received (+10)</SelectItem>
              <SelectItem value="message_sent">Message Sent</SelectItem>
              <SelectItem value="link_clicked">Link Clicked (+15)</SelectItem>
              <SelectItem value="email_submitted">Email Submitted (+25)</SelectItem>
              <SelectItem value="purchase_completed">Purchase Completed (+40)</SelectItem>
              <SelectItem value="vip_joined">VIP Joined (+35)</SelectItem>
              <SelectItem value="interest_detected">Interest Detected (+10)</SelectItem>
              <SelectItem value="rewarm_sent">Rewarm Sent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v }))}>
            <SelectTrigger className="bg-black/40 border-purple-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-purple-500/30 text-white">
              <SelectItem value="inbound">Inbound (fan → you)</SelectItem>
              <SelectItem value="outbound">Outbound (you → fan)</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Message or note (optional)..." value={form.messageText} onChange={e => setForm(f => ({ ...f, messageText: e.target.value }))} className="bg-black/40 border-purple-500/30 text-white resize-none" rows={3} data-testid="input-interaction-text" />
          <Button className="w-full bg-cyan-700 hover:bg-cyan-600" onClick={() => logMutation.mutate()} disabled={logMutation.isPending} data-testid="button-confirm-log">
            {logMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Interaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Message Draft Panel ────────────────────────────────────────────────────────

function MessageDraftPanel({ fanId, onClose }: { fanId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<any>(null);
  const [tab, setTab] = useState<"engagement" | "conversion" | "followup">("engagement");

  const { data: fans } = useQuery<Fan[]>({ queryKey: ["/api/fans"] });
  const fan = fans?.find(f => f.id === fanId);

  const draftMutation = useMutation({
    mutationFn: (type: string) => apiRequest("POST", `/api/fan-agents/${type}/${fanId}`),
    onSuccess: (data) => setDraft(data),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    toast({ title: "Copied to clipboard", description: "Paste it into N1M" });
  };

  return (
    <Card className="border border-purple-500/30 bg-black/60 mt-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          AI Message Drafts — {fan?.username}
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400">Close</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-300 gap-1.5" onClick={() => draftMutation.mutate("engagement")} disabled={draftMutation.isPending} data-testid="button-draft-engagement">
            {draftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
            Engagement Draft
          </Button>
          <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 gap-1.5" onClick={() => draftMutation.mutate("conversion")} disabled={draftMutation.isPending} data-testid="button-draft-conversion">
            {draftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Conversion Draft
          </Button>
          <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-300 gap-1.5" onClick={() => draftMutation.mutate("follow-up")} disabled={draftMutation.isPending} data-testid="button-draft-followup">
            {draftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Follow-Up Draft
          </Button>
        </div>

        {draft && (
          <div className="bg-purple-950/40 border border-purple-500/20 rounded-lg p-4 space-y-3">
            <div className="bg-black/50 border border-purple-400/30 rounded p-3 text-white">
              <p className="text-sm leading-relaxed">{draft.message || draft.conversion_message || draft.follow_up_message || ""}</p>
            </div>
            {draft.message_goal && <p className="text-xs text-slate-400"><strong className="text-slate-300">Goal:</strong> {draft.message_goal}</p>}
            {draft.why_this_message && <p className="text-xs text-slate-400"><strong className="text-slate-300">Why:</strong> {draft.why_this_message}</p>}
            {draft.destination_url && <p className="text-xs text-cyan-400"><strong>Link:</strong> {draft.destination_url}</p>}
            {draft.recommended_timing && <p className="text-xs text-slate-400"><strong className="text-slate-300">Timing:</strong> {draft.recommended_timing}</p>}
            <Button size="sm" className="gap-2 bg-purple-700 hover:bg-purple-600" onClick={() => copyMessage(draft.message || draft.conversion_message || draft.follow_up_message || "")} data-testid="button-copy-draft">
              <Copy className="w-3.5 h-3.5" /> Copy Message
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Campaign Links Panel ──────────────────────────────────────────────────────

const JOIN_URL = "https://projectdnamusic.info/join";

const PLATFORMS = [
  { name: "Instagram", ref: "?ref=instagram", color: "text-pink-400", hint: "Put in your bio link" },
  { name: "TikTok",    ref: "?ref=tiktok",    color: "text-cyan-400",  hint: "Bio + video descriptions" },
  { name: "YouTube",   ref: "?ref=youtube",   color: "text-red-400",   hint: "Description + pinned comment" },
  { name: "Twitter/X", ref: "?ref=twitter",   color: "text-blue-400",  hint: "Profile bio + pinned tweet" },
  { name: "SoundCloud",ref: "?ref=soundcloud",color: "text-orange-400",hint: "Profile description" },
  { name: "Facebook",  ref: "?ref=facebook",  color: "text-indigo-400",hint: "Page bio + posts" },
];

function CampaignLinksPanel() {
  const { toast } = useToast();
  const [form, setForm] = useState({ campaignName: "", destinationUrl: "https://projectdnamusic.info/join", sourceMessageType: "first_touch" });
  const [showQr, setShowQr] = useState(false);

  const { data: links = [] } = useQuery<CampaignLink[]>({ queryKey: ["/api/campaign-links"] });

  const copyPlatformLink = (url: string, platform: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: `${platform} link copied!`, description: "Paste it in your bio or post." });
  };

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/campaign-links", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-links"] });
      toast({ title: "Campaign link created" });
      setForm(f => ({ ...f, campaignName: "" }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/campaign-links/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/campaign-links"] }),
  });

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`https://projectdnamusic.info/r/${code}`);
    toast({ title: "Link copied!", description: "Paste into your N1M message" });
  };

  return (
    <div className="space-y-4">

      {/* ── Your Join Page ── */}
      <Card className="border border-purple-500/30 bg-black/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Your Join Page — Share Everywhere
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main URL */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40">
            <code className="text-cyan-400 text-xs flex-1 truncate font-mono">{JOIN_URL}</code>
            <Button size="sm" variant="outline" className="border-purple-500/40 text-purple-300 flex-shrink-0" onClick={() => copyPlatformLink(JOIN_URL, "Join page")} data-testid="button-copy-join-url">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy
            </Button>
          </div>

          {/* QR code toggle */}
          <div>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 mb-3" onClick={() => setShowQr(v => !v)} data-testid="button-toggle-qr">
              {showQr ? "Hide" : "Show"} QR Code — for merch, flyers & shows
            </Button>
            {showQr && (
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JOIN_URL)}`}
                    alt="QR code for join page"
                    className="w-40 h-40 rounded"
                    data-testid="img-qr-code"
                  />
                </div>
                <p className="text-slate-500 text-xs">Right-click → Save image → Print on merch, stickers, flyers</p>
              </div>
            )}
          </div>

          {/* Platform quick-copy */}
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Platform-specific links (tracked)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p.name}
                  onClick={() => copyPlatformLink(JOIN_URL + p.ref, p.name)}
                  data-testid={`button-copy-${p.name.toLowerCase().replace(/\//g, '-').replace(/\s/g, '')}`}
                  className="flex flex-col items-start p-2 rounded-lg bg-slate-900/50 border border-slate-700/40 hover:border-slate-600 transition-colors text-left"
                >
                  <span className={`text-xs font-semibold ${p.color}`}>{p.name}</span>
                  <span className="text-slate-600 text-xs">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-cyan-500/20 bg-black/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-cyan-300 flex items-center gap-2"><Link2 className="w-4 h-4" /> Create Custom Tracking Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Campaign name (e.g. 'First touch June batch')" value={form.campaignName} onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))} className="bg-black/40 border-cyan-500/30 text-white" data-testid="input-campaign-name" />
          <Select value={form.destinationUrl} onValueChange={v => setForm(f => ({ ...f, destinationUrl: v }))}>
            <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-cyan-500/30 text-white">
              <SelectItem value="https://projectdnamusic.info/join">Join / VIP Page</SelectItem>
              <SelectItem value="https://projectdnamusic.info">Homepage</SelectItem>
              <SelectItem value="https://projectdnamusic.info/music">Music Page</SelectItem>
              <SelectItem value="https://projectdnamusic.info/merch">Merch Page</SelectItem>
              <SelectItem value="https://projectdnamusic.info/producer">Producer / Beats</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.sourceMessageType} onValueChange={v => setForm(f => ({ ...f, sourceMessageType: v }))}>
            <SelectTrigger className="bg-black/40 border-cyan-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-cyan-500/30 text-white">
              <SelectItem value="first_touch">First Touch</SelectItem>
              <SelectItem value="follow_up">Follow-Up</SelectItem>
              <SelectItem value="conversion">Conversion</SelectItem>
              <SelectItem value="vip_invite">VIP Invite</SelectItem>
              <SelectItem value="rewarm">Rewarm</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full bg-cyan-700 hover:bg-cyan-600 gap-2" onClick={() => createMutation.mutate()} disabled={!form.campaignName || createMutation.isPending} data-testid="button-create-link">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate Link
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {links.map(link => (
          <Card key={link.id} className="border border-cyan-500/10 bg-black/30" data-testid={`card-link-${link.id}`}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-white text-sm">{link.campaignName}</div>
                  <div className="text-xs text-cyan-400 font-mono mt-0.5 truncate">
                    projectdnamusic.info/r/{link.trackingCode}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">→ {link.destinationUrl} · {link.clickCount} clicks</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="text-cyan-400" onClick={() => copyLink(link.trackingCode)} data-testid={`button-copy-link-${link.id}`}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-red-400" onClick={() => deleteMutation.mutate(link.id)} data-testid={`button-delete-link-${link.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {links.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No campaign links yet. Create one above.</p>}
      </div>
    </div>
  );
}

// ─── Daily Report Panel ────────────────────────────────────────────────────────

function DailyReportPanel() {
  const { toast } = useToast();
  const { data: reports = [] } = useQuery<FanDailyReport[]>({ queryKey: ["/api/fan-agents/daily-reports"] });

  const runReportMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fan-agents/daily-report"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fan-agents/daily-reports"] });
      toast({ title: "Daily report generated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const latest = reports[0];

  const getHealthColor = (health: string) => {
    if (health === "strong") return "text-green-400";
    if (health === "moderate") return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-purple-300 font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Daily Executive Reports
        </h3>
        <Button size="sm" className="bg-purple-700 hover:bg-purple-600 gap-2" onClick={() => runReportMutation.mutate()} disabled={runReportMutation.isPending} data-testid="button-run-report">
          {runReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Run Report Now
        </Button>
      </div>

      {latest && (() => {
        let parsed: any = {};
        try { parsed = JSON.parse(latest.recommendations || "{}"); } catch {}
        return (
          <Card className="border border-purple-500/30 bg-black/50">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-white font-semibold">{latest.reportDate}</div>
                {parsed.pipeline_health && (
                  <Badge className={`${getHealthColor(parsed.pipeline_health)} border-current bg-transparent border`}>
                    Pipeline: {parsed.pipeline_health}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {[
                  { label: "New Fans", val: latest.newFans },
                  { label: "Msgs Sent", val: latest.messagesSent },
                  { label: "Replies", val: latest.repliesReceived },
                  { label: "Site Clicks", val: latest.websiteClicks },
                  { label: "Emails", val: latest.emailCaptures },
                  { label: "Conversions", val: latest.conversions },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center bg-purple-950/30 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">{val}</div>
                    <div className="text-xs text-slate-400">{label}</div>
                  </div>
                ))}
              </div>

              {latest.aiSummary && (
                <div className="bg-black/40 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">AI Summary</div>
                  <p className="text-sm text-slate-200">{latest.aiSummary}</p>
                </div>
              )}

              {parsed.top_recommendations && Array.isArray(parsed.top_recommendations) && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Tomorrow's Top Actions</div>
                  <div className="space-y-1.5">
                    {parsed.top_recommendations.map((rec: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-purple-400 font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {reports.length === 0 && (
        <Card className="border border-slate-700 bg-black/30">
          <CardContent className="p-6 text-center text-slate-400 text-sm">
            No reports yet. Run your first report above or wait for the daily auto-run.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Scout Panel ───────────────────────────────────────────────────────────────

function ScoutPanel() {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);

  const scoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fan-agents/scout"),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Scout complete", description: `${data.fans_to_contact?.length || 0} fans identified` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const priorityColor = (p: string) => p === "high" ? "text-red-400" : p === "medium" ? "text-amber-400" : "text-slate-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-purple-300 font-semibold flex items-center gap-2"><Radio className="w-4 h-4" /> Traffic Scout Agent</h3>
          <p className="text-xs text-slate-400 mt-0.5">Analyzes your fan list and identifies who to contact today</p>
        </div>
        <Button className="bg-purple-700 hover:bg-purple-600 gap-2" onClick={() => scoutMutation.mutate()} disabled={scoutMutation.isPending} data-testid="button-run-scout">
          {scoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Run Scout
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
            <span>Reviewed: <strong className="text-white">{result.total_fans_reviewed}</strong></span>
            <span>High priority: <strong className="text-red-400">{result.high_priority_count}</strong></span>
            <span>Medium: <strong className="text-amber-400">{result.medium_priority_count}</strong></span>
          </div>
          {result.summary && <p className="text-sm text-slate-400 italic">{result.summary}</p>}
          <div className="space-y-2">
            {(result.fans_to_contact || []).slice(0, 10).map((f: any, i: number) => (
              <Card key={i} className="border border-purple-500/15 bg-black/30">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white text-sm">{f.username || f.fan_id}</span>
                        <span className={`text-xs font-bold uppercase ${priorityColor(f.priority_level)}`}>{f.priority_level}</span>
                        <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">{f.current_stage}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{f.reason_selected}</p>
                      <p className="text-xs text-cyan-400 mt-0.5">→ {f.recommended_next_action}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{f.lead_score}</div>
                      <div className="text-xs text-slate-500">score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Fan Pipeline Component ───────────────────────────────────────────────

export default function FanPipeline() {
  const { toast } = useToast();
  const { data: fans = [], isLoading, refetch } = useQuery<Fan[]>({ queryKey: ["/api/fans"] });
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [draftFanId, setDraftFanId] = useState<string | null>(null);
  const [interactionFan, setInteractionFan] = useState<Fan | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportContacts = async () => {
    if (!confirm("Import all 1,029 N1M fans into the pipeline as Cold Followers? Existing emails will be skipped.")) return;
    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/admin/fans/import-contacts", {});
      const data = await res.json();
      toast({ title: "Import complete", description: `${data.imported} fans added · ${data.skipped} skipped (already existed)` });
      refetch();
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportPipeline = () => {
    window.location.href = "/api/admin/fans/export.csv";
  };

  const filtered = fans.filter(f => {
    const matchesStage = stageFilter === "all" || f.stage === stageFilter;
    const matchesSearch = !search || (f.username || "").toLowerCase().includes(search.toLowerCase()) || (f.email || "").toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const stageCounts = STAGES.map(s => ({ ...s, count: fans.filter(f => f.stage === s.value).length }));
  const totalScore = fans.reduce((sum, f) => sum + f.leadScore, 0);
  const avgScore = fans.length ? Math.round(totalScore / fans.length) : 0;
  const highValueFans = fans.filter(f => f.leadScore >= 61).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Fans", val: fans.length, icon: Users, color: "text-purple-400" },
          { label: "Avg Score", val: avgScore, icon: Star, color: "text-amber-400" },
          { label: "High Value", val: highValueFans, icon: TrendingUp, color: "text-green-400" },
          { label: "Captured", val: fans.filter(f => f.emailCaptured).length, icon: CheckCircle, color: "text-cyan-400" },
        ].map(({ label, val, icon: Icon, color }) => (
          <Card key={label} className="border border-purple-500/20 bg-black/40">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <div className="text-xl font-bold text-white">{val}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Pipeline Bar */}
      <div className="flex gap-1.5 flex-wrap">
        {stageCounts.map(s => (
          <button key={s.value} onClick={() => setStageFilter(stageFilter === s.value ? "all" : s.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${stageFilter === s.value ? `${s.color} text-white` : "bg-gray-800 text-slate-400 hover:bg-gray-700"}`}
            data-testid={`filter-stage-${s.value}`}>
            {s.label} <span className="font-bold">{s.count}</span>
          </button>
        ))}
        {stageFilter !== "all" && (
          <button onClick={() => setStageFilter("all")} className="px-2.5 py-1 rounded-full text-xs bg-slate-700 text-slate-300">
            All
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="fans">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <TabsList className="bg-black/40 border border-purple-500/20">
            <TabsTrigger value="fans" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Fan List
            </TabsTrigger>
            <TabsTrigger value="scout" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300">
              <Radio className="w-3.5 h-3.5 mr-1.5" /> Scout
            </TabsTrigger>
            <TabsTrigger value="links" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300">
              <Link2 className="w-3.5 h-3.5 mr-1.5" /> Links
            </TabsTrigger>
            <TabsTrigger value="report" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Reports
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="border-cyan-500/40 text-cyan-400 hover:text-cyan-300"
              onClick={handleImportContacts}
              disabled={isImporting}
              data-testid="button-import-contacts"
            >
              {isImporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
              {isImporting ? "Importing…" : "Import N1M Fans"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-green-500/40 text-green-400 hover:text-green-300"
              onClick={handleExportPipeline}
              data-testid="button-export-pipeline"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
            <AddFanDialog />
          </div>
        </div>

        {/* Fan List Tab */}
        <TabsContent value="fans" className="space-y-3">
          <Input placeholder="Search by username or email..." value={search} onChange={e => setSearch(e.target.value)} className="bg-black/40 border-purple-500/30 text-white" data-testid="input-fan-search" />

          {isLoading && (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
          )}

          {draftFanId && (
            <MessageDraftPanel fanId={draftFanId} onClose={() => setDraftFanId(null)} />
          )}

          <div className="space-y-2">
            {filtered.map(fan => (
              <FanCard key={fan.id} fan={fan} onDraftMessage={setDraftFanId} onLogInteraction={setInteractionFan} />
            ))}
          </div>

          {filtered.length === 0 && !isLoading && (
            <Card className="border border-slate-700 bg-black/30">
              <CardContent className="p-8 text-center space-y-3">
                <Users className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-slate-400">No fans in pipeline yet.</p>
                <p className="text-slate-500 text-sm">Add fans manually or share your campaign links on N1M to start building your pipeline.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scout Tab */}
        <TabsContent value="scout">
          <ScoutPanel />
        </TabsContent>

        {/* Campaign Links Tab */}
        <TabsContent value="links">
          <CampaignLinksPanel />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="report">
          <DailyReportPanel />
        </TabsContent>
      </Tabs>

      {/* Log Interaction Dialog */}
      <LogInteractionDialog fan={interactionFan} open={!!interactionFan} onClose={() => setInteractionFan(null)} />
    </div>
  );
}
