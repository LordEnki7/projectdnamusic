import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Radio, Search, Send, Plus, Trash2, RefreshCw, CheckCircle, Mail, MapPin, Globe } from 'lucide-react';
import type { RadioStation, OutreachCampaign, OutreachContact } from '@shared/schema';

export default function RadioOutreachAgent() {
  const { toast } = useToast();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [researchType, setResearchType] = useState<'both' | 'college' | 'b-market'>('both');
  const [newStation, setNewStation] = useState({ name: '', type: 'college', market: '', state: '', email: '', website: '', format: '', submissionNotes: '' });
  const [showAddStation, setShowAddStation] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ songTitle: 'County Line Rd', songUrl: '', artistBio: '', targetTypes: 'college,b-market' });

  const { data: stations = [], isLoading: stationsLoading } = useQuery<RadioStation[]>({
    queryKey: ['/api/admin/outreach/stations'],
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<OutreachCampaign[]>({
    queryKey: ['/api/admin/outreach/campaigns'],
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<OutreachContact[]>({
    queryKey: ['/api/admin/outreach/campaigns', selectedCampaignId, 'contacts'],
    queryFn: () => selectedCampaignId ? apiRequest('GET', `/api/admin/outreach/campaigns/${selectedCampaignId}/contacts`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!selectedCampaignId,
  });

  const researchMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/outreach/research', { type: researchType }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/stations'] });
      toast({ title: 'Research complete', description: data.message });
    },
    onError: (err: any) => toast({ title: 'Research failed', description: err.message, variant: 'destructive' }),
  });

  const addStationMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/outreach/stations', newStation).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/stations'] });
      setNewStation({ name: '', type: 'college', market: '', state: '', email: '', website: '', format: '', submissionNotes: '' });
      setShowAddStation(false);
      toast({ title: 'Station added' });
    },
    onError: (err: any) => toast({ title: 'Failed to add station', description: err.message, variant: 'destructive' }),
  });

  const deleteStationMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/outreach/stations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/stations'] }),
  });

  const createCampaignMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/outreach/campaigns', newCampaign).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/campaigns'] });
      setSelectedCampaignId(data.id);
      toast({ title: 'Campaign created', description: `Ready to prepare emails for "${data.songTitle}"` });
    },
    onError: (err: any) => toast({ title: 'Failed to create campaign', description: err.message, variant: 'destructive' }),
  });

  const prepareMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/admin/outreach/campaigns/${id}/prepare`).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/campaigns', selectedCampaignId, 'contacts'] });
      toast({ title: 'Emails prepared', description: data.message });
    },
    onError: (err: any) => toast({ title: 'Preparation failed', description: err.message, variant: 'destructive' }),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/admin/outreach/campaigns/${id}/confirm`).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/outreach/campaigns', selectedCampaignId, 'contacts'] });
      toast({ title: 'Campaign sent!', description: data.message });
    },
    onError: (err: any) => toast({ title: 'Send failed', description: err.message, variant: 'destructive' }),
  });

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const collegeStations = stations.filter(s => s.type === 'college');
  const bMarketStations = stations.filter(s => s.type === 'b-market');

  const statusColor = (status: string) => {
    if (status === 'sent') return 'default';
    if (status === 'failed') return 'destructive';
    return 'secondary';
  };

  const campaignStatusColor = (status: string) => {
    if (status === 'complete') return 'default';
    if (status === 'ready') return 'secondary';
    if (status === 'sending') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-purple-500/10">
          <Radio className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Radio Outreach Agent</h2>
          <p className="text-sm text-muted-foreground">Research stations, generate personalized pitches, and send your music directly to music directors.</p>
        </div>
      </div>

      <Tabs defaultValue="stations">
        <TabsList className="gap-1">
          <TabsTrigger value="stations" data-testid="tab-outreach-stations">
            Stations <Badge variant="secondary" className="ml-1.5">{stations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-outreach-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-outreach-results">Results</TabsTrigger>
        </TabsList>

        {/* ── STATIONS TAB ── */}
        <TabsContent value="stations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Find Stations</CardTitle>
              <CardDescription>Let the agent research and add college and B-market stations that accept unsolicited music.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['both', 'college', 'b-market'] as const).map(t => (
                  <Button key={t} size="sm" variant={researchType === t ? 'default' : 'outline'}
                    onClick={() => setResearchType(t)} data-testid={`button-research-type-${t}`}>
                    {t === 'both' ? 'Both Types' : t === 'college' ? 'College Only' : 'B-Market Only'}
                  </Button>
                ))}
              </div>
              <Button onClick={() => researchMutation.mutate()} disabled={researchMutation.isPending}
                className="w-full" data-testid="button-research-stations">
                {researchMutation.isPending
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Researching...</>
                  : <><Search className="w-4 h-4 mr-2" />Research & Add Stations</>}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {collegeStations.length} college · {bMarketStations.length} B-market
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddStation(v => !v)}
              data-testid="button-add-station-toggle">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add Manually
            </Button>
          </div>

          {showAddStation && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Station name" value={newStation.name}
                    onChange={e => setNewStation(s => ({ ...s, name: e.target.value }))}
                    data-testid="input-station-name" />
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={newStation.type} onChange={e => setNewStation(s => ({ ...s, type: e.target.value }))}
                    data-testid="select-station-type">
                    <option value="college">College</option>
                    <option value="b-market">B-Market</option>
                  </select>
                  <Input placeholder="City/Market" value={newStation.market}
                    onChange={e => setNewStation(s => ({ ...s, market: e.target.value }))}
                    data-testid="input-station-market" />
                  <Input placeholder="State (e.g. NY)" value={newStation.state}
                    onChange={e => setNewStation(s => ({ ...s, state: e.target.value }))}
                    data-testid="input-station-state" />
                  <Input placeholder="Submission email" value={newStation.email}
                    onChange={e => setNewStation(s => ({ ...s, email: e.target.value }))}
                    data-testid="input-station-email" />
                  <Input placeholder="Website" value={newStation.website}
                    onChange={e => setNewStation(s => ({ ...s, website: e.target.value }))}
                    data-testid="input-station-website" />
                  <Input placeholder="Format (e.g. Hip-Hop & R&B)" value={newStation.format}
                    onChange={e => setNewStation(s => ({ ...s, format: e.target.value }))}
                    className="col-span-2" data-testid="input-station-format" />
                </div>
                <Textarea placeholder="Submission notes (optional)" value={newStation.submissionNotes}
                  onChange={e => setNewStation(s => ({ ...s, submissionNotes: e.target.value }))}
                  className="min-h-[60px]" data-testid="input-station-notes" />
                <Button onClick={() => addStationMutation.mutate()} disabled={addStationMutation.isPending}
                  className="w-full" data-testid="button-save-station">
                  {addStationMutation.isPending ? 'Saving...' : 'Save Station'}
                </Button>
              </CardContent>
            </Card>
          )}

          {stationsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading stations...</p>
          ) : stations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Radio className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No stations yet. Click "Research & Add Stations" to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stations.map(station => (
                <Card key={station.id} data-testid={`card-station-${station.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{station.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">{station.type}</Badge>
                          {station.format && <Badge variant="secondary" className="text-xs">{station.format}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {station.market && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{station.market}{station.state ? `, ${station.state}` : ''}
                            </span>
                          )}
                          {station.email && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />{station.email}
                            </span>
                          )}
                          {station.website && (
                            <a href={station.website} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-purple-400 flex items-center gap-1">
                              <Globe className="w-3 h-3" />Website
                            </a>
                          )}
                        </div>
                        {station.submissionNotes && (
                          <p className="text-xs text-muted-foreground/70 mt-1">{station.submissionNotes}</p>
                        )}
                      </div>
                      <Button size="icon" variant="ghost"
                        onClick={() => deleteStationMutation.mutate(station.id)}
                        data-testid={`button-delete-station-${station.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── CAMPAIGNS TAB ── */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Campaign</CardTitle>
              <CardDescription>The agent will write a personalized pitch to every station in your list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Song title" value={newCampaign.songTitle}
                onChange={e => setNewCampaign(c => ({ ...c, songTitle: e.target.value }))}
                data-testid="input-campaign-song" />
              <Input placeholder="Song link (SoundCloud, Spotify, etc.) — optional"
                value={newCampaign.songUrl}
                onChange={e => setNewCampaign(c => ({ ...c, songUrl: e.target.value }))}
                data-testid="input-campaign-url" />
              <Textarea placeholder="Artist bio — optional (agent will use a default if left blank)"
                value={newCampaign.artistBio}
                onChange={e => setNewCampaign(c => ({ ...c, artistBio: e.target.value }))}
                className="min-h-[80px]" data-testid="input-campaign-bio" />
              <Button onClick={() => createCampaignMutation.mutate()}
                disabled={createCampaignMutation.isPending || !newCampaign.songTitle}
                className="w-full" data-testid="button-create-campaign">
                {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </CardContent>
          </Card>

          {campaignsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading campaigns...</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No campaigns yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <Card key={campaign.id}
                  className={selectedCampaignId === campaign.id ? 'border-purple-500/50' : ''}
                  data-testid={`card-campaign-${campaign.id}`}>
                  <CardContent className="py-4 px-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm text-foreground">{campaign.songTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {new Date(campaign.createdAt).toLocaleDateString()}
                          {campaign.sentAt && ` · Sent ${new Date(campaign.sentAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant={campaignStatusColor(campaign.status)} className="capitalize text-xs">
                        {campaign.status}
                      </Badge>
                    </div>

                    {campaign.totalSent ? (
                      <p className="text-xs text-muted-foreground">{campaign.totalSent} emails sent</p>
                    ) : null}

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline"
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        data-testid={`button-select-campaign-${campaign.id}`}>
                        {selectedCampaignId === campaign.id ? 'Selected' : 'Select'}
                      </Button>
                      {selectedCampaignId === campaign.id && campaign.status !== 'complete' && (
                        <Button size="sm" variant="outline"
                          onClick={() => prepareMutation.mutate(campaign.id)}
                          disabled={prepareMutation.isPending || stations.length === 0}
                          data-testid={`button-prepare-campaign-${campaign.id}`}>
                          {prepareMutation.isPending
                            ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Writing emails...</>
                            : <><Mail className="w-3.5 h-3.5 mr-1.5" />Prepare Emails</>}
                        </Button>
                      )}
                      {selectedCampaignId === campaign.id && campaign.status === 'ready' && (
                        <Button size="sm"
                          onClick={() => confirmMutation.mutate(campaign.id)}
                          disabled={confirmMutation.isPending}
                          className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
                          data-testid={`button-confirm-send-${campaign.id}`}>
                          {confirmMutation.isPending
                            ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
                            : <><Send className="w-3.5 h-3.5 mr-1.5" />Confirm & Send</>}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── RESULTS TAB ── */}
        <TabsContent value="results" className="space-y-4 mt-4">
          {!selectedCampaignId ? (
            <div className="text-center py-10 text-muted-foreground">
              <Send className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a campaign in the Campaigns tab to see results.</p>
            </div>
          ) : contactsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : contacts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No emails yet for this campaign. Go to Campaigns and click "Prepare Emails".</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  {contacts.filter(c => c.status === 'sent').length} sent
                </span>
                <span>{contacts.filter(c => c.status === 'pending').length} pending</span>
                <span>{contacts.filter(c => c.status === 'failed').length} failed</span>
              </div>
              <div className="space-y-2">
                {contacts.map(contact => (
                  <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{contact.stationName}</span>
                            <Badge variant={statusColor(contact.status)} className="text-xs capitalize">
                              {contact.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{contact.stationEmail}</p>
                          {contact.emailSubject && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">"{contact.emailSubject}"</p>
                          )}
                          {contact.sentAt && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              Sent {new Date(contact.sentAt).toLocaleString()}
                            </p>
                          )}
                          {contact.errorMessage && (
                            <p className="text-xs text-destructive mt-1">{contact.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
