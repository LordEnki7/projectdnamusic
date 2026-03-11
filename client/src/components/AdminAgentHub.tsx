import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { AgentProposal, AgentJob, AgentMemory } from "@shared/schema";
import {
  Megaphone, BarChart3, Mail, Lightbulb, Loader2, Copy, CheckCircle2,
  Zap, TrendingUp, Target, Calendar, Sparkles, Send, Bot, BrainCircuit,
  Instagram, Twitter, Youtube, Facebook, ShieldCheck, FlaskConical,
  ChevronDown, ChevronUp, Play, AlertTriangle, Activity, Cpu,
  Inbox, CheckCheck, XCircle, Clock, Trash2, ThumbsUp, ThumbsDown,
  RefreshCw, Eye, EyeOff, Wrench, Database, History, CheckCircle,
  XOctagon, Timer, Repeat2, BookOpen, Layers,
  ListMusic, FileText, Users2, Music, Globe, Mic2,
  Star, Link2, Handshake, ListChecks
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  type: "song" | "beat" | "merch";
}

interface MarketingContent {
  instagram: string;
  twitter: string;
  tiktok: string;
  facebook: string;
  emailSubject: string;
  emailBody: string;
  adCopy: string;
}

interface SalesInsight {
  summary: string;
  topInsight: string;
  strengths: string[];
  opportunities: string[];
  recommendations: { action: string; impact: string; priority: string }[];
  revenueProjection: string;
}

interface EmailCampaign {
  subject: string;
  previewText: string;
  htmlBody: string;
  plainText: string;
  estimatedOpenRate: string;
  bestSendTime: string;
  audienceNotes: string;
}

interface ContentIdeas {
  socialMediaCalendar: { day: string; platform: string; contentType: string; idea: string }[];
  viralIdeas: { title: string; platform: string; description: string; estimatedReach: string }[];
  revenueIdeas: { idea: string; effort: string; estimatedIncome: string }[];
  collaborationTargets: string[];
  weeklyPriorityTask: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="icon" variant="ghost" onClick={copy} className="h-7 w-7 shrink-0">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
    priority === "high" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
    priority === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-green-500/20 text-green-400 border-green-500/30";
  return <span className={`text-xs px-2 py-0.5 rounded border ${color} font-medium uppercase`}>{priority}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  if (status === "approved") return <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400"><ThumbsUp className="w-3 h-3 mr-1" />Approved</Badge>;
  if (status === "executed") return <Badge variant="outline" className="text-xs border-green-500/40 text-green-400"><CheckCheck className="w-3 h-3 mr-1" />Executed</Badge>;
  if (status === "rejected") return <Badge variant="outline" className="text-xs border-red-500/40 text-red-400"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  return null;
}

function SourceBadge({ source }: { source: string }) {
  const configs: Record<string, { label: string; color: string; icon: any }> = {
    advisor:    { label: "Advisor",    color: "border-purple-500/40 text-purple-400",  icon: BrainCircuit },
    architect:  { label: "Architect",  color: "border-cyan-500/40 text-cyan-400",      icon: Cpu },
    playlist:   { label: "Playlist",   color: "border-blue-500/40 text-blue-400",      icon: ListMusic },
    licensing:  { label: "Licensing",  color: "border-orange-500/40 text-orange-400",  icon: FileText },
    influencer: { label: "Influencer", color: "border-pink-500/40 text-pink-400",      icon: Users2 },
  };
  const cfg = configs[source] || configs.advisor;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-xs ${cfg.color}`}>
      <Icon className="w-3 h-3 mr-1" />{cfg.label}
    </Badge>
  );
}

function QualityScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
    score >= 5 ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10" :
    "border-red-500/40 text-red-400 bg-red-500/10";
  const label = score >= 8 ? "High Quality" : score >= 5 ? "Solid" : "Needs Work";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border ${color} font-medium flex items-center gap-1`}
      title={`AI Quality Score: ${score}/10 — ${label}`}
      data-testid="badge-quality-score"
    >
      <Star className="w-3 h-3" />{score}/10
    </span>
  );
}

// ─── Command Center Inbox ─────────────────────────────────────────────────────
function CommandCenterInbox() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [reportingOutcomeId, setReportingOutcomeId] = useState<number | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const { data: proposals = [], isLoading, refetch } = useQuery<AgentProposal[]>({
    queryKey: ["/api/agent-proposals"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const updateProposal = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/agent-proposals/${id}`, data),
    onSuccess: async (res, { id, data }) => {
      const updated = await res.json();
      queryClient.setQueryData(["/api/agent-proposals"], (old: AgentProposal[] | undefined) => {
        if (!old) return old;
        return old.map(p => p.id === id ? { ...p, ...updated } : p);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
    },
  });

  const deleteProposal = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/agent-proposals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] }),
  });

  const recordOutcome = useMutation({
    mutationFn: ({ id, outcomeStatus, outcomeNotes }: { id: number; outcomeStatus: string; outcomeNotes: string }) =>
      apiRequest("PATCH", `/api/agent-proposals/${id}/outcome`, { outcomeStatus, outcomeNotes }),
    onSuccess: async (res, { id }) => {
      const updated = await res.json();
      queryClient.setQueryData(["/api/agent-proposals"], (old: AgentProposal[] | undefined) => {
        if (!old) return old;
        return old.map(p => p.id === id ? { ...p, ...updated } : p);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/memory"] });
      setReportingOutcomeId(null);
      setOutcomeNotes("");
      toast({ title: "Outcome recorded", description: "Agents will learn from this result on the next scan." });
    },
    onError: (err: any) => toast({ title: "Failed to record outcome", description: err.message, variant: "destructive" }),
  });

  const handleApprove = async (p: AgentProposal) => {
    await updateProposal.mutateAsync({ id: p.id, data: { status: "approved" } });
    toast({ title: "Proposal approved", description: "Ready to execute when you are." });
  };

  const handleReject = async (p: AgentProposal) => {
    await updateProposal.mutateAsync({ id: p.id, data: { status: "rejected", adminNote: rejectNote } });
    setRejectingId(null);
    setRejectNote("");
    toast({ title: "Proposal rejected" });
  };

  const handleExecute = async (p: AgentProposal) => {
    setExecutingId(p.id);
    try {
      const res = await apiRequest("POST", "/api/ai-agents/execution-report", { proposalId: p.id });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to generate execution report");
      }
      const data = await res.json();
      const updatedProposal: AgentProposal = data.proposal;

      queryClient.setQueryData(["/api/agent-proposals"], (old: AgentProposal[] | undefined) =>
        old ? old.map(x => x.id === updatedProposal.id ? updatedProposal : x) : [updatedProposal]
      );
      queryClient.invalidateQueries({ queryKey: ["/api/agents/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/memory"] });
      toast({
        title: "Execution report generated",
        description: "AI has produced a full structured report. Open the Execution Log to review it.",
      });
    } catch (err: any) {
      toast({ title: "Execution failed", description: err.message, variant: "destructive" });
    } finally {
      setExecutingId(null);
    }
  };

  const filtered = proposals.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
    return true;
  });

  const counts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === "pending").length,
    approved: proposals.filter(p => p.status === "approved").length,
    executed: proposals.filter(p => p.status === "executed").length,
    rejected: proposals.filter(p => p.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "pending", "approved", "executed", "rejected"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-primary/20 border-primary/40 text-primary font-medium"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {counts[s] > 0 && <span className="ml-1.5 opacity-70">{counts[s]}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-7 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="advisor">Advisor</SelectItem>
              <SelectItem value="architect">Architect</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={() => refetch()} className="h-7 w-7">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading proposals...
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
          <Inbox className="w-8 h-8 opacity-40" />
          <p className="text-sm">No proposals yet</p>
          <p className="text-xs opacity-60">Run the Action Advisor or Dev Architect to generate proposals</p>
        </div>
      )}

      {/* Proposal cards */}
      <div className="space-y-3">
        {filtered.map(p => {
          const isExpanded = expandedId === p.id;
          const isRejecting = rejectingId === p.id;
          const isExecuting = executingId === p.id;
          const agents: string[] = p.agentsRequired ? JSON.parse(p.agentsRequired) : [];
          const assets: string[] = p.assetsRequired ? JSON.parse(p.assetsRequired) : [];

          return (
            <Card key={p.id} className="bg-card/60 border-border/60" data-testid={`proposal-card-${p.id}`}>
              <CardContent className="pt-4 pb-4 px-4 space-y-3">
                {/* Top row */}
                <div className="flex flex-wrap items-start gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <PriorityBadge priority={p.priority} />
                    <StatusBadge status={p.status} />
                    <SourceBadge source={p.source} />
                    {p.qualityScore != null && (
                      <QualityScoreBadge score={p.qualityScore} />
                    )}
                    {p.estimatedTime && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{p.estimatedTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      onClick={() => deleteProposal.mutate(p.id)}
                      data-testid={`button-delete-proposal-${p.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Title + opportunity */}
                <div>
                  <p className="font-medium text-sm mb-1">{p.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.opportunity}</p>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    {p.objective && (
                      <div>
                        <p className="text-xs font-medium text-primary mb-0.5">Objective</p>
                        <p className="text-xs text-muted-foreground">{p.objective}</p>
                      </div>
                    )}
                    {p.plan && (
                      <div>
                        <p className="text-xs font-medium text-primary mb-0.5">Plan</p>
                        <p className="text-xs text-muted-foreground">{p.plan}</p>
                      </div>
                    )}
                    {p.expectedResult && (
                      <div>
                        <p className="text-xs font-medium text-primary mb-0.5">Expected Result</p>
                        <p className="text-xs text-muted-foreground">{p.expectedResult}</p>
                      </div>
                    )}
                    {agents.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {agents.map(a => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                      </div>
                    )}
                    {assets.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Assets Required</p>
                        <div className="flex flex-wrap gap-1">
                          {assets.map(a => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
                        </div>
                      </div>
                    )}
                    {p.executionResult && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                        <p className="text-xs font-medium text-green-400 mb-0.5">Execution Result</p>
                        <p className="text-xs text-green-300/80">{p.executionResult}</p>
                        {p.executedAt && <p className="text-xs text-muted-foreground mt-1">{new Date(p.executedAt).toLocaleString()}</p>}
                      </div>
                    )}
                    {(p as any).outcomeStatus && (
                      <div className={`rounded p-2 border ${
                        (p as any).outcomeStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20" :
                        (p as any).outcomeStatus === "partial" ? "bg-amber-500/10 border-amber-500/20" :
                        "bg-red-500/10 border-red-500/20"
                      }`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {(p as any).outcomeStatus === "success" ? <CheckCircle className={`w-3 h-3 text-emerald-400`} /> :
                           (p as any).outcomeStatus === "partial" ? <Activity className={`w-3 h-3 text-amber-400`} /> :
                           <XCircle className={`w-3 h-3 text-red-400`} />}
                          <p className={`text-xs font-medium ${
                            (p as any).outcomeStatus === "success" ? "text-emerald-400" :
                            (p as any).outcomeStatus === "partial" ? "text-amber-400" : "text-red-400"
                          }`}>
                            Outcome: {(p as any).outcomeStatus === "success" ? "Worked" : (p as any).outcomeStatus === "partial" ? "Partial" : "Failed"}
                          </p>
                        </div>
                        {(p as any).outcomeNotes && <p className="text-xs text-muted-foreground">{(p as any).outcomeNotes}</p>}
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Agents will use this to improve future recommendations</p>
                      </div>
                    )}
                    {p.adminNote && p.status === "rejected" && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                        <p className="text-xs font-medium text-red-400 mb-0.5">Rejection Note</p>
                        <p className="text-xs text-red-300/80">{p.adminNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {p.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isRejecting ? (
                      <div className="w-full space-y-2">
                        <Textarea
                          placeholder="Optional rejection note..."
                          className="text-xs h-16 resize-none"
                          value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => handleReject(p)} data-testid={`button-confirm-reject-${p.id}`}>
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectNote(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(p)}
                          disabled={updateProposal.isPending}
                          data-testid={`button-approve-proposal-${p.id}`}
                          className="gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingId(p.id)}
                          data-testid={`button-reject-proposal-${p.id}`}
                          className="gap-1.5"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {p.status === "approved" && p.source !== "architect" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleExecute(p)}
                      disabled={isExecuting}
                      data-testid={`button-execute-proposal-${p.id}`}
                      className="gap-1.5"
                    >
                      {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      Execute Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectingId(p.id)} className="gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                )}

                {p.status === "approved" && p.source === "architect" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleExecute(p)}
                      disabled={isExecuting}
                      data-testid={`button-acknowledge-proposal-${p.id}`}
                      className="gap-1.5"
                    >
                      {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                      Acknowledge & Log
                    </Button>
                  </div>
                )}

                {p.status === "executed" && !(p as any).outcomeStatus && (
                  <div className="pt-1">
                    {reportingOutcomeId === p.id ? (
                      <div className="space-y-2 w-full">
                        <p className="text-xs font-medium text-muted-foreground">How did this strategy go?</p>
                        <Textarea
                          placeholder="Optional notes (e.g. got 2 playlist placements, 500 new streams...)"
                          className="text-xs h-14 resize-none"
                          value={outcomeNotes}
                          onChange={e => setOutcomeNotes(e.target.value)}
                          data-testid={`input-outcome-notes-${p.id}`}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => recordOutcome.mutate({ id: p.id, outcomeStatus: "success", outcomeNotes })}
                            disabled={recordOutcome.isPending}
                            data-testid={`button-outcome-success-${p.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Worked
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-amber-500/40 text-amber-400"
                            onClick={() => recordOutcome.mutate({ id: p.id, outcomeStatus: "partial", outcomeNotes })}
                            disabled={recordOutcome.isPending}
                            data-testid={`button-outcome-partial-${p.id}`}
                          >
                            <Activity className="w-3.5 h-3.5" /> Partially Worked
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-red-500/40 text-red-400"
                            onClick={() => recordOutcome.mutate({ id: p.id, outcomeStatus: "failed", outcomeNotes })}
                            disabled={recordOutcome.isPending}
                            data-testid={`button-outcome-failed-${p.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Didn't Work
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReportingOutcomeId(null); setOutcomeNotes(""); }} className="text-xs">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReportingOutcomeId(p.id)}
                        className="gap-1.5 text-muted-foreground"
                        data-testid={`button-report-outcome-${p.id}`}
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Report How It Went
                      </Button>
                    )}
                  </div>
                )}

                {p.status === "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateProposal.mutate({ id: p.id, data: { status: "pending", adminNote: null } })}
                    className="gap-1.5 mt-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Restore to Pending
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Development Architect Agent ─────────────────────────────────────────────
function ArchitectAgent() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const scan = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai-agents/architect", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      setSummary(data.architectSummary || null);
      setSavedCount(data.savedCount || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/jobs"] });
      toast({ title: `${data.savedCount} architect proposals saved`, description: "Check Command Center inbox" });
    },
    onError: (err: any) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
        <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <Cpu className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <p className="font-medium">Development Architect Agent</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Scans your platform's features, catalog, and user data to identify missing capabilities,
            UX improvements, and integration opportunities. Proposals are saved to your Command Center inbox for approval.
          </p>
        </div>
        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          data-testid="button-scan-architect"
          className="gap-2"
        >
          {scan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          {scan.isPending ? "Analyzing Platform..." : "Analyze Platform"}
        </Button>
      </div>

      {savedCount !== null && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <CheckCheck className="w-4 h-4" />
            <p className="text-sm font-medium">{savedCount} proposals saved to Command Center</p>
          </div>
          {summary && <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>}
          <p className="text-xs text-muted-foreground">Switch to the Command Center tab to review and approve.</p>
        </div>
      )}

      <div className="border border-border/40 rounded-lg p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What the Architect Looks For</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: Zap, label: "Missing Revenue Features", desc: "Upsells, bundles, subscriptions not yet implemented" },
            { icon: Activity, label: "UX Gaps", desc: "Friction points that reduce conversion or engagement" },
            { icon: Target, label: "Integration Opportunities", desc: "APIs and platforms that would add value" },
            { icon: TrendingUp, label: "Growth Capabilities", desc: "Features that drive user acquisition or retention" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 py-1.5">
              <Icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Marketing Agent ─────────────────────────────────────────────────────────
function MarketingAgent() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [result, setResult] = useState<{ product: string; content: MarketingContent } | null>(null);

  const { data: products } = useQuery<{ songs: Product[]; beats: Product[]; merch: Product[] }>({
    queryKey: ["/api/ai-agents/products"],
  });

  const allProducts: Product[] = [
    ...(products?.songs || []),
    ...(products?.beats || []),
    ...(products?.merch || []),
  ];

  const mutation = useMutation({
    mutationFn: async () => {
      const product = allProducts.find((p) => p.id === selectedProduct);
      if (!product) throw new Error("Select a product first");
      const res = await apiRequest("POST", "/api/ai-agents/marketing", {
        productType: product.type,
        productId: product.id,
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const platforms = result ? [
    { key: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400" },
    { key: "twitter", label: "Twitter / X", icon: Twitter, color: "text-sky-400" },
    { key: "tiktok", label: "TikTok", icon: Zap, color: "text-white" },
    { key: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-400" },
    { key: "emailBody", label: "Email Body", icon: Mail, color: "text-violet-400" },
    { key: "adCopy", label: "Ad Copy", icon: Megaphone, color: "text-amber-400" },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">Select a Product to Promote</label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger data-testid="select-product">
              <SelectValue placeholder="Choose song, beat, or merch..." />
            </SelectTrigger>
            <SelectContent>
              {products?.songs && products.songs.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Songs</div>
                  {products.songs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </>
              )}
              {products?.beats && products.beats.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Beats</div>
                  {products.beats.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </>
              )}
              {products?.merch && products.merch.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Merch</div>
                  {products.merch.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!selectedProduct || mutation.isPending}
          data-testid="button-generate-marketing"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {mutation.isPending ? "Generating..." : "Generate Content"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-primary">Ad Copy Punch Line:</p>
            <p className="text-sm flex-1">"{result.content.adCopy}"</p>
            <CopyButton text={result.content.adCopy} />
          </div>

          {result.content.emailSubject && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Mail className="w-4 h-4 text-violet-400 shrink-0" />
              <p className="text-sm font-medium text-violet-400">Email Subject:</p>
              <p className="text-sm flex-1">"{result.content.emailSubject}"</p>
              <CopyButton text={result.content.emailSubject} />
            </div>
          )}

          <div className="grid gap-3">
            {platforms.map(({ key, label, icon: Icon, color }) => {
              const text = result.content[key as keyof MarketingContent];
              if (!text) return null;
              return (
                <Card key={key} className="bg-card/50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <CopyButton text={text} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sales Intelligence Agent ─────────────────────────────────────────────────
function SalesIntelligenceAgent() {
  const { toast } = useToast();
  const [result, setResult] = useState<{ data: any; insights: SalesInsight } | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai-agents/sales-intelligence");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          AI analyzes your real sales data and delivers actionable business insights.
        </p>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-analyze-sales">
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
          {mutation.isPending ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold text-primary">${result.data.totalRevenue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Revenue</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold">{result.data.totalOrders}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold">{result.data.registeredUsers}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Registered Users</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold">{result.data.catalog.songs + result.data.catalog.beats + result.data.catalog.merch}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Catalog Items</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex gap-2 items-start">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Top Insight</p>
                  <p className="text-sm">{result.insights.topInsight}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-sm font-medium mb-2">Summary</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.insights.summary}</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <p className="text-sm font-medium text-green-400">Strengths</p>
                {result.insights.strengths?.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <p className="text-sm font-medium text-amber-400">Opportunities</p>
                {result.insights.opportunities?.map((o, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{o}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50">
            <CardContent className="pt-4 pb-3 px-4 space-y-3">
              <p className="text-sm font-medium">Action Recommendations</p>
              {result.insights.recommendations?.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{r.action}</p>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground">{r.impact}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex gap-2 items-start">
                <TrendingUp className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-violet-400 mb-1">30-Day Revenue Projection</p>
                  <p className="text-sm text-muted-foreground">{result.insights.revenueProjection}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.data.topSellingItems?.length > 0 && (
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <p className="text-sm font-medium">Top Selling Items</p>
                {result.data.topSellingItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <Badge variant="secondary">{item.count} sold</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Email Campaign Agent ─────────────────────────────────────────────────────
function EmailCampaignAgent() {
  const { toast } = useToast();
  const [campaignType, setCampaignType] = useState("new_release");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ emailContent: EmailCampaign; sendResult?: any } | null>(null);

  const mutation = useMutation({
    mutationFn: async (sendNow: boolean) => {
      const res = await apiRequest("POST", "/api/ai-agents/email-campaign", {
        campaignType, topic, sendNow,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.sendResult?.sent) {
        toast({ title: `Sent to ${data.sendResult.sent} users!`, description: `${data.sendResult.failed} failed.` });
      }
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Campaign Type</label>
          <Select value={campaignType} onValueChange={setCampaignType}>
            <SelectTrigger data-testid="select-campaign-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_release">New Release Announcement</SelectItem>
              <SelectItem value="promotion">Limited Time Promotion</SelectItem>
              <SelectItem value="fan_update">Artist Update / Message</SelectItem>
              <SelectItem value="beat_drop">Beat Drop</SelectItem>
              <SelectItem value="merch_launch">Merch Launch</SelectItem>
              <SelectItem value="membership">VIP Membership Drive</SelectItem>
              <SelectItem value="event">Event / Show Announcement</SelectItem>
              <SelectItem value="reengagement">Re-Engagement Campaign</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Campaign Topic / Details</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. New single 'Galaxy Mind' out now..."
            data-testid="input-campaign-topic"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => mutation.mutate(false)}
          disabled={!topic || mutation.isPending}
          data-testid="button-draft-email"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Draft Email
        </Button>
        {result && (
          <Button
            onClick={() => mutation.mutate(true)}
            disabled={mutation.isPending}
            data-testid="button-send-email"
          >
            <Send className="w-4 h-4 mr-2" />
            Send to All Users
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <Card className="bg-card/50">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-1">Subject Line</p>
                <div className="flex items-start gap-2">
                  <p className="text-sm font-medium flex-1">{result.emailContent.subject}</p>
                  <CopyButton text={result.emailContent.subject} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-1">Est. Open Rate</p>
                <p className="text-sm font-medium text-green-400">{result.emailContent.estimatedOpenRate}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-1">Best Send Time</p>
                <p className="text-sm font-medium">{result.emailContent.bestSendTime}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50">
            <CardContent className="pt-3 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Target Audience</p>
              <p className="text-sm">{result.emailContent.audienceNotes}</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Email Body (Plain Text)</p>
                <CopyButton text={result.emailContent.plainText} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="bg-background/50 rounded p-3 max-h-60 overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {result.emailContent.plainText}
                </p>
              </div>
            </CardContent>
          </Card>

          {result.sendResult && (
            <Card className={`border ${result.sendResult.error ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`}>
              <CardContent className="pt-3 pb-3 px-4">
                {result.sendResult.error ? (
                  <p className="text-sm text-red-400">Send failed: {result.sendResult.error}</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-green-400">Campaign Sent!</p>
                      <p className="text-xs text-muted-foreground">
                        {result.sendResult.sent} delivered • {result.sendResult.failed} failed • {result.sendResult.total} total users
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Content Ideas Agent ──────────────────────────────────────────────────────
function ContentIdeasAgent() {
  const { toast } = useToast();
  const [focus, setFocus] = useState("");
  const [result, setResult] = useState<{ ideas: ContentIdeas } | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-agents/content-ideas", { focus });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">Focus Area (optional)</label>
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. beat sales, fan growth, new merch launch..."
            data-testid="input-content-focus"
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-generate-ideas">
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
          {mutation.isPending ? "Generating..." : "Generate Strategy"}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex gap-2 items-start">
                <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-400 mb-1">Weekly Priority Task</p>
                  <p className="text-sm">{result.ideas.weeklyPriorityTask}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">7-Day Content Calendar</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {result.ideas.socialMediaCalendar?.map((day, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-border/30 last:border-0">
                  <div className="w-20 shrink-0">
                    <p className="text-xs font-medium">{day.day}</p>
                    <p className="text-xs text-muted-foreground">{day.platform}</p>
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs mb-1">{day.contentType}</Badge>
                    <p className="text-xs text-muted-foreground">{day.idea}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <CardTitle className="text-sm">Viral Content Ideas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
              {result.ideas.viralIdeas?.map((idea, i) => (
                <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{idea.title}</p>
                    <Badge variant="secondary" className="text-xs">{idea.platform}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{idea.description}</p>
                  <p className="text-xs text-green-400">Est. reach: {idea.estimatedReach}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-400" />
                <CardTitle className="text-sm">Revenue Ideas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {result.ideas.revenueIdeas?.map((idea, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm">{idea.idea}</p>
                    <p className="text-xs text-green-400 mt-0.5">{idea.estimatedIncome}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${
                    idea.effort === "low" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    idea.effort === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                    "bg-red-500/20 text-red-400 border-red-500/30"
                  } font-medium uppercase`}>{idea.effort}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {result.ideas.collaborationTargets?.length > 0 && (
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-sm font-medium mb-2">Collaboration Targets</p>
                <div className="flex flex-wrap gap-2">
                  {result.ideas.collaborationTargets.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Action Advisor Agent ─────────────────────────────────────────────────────
function ActionAdvisorAgent() {
  const { toast } = useToast();
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [overallSummary, setOverallSummary] = useState("");
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-agents/action-proposals", {});
      return res.json();
    },
    onSuccess: (data) => {
      setHealthScore(data.overallHealthScore ?? null);
      setOverallSummary(data.overallSummary || "");
      setSavedCount(data.savedCount || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/jobs"] });
      toast({ title: `${data.savedCount} proposals saved to Command Center`, description: "Review and approve in the inbox above." });
    },
    onError: (e: any) => toast({ title: "Scan failed", description: e.message, variant: "destructive" }),
  });

  const healthColor = healthScore == null ? "text-muted-foreground"
    : healthScore >= 80 ? "text-green-400"
    : healthScore >= 60 ? "text-yellow-400"
    : "text-red-400";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1">
          Scans all platform data — sales, users, catalog, trends — then generates ranked business action proposals and saves them directly to your Command Center inbox for approval.
        </p>
        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          data-testid="button-scan-advisor"
          className="shrink-0 gap-2"
        >
          {scanMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning...</>
            : <><Activity className="w-4 h-4" />Scan Platform</>}
        </Button>
      </div>

      {healthScore !== null && (
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-4">
              <div className="text-center shrink-0">
                <p className={`text-4xl font-bold font-display ${healthColor}`}>{healthScore}</p>
                <p className="text-xs text-muted-foreground">Health Score</p>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${healthColor.replace("text-", "bg-")}`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {healthScore >= 80 ? "Platform performing well" : healthScore >= 60 ? "Moderate — growth opportunities available" : "Attention needed — multiple opportunities detected"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="pt-4 pb-3 px-4 flex items-start gap-2">
              <BrainCircuit className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary mb-1">Advisor Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{overallSummary}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {savedCount !== null && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCheck className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">{savedCount} proposals saved to your Command Center inbox</p>
            <p className="text-xs text-muted-foreground mt-0.5">Switch to the Command Center tab above to review, approve, and execute.</p>
          </div>
        </div>
      )}

      {!scanMutation.isPending && savedCount === null && (
        <div className="text-center py-10 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Ready to scan your platform</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Click "Scan Platform" to analyze all data and send ranked action proposals to the Command Center inbox.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Playlist Placement Agent ─────────────────────────────────────────────────
function PlaylistPlacementAgent() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const scan = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai-agents/playlist-placement", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      setSummary(data.placementSummary || null);
      setSavedCount(data.savedCount || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/jobs"] });
      toast({ title: `${data.savedCount} playlist proposals saved`, description: "Check Command Center inbox" });
    },
    onError: (err: any) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
        <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20">
          <ListMusic className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <p className="font-medium">Playlist Placement Agent</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Analyzes your catalog's genres and sound to identify the most relevant playlist targets
            across Spotify, Apple Music, SubmitHub, and curator networks. Proposals saved to your inbox.
          </p>
        </div>
        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          data-testid="button-scan-playlist"
          className="gap-2"
        >
          {scan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListMusic className="w-4 h-4" />}
          {scan.isPending ? "Finding Playlists..." : "Find Playlist Targets"}
        </Button>
      </div>

      {savedCount !== null && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCheck className="w-4 h-4" />
            <p className="text-sm font-medium">{savedCount} playlist proposals saved to Command Center</p>
          </div>
          {summary && <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>}
          <p className="text-xs text-muted-foreground">Switch to Command Center inbox to review and approve.</p>
        </div>
      )}

      <div className="border border-border/40 rounded-lg p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What the Agent Scouts</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: Music, label: "Genre-Matched Playlists", desc: "Spotify, Apple Music, and Tidal playlists that fit your sound", color: "text-green-400" },
            { icon: Globe, label: "SubmitHub Curators", desc: "Independent curators accepting submissions in your genre", color: "text-green-400" },
            { icon: Star, label: "Editorial Playlist Pitches", desc: "DSP editorial submissions via Spotify for Artists and similar", color: "text-green-400" },
            { icon: ListMusic, label: "YouTube Playlist Channels", desc: "Music channels and lo-fi/vibe channels open to new submissions", color: "text-green-400" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex items-start gap-3 py-1.5">
              <Icon className={`w-4 h-4 ${color} mt-0.5 shrink-0`} />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Licensing Intelligence Agent ─────────────────────────────────────────────
function LicensingAgent() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const scan = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai-agents/licensing", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      setSummary(data.licensingSummary || null);
      setSavedCount(data.savedCount || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/jobs"] });
      toast({ title: `${data.savedCount} licensing proposals saved`, description: "Check Command Center inbox" });
    },
    onError: (err: any) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
        <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
          <FileText className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <p className="font-medium">Licensing Intelligence Agent</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Scans your catalog to identify sync licensing opportunities — TV, film, ads, games, and brand partnerships.
            Returns 4 actionable deal proposals with pitch strategies, saved directly to your inbox.
          </p>
        </div>
        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          data-testid="button-scan-licensing"
          className="gap-2"
        >
          {scan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {scan.isPending ? "Scanning Opportunities..." : "Scan Licensing Deals"}
        </Button>
      </div>

      {savedCount !== null && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <CheckCheck className="w-4 h-4" />
            <p className="text-sm font-medium">{savedCount} licensing proposals saved to Command Center</p>
          </div>
          {summary && <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>}
          <p className="text-xs text-muted-foreground">Switch to Command Center inbox to review and approve.</p>
        </div>
      )}

      <div className="border border-border/40 rounded-lg p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Licensing Verticals Scanned</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: FileText, label: "Sync Licensing", desc: "TV shows, film trailers, short films, and documentaries", color: "text-amber-400" },
            { icon: Zap, label: "Advertisement Deals", desc: "Brand commercials, product launches, and lifestyle campaigns", color: "text-amber-400" },
            { icon: Mic2, label: "Podcast & Media", desc: "Intro music, background tracks, and branded content", color: "text-amber-400" },
            { icon: Globe, label: "Digital & Game Media", desc: "YouTube creators, mobile games, and streaming platforms", color: "text-amber-400" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex items-start gap-3 py-1.5">
              <Icon className={`w-4 h-4 ${color} mt-0.5 shrink-0`} />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Influencer Partnership Agent ─────────────────────────────────────────────
function InfluencerAgent() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const scan = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai-agents/influencer", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      setSummary(data.influencerSummary || null);
      setSavedCount(data.savedCount || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/jobs"] });
      toast({ title: `${data.savedCount} partnership proposals saved`, description: "Check Command Center inbox" });
    },
    onError: (err: any) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
        <div className="p-4 rounded-full bg-pink-500/10 border border-pink-500/20">
          <Users2 className="w-8 h-8 text-pink-400" />
        </div>
        <div>
          <p className="font-medium">Influencer Partnership Agent</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Identifies the most aligned influencer types for your genre and sound across TikTok, YouTube,
            and Instagram. Generates 4 partnership proposals with approach strategies, saved to your inbox.
          </p>
        </div>
        <Button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          data-testid="button-scan-influencer"
          className="gap-2"
        >
          {scan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />}
          {scan.isPending ? "Scouting Influencers..." : "Scout Partnerships"}
        </Button>
      </div>

      {savedCount !== null && (
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-pink-400">
            <CheckCheck className="w-4 h-4" />
            <p className="text-sm font-medium">{savedCount} partnership proposals saved to Command Center</p>
          </div>
          {summary && <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>}
          <p className="text-xs text-muted-foreground">Switch to Command Center inbox to review and approve.</p>
        </div>
      )}

      <div className="border border-border/40 rounded-lg p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Partnership Categories</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: Users2, label: "TikTok Creators", desc: "Dance, lifestyle, and hip-hop TikTok creators in your niche", color: "text-pink-400" },
            { icon: Star, label: "YouTube Music Channels", desc: "Music review, playlist, and underground rap channels", color: "text-pink-400" },
            { icon: Mic2, label: "Podcast Appearances", desc: "Music industry and artist interview podcasts", color: "text-pink-400" },
            { icon: Link2, label: "Collab Opportunities", desc: "Artists, producers, and brands for joint releases or features", color: "text-pink-400" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex items-start gap-3 py-1.5">
              <Icon className={`w-4 h-4 ${color} mt-0.5 shrink-0`} />
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Jobs Monitor ─────────────────────────────────────────────────────────────
function JobsMonitor() {
  const [open, setOpen] = useState(false);
  const { data: jobs = [], isLoading } = useQuery<AgentJob[]>({
    queryKey: ["/api/agents/jobs"],
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: open ? 10000 : false,
  });

  const runningCount = jobs.filter(j => j.status === "running").length;

  function formatDuration(start?: string | null, end?: string | null) {
    if (!start) return null;
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const diff = Math.round((e - s) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  }

  function timeAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const jobTypeLabel: Record<string, string> = {
    daily_scan: "Daily Scan",
    architect_scan: "Architect Scan",
  };

  const triggeredByLabel: Record<string, string> = {
    user: "You",
    system: "Auto",
  };

  return (
    <Card className="border-border/50" data-testid="card-jobs-monitor">
      <button
        className="w-full text-left"
        onClick={() => setOpen(o => !o)}
        data-testid="button-toggle-jobs"
      >
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Job History
              {runningCount > 0 && (
                <Badge className="text-xs animate-pulse bg-green-500/20 text-green-400 border-green-500/30 border">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {runningCount} running
                </Badge>
              )}
              {jobs.length > 0 && runningCount === 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {jobs.length} jobs
                </Badge>
              )}
            </CardTitle>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading job history...
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No jobs yet. Scans will appear here automatically.</p>
          ) : (
            <div className="space-y-2" data-testid="list-jobs">
              {jobs.map(job => (
                <div key={job.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/30" data-testid={`job-item-${job.id}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    {job.status === "running" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                    {job.status === "completed" && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {job.status === "failed" && <XOctagon className="w-4 h-4 text-red-400" />}
                    {job.status === "pending" && <Timer className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{jobTypeLabel[job.jobType] || job.jobType}</span>
                      <Badge variant="outline" className="text-xs">
                        {triggeredByLabel[job.triggeredBy] || job.triggeredBy}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(job.createdAt)}</span>
                      {job.startedAt && (
                        <span className="text-xs text-muted-foreground">
                          <Timer className="w-3 h-3 inline mr-0.5" />
                          {formatDuration(job.startedAt, job.completedAt)}
                        </span>
                      )}
                    </div>
                    {job.result && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{job.result}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Memory Panel ─────────────────────────────────────────────────────────────
function MemoryPanel() {
  const [open, setOpen] = useState(false);
  const { data: memories = [], isLoading } = useQuery<AgentMemory[]>({
    queryKey: ["/api/agents/memory"],
    staleTime: 0,
    refetchOnMount: true,
    enabled: open,
  });

  const memoryTypeConfig: Record<string, { label: string; color: string }> = {
    outcome: { label: "Outcome", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    rejection: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20" },
    insight: { label: "Insight", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    learning: { label: "Learning", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  };

  function timeAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <Card className="border-border/50" data-testid="card-memory-panel">
      <button
        className="w-full text-left"
        onClick={() => setOpen(o => !o)}
        data-testid="button-toggle-memory"
      >
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              Agent Memory
              {memories.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {memories.length} entries
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Agents learn from decisions made here</span>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading memory...
            </div>
          ) : memories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No memory yet. Approve, reject, or execute proposals to build the agent's memory.
            </p>
          ) : (
            <div className="space-y-2" data-testid="list-memory">
              {memories.map(mem => {
                const cfg = memoryTypeConfig[mem.memoryType] || memoryTypeConfig.insight;
                return (
                  <div key={mem.id} className="p-3 rounded-md bg-muted/30 space-y-1.5" data-testid={`memory-item-${mem.id}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(mem.createdAt)}</span>
                      {mem.tags && (
                        <Badge variant="outline" className="text-xs text-muted-foreground capitalize">{mem.tags}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{mem.title}</p>
                    <p className="text-xs text-muted-foreground">{mem.content}</p>
                    {mem.outcome && (
                      <p className="text-xs text-muted-foreground italic">{mem.outcome}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Execution Report Renderer ─────────────────────────────────────────────────
function ExecutionReportView({ report }: { report: string }) {
  const sectionColors: Record<string, string> = {
    "EXECUTION SUMMARY": "text-cyan-400",
    "ACTION LOG": "text-blue-400",
    "TIME LOG": "text-violet-400",
    "ASSETS NEEDED": "text-orange-400",
    "QUALITY REVIEW": "text-yellow-400",
    "EXPECTED RESULTS": "text-green-400",
    "RECOMMENDED NEXT STEPS": "text-emerald-400",
  };

  const sections: { header: string; color: string; lines: string[] }[] = [];
  let currentSection: { header: string; color: string; lines: string[] } | null = null;

  for (const rawLine of report.split("\n")) {
    const line = rawLine.trimEnd();
    const isHeader = Object.keys(sectionColors).some(h => line.trim() === h);
    if (isHeader) {
      if (currentSection) sections.push(currentSection);
      currentSection = { header: line.trim(), color: sectionColors[line.trim()] || "text-muted-foreground", lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  if (sections.length === 0) {
    return (
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed bg-background/30 rounded-md p-3">
        {report}
      </pre>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <div key={i} className="space-y-1.5">
          <p className={`text-xs font-bold uppercase tracking-wider ${sec.color}`}>{sec.header}</p>
          <div className="bg-background/30 rounded-md p-3 space-y-1">
            {sec.lines
              .filter(l => l.trim() !== "")
              .map((l, j) => {
                const isNumbered = /^\d+\./.test(l.trim());
                const isBullet = l.trim().startsWith("•") || l.trim().startsWith("-");
                const isKeyValue = l.includes(":") && !isNumbered && !isBullet;
                if (isNumbered) {
                  return (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className={`flex-shrink-0 font-semibold ${sec.color}`}>{l.trim().match(/^\d+\./)?.[0]}</span>
                      <span className="text-muted-foreground">{l.trim().replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  );
                }
                if (isBullet) {
                  return (
                    <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className={`flex-shrink-0 ${sec.color}`}>•</span>
                      <span>{l.trim().replace(/^[•\-]\s*/, "")}</span>
                    </div>
                  );
                }
                if (isKeyValue) {
                  const colonIdx = l.indexOf(":");
                  const key = l.substring(0, colonIdx).trim();
                  const val = l.substring(colonIdx + 1).trim();
                  return (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground/70 flex-shrink-0 min-w-0 font-medium">{key}:</span>
                      <span className="text-muted-foreground">{val}</span>
                    </div>
                  );
                }
                return <p key={j} className="text-xs text-muted-foreground">{l}</p>;
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Execution Log ─────────────────────────────────────────────────────────────
interface AgentRun {
  run: {
    id: number;
    proposalId: number | null;
    status: string;
    resultSummary: string | null;
    outputData: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  proposal: {
    id: number;
    title: string;
    source: string;
    type: string;
    actionType: string;
    plan: string | null;
    objective: string | null;
    expectedResult: string | null;
    estimatedTime: string | null;
    assetsRequired: string | null;
    priority: string | null;
    outcomeStatus: string | null;
    outcomeNotes: string | null;
    outcomeAt: string | null;
    executedAt: string | null;
    qualityScore: number | null;
  } | null;
}

function ExecutionLog() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: runs = [], isLoading } = useQuery<AgentRun[]>({
    queryKey: ["/api/agents/runs"],
    staleTime: 0,
    refetchOnMount: true,
    enabled: open,
  });

  function timeAgo(ts: string | null) {
    if (!ts) return "";
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const outcomeColors: Record<string, string> = {
    success: "text-green-400 bg-green-500/10 border-green-500/30",
    partial: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    failed: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  const sourceColors: Record<string, string> = {
    advisor: "text-purple-400",
    architect: "text-blue-400",
    playlist: "text-cyan-400",
    licensing: "text-orange-400",
    influencer: "text-pink-400",
  };

  const sourceLabels: Record<string, string> = {
    advisor: "Advisor",
    architect: "Architect",
    playlist: "Playlist",
    licensing: "Licensing",
    influencer: "Influencer",
  };

  const parseAssets = (raw: string | null): string[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return [raw]; }
  };

  return (
    <Card className="border border-border/50">
      <button className="w-full text-left" onClick={() => setOpen(v => !v)} data-testid="toggle-execution-log">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-cyan-400" />
              Execution Log
              {runs.length > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {runs.length} executed
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Full record of every executed proposal</span>
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading execution log...
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No executions yet. Execute an approved proposal to see it logged here.
            </p>
          ) : (
            <div className="space-y-2" data-testid="list-execution-runs">
              {runs.map((item) => {
                const p = item.proposal;
                const r = item.run;
                const isExpanded = expanded === r.id;
                const assets = parseAssets(p?.assetsRequired ?? null);
                return (
                  <div
                    key={r.id}
                    className="rounded-md bg-muted/30 border border-border/30 overflow-hidden"
                    data-testid={`execution-run-${r.id}`}
                  >
                    <button
                      className="w-full text-left p-3 hover:bg-muted/20 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : r.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{p?.title ?? "Unknown proposal"}</span>
                            {p?.source && (
                              <span className={`text-xs font-medium ${sourceColors[p.source] || "text-muted-foreground"}`}>
                                {sourceLabels[p.source] || p.source}
                              </span>
                            )}
                            {p?.outcomeStatus && (
                              <Badge className={`text-xs border ${outcomeColors[p.outcomeStatus] || ""}`}>
                                {p.outcomeStatus === "success" ? "Worked" : p.outcomeStatus === "partial" ? "Partial" : "Didn't Work"}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">{timeAgo(r.completedAt ?? r.startedAt)}</span>
                          </div>
                          {p?.estimatedTime && (
                            <p className="text-xs text-muted-foreground mt-0.5">Timeline: {p.estimatedTime}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Executed: {r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</span>
                          </div>
                          {p?.qualityScore != null && (
                            <QualityScoreBadge score={p.qualityScore} />
                          )}
                        </div>

                        {r.resultSummary ? (
                          <ExecutionReportView report={r.resultSummary} />
                        ) : p?.plan ? (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Action Plan</p>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                              {p.plan}
                            </pre>
                          </div>
                        ) : null}

                        {assets.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Assets to Prepare</p>
                            <ul className="space-y-1">
                              {assets.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <CheckCircle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {p?.outcomeStatus && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Reported Outcome</p>
                            <div className={`inline-flex px-2 py-1 rounded text-xs border ${outcomeColors[p.outcomeStatus] || ""}`}>
                              {p.outcomeStatus === "success" ? "Worked" : p.outcomeStatus === "partial" ? "Partially Worked" : "Didn't Work"}
                            </div>
                            {p.outcomeNotes && (
                              <p className="text-xs text-muted-foreground mt-1">{p.outcomeNotes}</p>
                            )}
                            {p.outcomeAt && (
                              <p className="text-xs text-muted-foreground/60">{new Date(p.outcomeAt).toLocaleString()}</p>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main AI Agent Hub ────────────────────────────────────────────────────────
export default function AdminAgentHub() {
  const { data: allProposals = [] } = useQuery<AgentProposal[]>({
    queryKey: ["/api/agent-proposals"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: recentJobs = [] } = useQuery<AgentJob[]>({
    queryKey: ["/api/agents/jobs"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const pendingCount = allProposals.filter(p => p.status === "pending").length;

  const lastAutoScan = recentJobs.find(j => j.triggeredBy === "system" && j.status === "completed");
  function timeAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl">AI Command Center</h2>
            <p className="text-sm text-muted-foreground">Autonomous agents working to grow your business 24/7</p>
          </div>
        </div>
        {lastAutoScan && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-last-auto-scan">
            <Repeat2 className="w-3.5 h-3.5 text-green-400" />
            Auto-scan: {timeAgo(lastAutoScan.completedAt || lastAutoScan.createdAt)}
          </div>
        )}
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {[
          { icon: Inbox, label: "Inbox", desc: "Proposal approvals", color: "text-primary" },
          { icon: BrainCircuit, label: "Advisor", desc: "Business scanner", color: "text-violet-400" },
          { icon: Cpu, label: "Architect", desc: "Platform improvements", color: "text-cyan-400" },
          { icon: Megaphone, label: "Marketing", desc: "Social media copy", color: "text-pink-400" },
          { icon: BarChart3, label: "Sales Intel", desc: "Revenue insights", color: "text-green-400" },
          { icon: Mail, label: "Email", desc: "Fan campaigns", color: "text-violet-400" },
          { icon: ListMusic, label: "Playlists", desc: "Placement targets", color: "text-green-400" },
          { icon: FileText, label: "Licensing", desc: "Sync & deal opps", color: "text-amber-400" },
          { icon: Users2, label: "Influencers", desc: "Partnership targets", color: "text-pink-400" },
        ].map(({ icon: Icon, label, desc, color }) => (
          <Card key={label} className="bg-card/50">
            <CardContent className="pt-3 pb-3 px-3 text-center space-y-1">
              <Icon className={`w-5 h-5 mx-auto ${color}`} />
              <p className="text-xs font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Command Center Inbox — always visible */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              Command Center Inbox
              {pendingCount > 0 && (
                <Badge className="text-xs bg-primary/20 text-primary border-primary/30 border">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
          </div>
          <CardDescription>
            All proposals from your AI agents live here. Approve to queue execution, reject with notes, or execute directly once approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommandCenterInbox />
        </CardContent>
      </Card>

      <ExecutionLog />

      {/* Jobs Monitor + Memory Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <JobsMonitor />
        <MemoryPanel />
      </div>

      {/* Agent tools tabs */}
      <Tabs defaultValue="advisor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="advisor" data-testid="tab-advisor-agent" className="text-xs">
            <BrainCircuit className="w-3 h-3 mr-1" />
            Advisor
          </TabsTrigger>
          <TabsTrigger value="architect" data-testid="tab-architect-agent" className="text-xs">
            <Cpu className="w-3 h-3 mr-1" />
            Architect
          </TabsTrigger>
          <TabsTrigger value="marketing" data-testid="tab-marketing-agent" className="text-xs">
            <Megaphone className="w-3 h-3 mr-1" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales-agent" className="text-xs">
            <BarChart3 className="w-3 h-3 mr-1" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email-agent" className="text-xs">
            <Mail className="w-3 h-3 mr-1" />
            Email
          </TabsTrigger>
          <TabsTrigger value="ideas" data-testid="tab-ideas-agent" className="text-xs">
            <Lightbulb className="w-3 h-3 mr-1" />
            Strategy
          </TabsTrigger>
          <TabsTrigger value="playlist" data-testid="tab-playlist-agent" className="text-xs">
            <ListMusic className="w-3 h-3 mr-1" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="licensing" data-testid="tab-licensing-agent" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Licensing
          </TabsTrigger>
          <TabsTrigger value="influencer" data-testid="tab-influencer-agent" className="text-xs">
            <Users2 className="w-3 h-3 mr-1" />
            Influencers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advisor" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-violet-400" />
                Strategic Action Advisor
              </CardTitle>
              <CardDescription>
                Scans all platform data — sales, users, catalog, trends — and generates ranked business opportunity proposals sent directly to your Command Center inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionAdvisorAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architect" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Development Architect Agent
              </CardTitle>
              <CardDescription>
                Analyzes your platform for missing features, UX gaps, and integration opportunities. Generates structured improvement proposals sent to the Command Center for your approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchitectAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-pink-400" />
                Marketing Content Agent
              </CardTitle>
              <CardDescription>
                Select any product and instantly generate ready-to-post content for every platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-400" />
                Sales Intelligence Agent
              </CardTitle>
              <CardDescription>
                AI reads your real sales data and delivers strategic business insights and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesIntelligenceAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-violet-400" />
                Email Campaign Agent
              </CardTitle>
              <CardDescription>
                AI writes a full email campaign for your fans. Preview it, then send to all registered users with one click.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailCampaignAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Content Strategy Agent
              </CardTitle>
              <CardDescription>
                AI generates a full weekly content calendar, viral ideas, and revenue opportunities tailored to your catalog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentIdeasAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playlist" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-green-400" />
                Playlist Placement Agent
              </CardTitle>
              <CardDescription>
                Analyzes your catalog and identifies the best playlist targets across Spotify, Apple Music, SubmitHub, and YouTube curator networks. Proposals go straight to your Command Center inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaylistPlacementAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="licensing" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Licensing Intelligence Agent
              </CardTitle>
              <CardDescription>
                Scans your catalog for sync licensing opportunities — TV, film, ads, games, and brand partnerships. Returns deal proposals with pitch strategies saved to your Command Center for approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LicensingAgent />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="influencer" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users2 className="w-4 h-4 text-pink-400" />
                Influencer Partnership Agent
              </CardTitle>
              <CardDescription>
                Identifies genre-aligned influencer types across TikTok, YouTube, and Instagram. Generates partnership proposals with approach strategies and deal structure, saved to your inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InfluencerAgent />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
