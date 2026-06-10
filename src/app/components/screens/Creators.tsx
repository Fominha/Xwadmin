import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Search, X } from "lucide-react";
import { CreatorSidePanel } from "../CreatorSidePanel";
import { getRecommendedRange, parseFollowers, isSilent48h } from "../../lib/scoring";
import { getCurrentUser } from "../../lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { supabase } from "../../lib/supabase";
import { useCampaign } from "../../lib/CampaignContext";
import { CampaignSelector } from "../CampaignSelector";

type ActiveTab = 'all' | 'bidsToScore' | 'negotiating' | 'finalBidSet' | 'waitlisted' | 'notQualified' | 'silent';

export function Creators() {
  const navigate = useNavigate();
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastError, setToastError] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [scoringPanelOpen, setScoringPanelOpen] = useState(false);
  const [scoringCreator, setScoringCreator] = useState<any>(null);
  const [scoringData, setScoringData] = useState({
    contentQuality: "",
    briefAlignment: "",
    audienceOverlap: "",
    nicheTags: [] as string[],
    customTagInput: "",
    formatFit: "",
    pastBrandDeal: false,
    estimatedViews: "",
    recRangeLow: "",
    recRangeHigh: "",
    riskFlag: "",
    notes: "",
    finalBidValue: "",
  });
  const [nicheSearchQuery, setNicheSearchQuery] = useState("");
  const [dismissedAutoFlags, setDismissedAutoFlags] = useState<string[]>([]);
  const [urgencyBannerDismissed, setUrgencyBannerDismissed] = useState(false);
  const [expandedCreatorId, setExpandedCreatorId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "ops") {
      navigate("/dashboard");
    }
  }, [navigate]);

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => { setToastMsg(""); setToastError(false); }, 3000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const [allCreators, setAllCreators] = useState<any[]>([]);

  const fetchCreators = async () => {
    if (!activeCampaign) { setLoading(false); return; }
    setLoading(true);

    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("campaign_id", activeCampaign.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const data = allRows;

    if (data) {
      const normalised = data.map((r: any) => ({
        id: r.id,
        name: r.name ?? "",
        handle: r.handle ?? "",          // raw full URL from sheet
        followers: r.followers
          ? r.followers >= 1000000
            ? `${(r.followers / 1000000).toFixed(1)}M`
            : `${Math.round(r.followers / 1000)}K`
          : "—",
        theirAsk: r.offer ?? 0,
        offerAmount: r.offer ?? 0,
        ask: r.ask ?? 0,
        finalBidAmount: r.final_bid ?? 0,
        finalBid: r.final_bid ? `$${r.final_bid}` : "",
        status: r.status ?? "New",
        stage: r.stage ?? 'new',
        pushedForApproval: r.pushed_for_approval ?? false,
        last_contact: r.last_contact ?? null,
        lastContact: r.last_contact
          ? new Date(r.last_contact).toLocaleDateString()
          : "—",
        contentQuality: r.match_strength ?? "",
        briefAlignment: r.audience_match ?? "",
        audienceOverlap: r.brief_fit_explanation ?? "",
        recRange: r.rec_range_low && r.rec_range_high ? `$${r.rec_range_low}–$${r.rec_range_high}` : "",
        daysSilent: 0,
        opsNotes: r.ops_notes ?? "",
        production_tier: r.production_tier ?? null,
        content_match: r.content_match ?? null,
        audience_fit: r.audience_fit ?? null,
        niche_tags: r.niche_tags ?? [],
      }));
      setAllCreators(normalised);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCreators();
  }, [activeCampaign?.id]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(0);
  }, [activeTab, searchQuery]);

  // Counters — bucketed by stage
  const counts = { new: 0, bidsToScore: 0, negotiating: 0, finalBidSet: 0, silent: 0, waitlisted: 0, notQualified: 0 };
  for (const c of allCreators) {
    if (c.stage === 'new')                counts.new++;
    else if (c.stage === 'has_bid')       counts.bidsToScore++;
    else if (c.stage === 'negotiating')   counts.negotiating++;
    else if (c.stage === 'final_bid_set') counts.finalBidSet++;
    else if (c.stage === 'waitlisted')    counts.waitlisted++;
    else if (c.stage === 'not_qualified') counts.notQualified++;
    if (isSilent48h(c)) counts.silent++;
  }

  const silentCreatorsCount = counts.silent;
  const showUrgencyBanner = silentCreatorsCount > 0 && !urgencyBannerDismissed;

  let list = allCreators;

  const q = (searchQuery || '').trim().toLowerCase();
  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    list = list.filter(c => {
      const haystack = `${c.name || ''} ${c.handle || ''}`.toLowerCase();
      return words.every(w => haystack.includes(w));
    });
  }

  if (activeTab === 'all') {
    list = list.filter(c => ['new', 'has_bid', 'negotiating', 'final_bid_set'].includes(c.stage));
  } else if (activeTab === 'bidsToScore') {
    list = list.filter(c => c.stage === 'has_bid');
  } else if (activeTab === 'negotiating') {
    list = list.filter(c => c.stage === 'negotiating');
  } else if (activeTab === 'finalBidSet') {
    list = list.filter(c => c.stage === 'final_bid_set');
  } else if (activeTab === 'waitlisted') {
    list = list.filter(c => c.stage === 'waitlisted');
  } else if (activeTab === 'notQualified') {
    list = list.filter(c => c.stage === 'not_qualified');
  } else if (activeTab === 'silent') {
    list = list.filter(c => isSilent48h(c));
  }

  const PAGE_SIZE = 100;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visibleCreators = list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleAllVisible() {
    setSelectedIds(prev => {
      const ids = visibleCreators.map(c => String(c.id));
      const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }

  const getColumnsForTab = (): string[] => {
    switch (activeTab) {
      case 'all':          return ["Creator", "Handle", "Their ask", "Stage"];
      case 'bidsToScore':  return ["Creator", "Handle", "Their ask", "Rec. Range"];
      case 'negotiating':  return ["Creator", "Handle", "Their ask", "Rec. Range", "Last contact"];
      case 'finalBidSet':  return ["Creator", "Handle", "Their ask", "Final bid"];
      case 'waitlisted':   return ["Creator", "Handle", "Their ask"];
      case 'notQualified': return ["Creator", "Handle", "Their ask"];
      case 'silent':       return ["Creator", "Handle", "Their ask", "Last contact", "Days silent"];
      default:             return ["Creator", "Handle", "Their ask"];
    }
  };

  const openScoringPanel = (creator: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setScoringCreator(creator);
    setScoringPanelOpen(true);
    const range = getRecommendedRange(creator.theirAsk, parseFollowers(creator.followers));
    setScoringData({
      contentQuality: "",
      briefAlignment: "",
      audienceOverlap: "",
      nicheTags: [],
      customTagInput: "",
      formatFit: "",
      pastBrandDeal: false,
      estimatedViews: "",
      recRangeLow: range ? String(range.low) : "",
      recRangeHigh: range ? String(range.high) : "",
      riskFlag: "",
      notes: "",
      finalBidValue: creator.offerAmount ? String(creator.offerAmount) : "",
    });
    setDismissedAutoFlags([]);
  };

  const getAutoDetectedFlags = (creator: any) => {
    const flags: string[] = [];
    const systemHigh = parseInt(scoringData.recRangeHigh || "0");
    if (isSilent48h(creator)) flags.push("Silent 48h+");
    if (systemHigh > 0 && creator.theirAsk > systemHigh * 2) flags.push("Overpriced");
    if (!scoringData.pastBrandDeal) flags.push("Unproven");
    return flags.filter(f => !dismissedAutoFlags.includes(f));
  };

  const PRESET_TAGS = ["Fashion", "Beauty", "Skincare", "Hair", "Lifestyle", "Fitness", "Wellness", "Food", "Travel", "Tech", "Gaming", "Parenting", "Pet", "Home", "DIY", "Finance", "Education", "Comedy", "Music", "Sports", "Luxury", "Sustainability", "Other"];

  const toggleNicheTag = (tag: string) => {
    setScoringData((prev) => ({
      ...prev,
      nicheTags: prev.nicheTags.includes(tag)
        ? prev.nicheTags.filter((t) => t !== tag)
        : [...prev.nicheTags, tag],
    }));
  };

  const addCustomTag = () => {
    const tag = scoringData.customTagInput.trim();
    if (tag && !scoringData.nicheTags.includes(tag)) {
      setScoringData(prev => ({ ...prev, nicheTags: [...prev.nicheTags, tag], customTagInput: "" }));
    } else {
      setScoringData(prev => ({ ...prev, customTagInput: "" }));
    }
  };

  const removeTag = (tag: string) => {
    setScoringData(prev => ({ ...prev, nicheTags: prev.nicheTags.filter(t => t !== tag) }));
  };

  const closeScoringPanel = () => {
    setScoringPanelOpen(false);
    setScoringCreator(null);
    setNicheSearchQuery("");
    setDismissedAutoFlags([]);
  };

  const buildScoringPayload = () => ({
    match_strength: scoringData.contentQuality || null,
    audience_match: scoringData.briefAlignment || null,
    brief_fit_explanation: scoringData.audienceOverlap || null,
    category: scoringData.formatFit || null,
    expected_plays: scoringData.estimatedViews || null,
    niche_tags: scoringData.nicheTags,
    risk_flag: scoringData.riskFlag || null,
    rec_range_low: scoringData.recRangeLow ? Number(scoringData.recRangeLow) : null,
    rec_range_high: scoringData.recRangeHigh ? Number(scoringData.recRangeHigh) : null,
    ops_notes: scoringData.notes || null,
  });

  // FIX 4: all required scoring fields must be filled to enable outcome buttons
  const scoringComplete =
    scoringData.contentQuality.trim() !== "" &&
    scoringData.briefAlignment.trim() !== "" &&
    scoringData.audienceOverlap.trim() !== "" &&
    scoringData.formatFit.trim() !== "" &&
    scoringData.estimatedViews.trim() !== "" &&
    scoringData.recRangeLow.trim() !== "" &&
    scoringData.recRangeHigh.trim() !== "" &&
    scoringData.nicheTags.length > 0;

  const finalBidValid = scoringData.finalBidValue.trim() !== "" && parseFloat(scoringData.finalBidValue) > 0;

  // FIX 3 + FIX 6: outcome actions — SDK only, check error before closing
  const handleOutcome = async (stage: string, extra: Record<string, any> = {}) => {
    if (!scoringCreator) return;
    setPushing(true);
    const { error } = await supabase
      .from("creators")
      .update({ ...buildScoringPayload(), stage, ...extra })
      .eq("id", scoringCreator.id);
    if (error) {
      setToastError(true);
      setToastMsg("Couldn't save — try again");
      setPushing(false);
      return;
    }
    await fetchCreators();
    closeScoringPanel();
    setToastMsg(`Creator moved to ${stage.replace(/_/g, ' ')}`);
    setPushing(false);
  };

  // Per-row stage transitions — SDK only, check error
  const handleReActivate = async (creatorId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPushing(true);
    const { error } = await supabase.from("creators").update({ stage: 'has_bid' }).eq("id", creatorId);
    if (error) { setToastError(true); setToastMsg("Couldn't save — try again"); setPushing(false); return; }
    await fetchCreators();
    setToastMsg("Re-activated → Bids to score");
    setPushing(false);
  };

  const handlePushForLeadApproval = async (creatorId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPushing(true);
    const { error } = await supabase.from("creators").update({
      stage: 'final_bid_set',
      pushed_for_approval: true,
      pushed_at: new Date().toISOString(),
    }).eq("id", creatorId);
    if (error) { setToastError(true); setToastMsg("Couldn't save — try again"); setPushing(false); return; }
    await fetchCreators();
    setToastMsg("Pushed for Lead approval");
    setPushing(false);
  };

  const handleLogContact = async (creatorId: number) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("creators").update({ last_contact: now }).eq("id", creatorId);
    if (error) { setToastError(true); setToastMsg("Couldn't save — try again"); return; }
    await fetchCreators();
    setToastMsg("Contact logged");
  };

  const STAGE_DISPLAY: Record<string, string> = {
    new: 'New',
    has_bid: 'Bids to score',
    negotiating: 'Negotiating',
    final_bid_set: 'Final bid set',
    pending_approval: 'Pending approval',
    waitlisted: 'Waitlisted',
    not_qualified: 'Not qualified',
  };

  if (!activeCampaign) {
    return <div><CampaignSelector /></div>;
  }

  if (!loading && allCreators.length === 0) {
    return (
      <div>
        <CampaignSelector onCampaignChange={fetchCreators} />
        <div className="p-8 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl mb-2">Pipeline</h1>
            <p className="text-sm text-muted-foreground">Manage bids, scoring and negotiation</p>
          </div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg mb-2">No creators yet</h3>
              <p className="text-sm text-muted-foreground">Import creators to get started</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CampaignSelector onCampaignChange={fetchCreators} />
      <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Manage bids, scoring and negotiation</p>
        </div>
        <div className="flex gap-2" />
      </div>

      {/* Stage ledger */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "New",           count: counts.new },
            { label: "Bids to score", count: counts.bidsToScore },
            { label: "Negotiating",   count: counts.negotiating },
            { label: "Final bid set", count: counts.finalBidSet },
            { label: "Silent 48h+",   count: counts.silent },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg border border-border p-3 text-center">
              <div className="text-xl mb-0.5">{stat.count}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span>Waitlisted: {counts.waitlisted}</span>
            <span>Not qualified: {counts.notQualified}</span>
          </div>
          <span>Lifetime: {allCreators.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Search by name or handle…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {showUrgencyBanner && (
          <div className="bg-amber-100 border border-[#038B97] rounded-lg p-3 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('silent')}
              className="text-sm text-foreground hover:underline flex-1 text-left"
            >
              {silentCreatorsCount} creator{silentCreatorsCount !== 1 ? 's have' : ' has'} gone silent — follow up before they drop.
            </button>
            <button onClick={() => setUrgencyBannerDismissed(true)} className="p-1 hover:bg-amber-200 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all',          label: 'All' },
            { key: 'bidsToScore',  label: 'Bids to score' },
            { key: 'negotiating',  label: 'Negotiating' },
            { key: 'finalBidSet',  label: 'Final bid set' },
            { key: 'waitlisted',   label: 'Waitlisted' },
            { key: 'notQualified', label: 'Not qualified' },
            { key: 'silent',       label: 'Silent 48h+' },
          ] as { key: ActiveTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTab === key
                  ? "bg-[#038B97] text-white border-[#038B97]"
                  : "bg-white text-muted-foreground border-border hover:border-[#038B97]/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={visibleCreators.length > 0 && visibleCreators.every(c => selectedIds.has(String(c.id)))}
                  onCheckedChange={toggleAllVisible}
                />
              </TableHead>
              {getColumnsForTab().map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCreators.map((creator) => {
              const columns = getColumnsForTab();
              const isExpanded = expandedCreatorId === creator.id;

              return (
                <React.Fragment key={creator.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedCreatorId(isExpanded ? null : creator.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(String(creator.id))}
                        onCheckedChange={() => toggleOne(String(creator.id))}
                      />
                    </TableCell>
                    {columns.map((col) => {
                      if (col === "Creator") {
                        return (
                          <TableCell key={col} className="max-w-[220px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={creator.name}>{creator.name}</span>
                              {activeTab === 'finalBidSet' && creator.pushedForApproval && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-xs bg-[#038B97]/10 text-[#038B97] border border-[#038B97]/20 whitespace-nowrap">
                                  Pushed ✓
                                </span>
                              )}
                            </div>
                          </TableCell>
                        );
                      }
                      if (col === "Handle") {
                        return (
                          <TableCell key={col} onClick={(e) => e.stopPropagation()}>
                            {/* FIX 2: raw handle field holds full URL */}
                            <a
                              href={`https://instagram.com/${creator.handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#038B97] hover:underline text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {creator.handle || '—'}
                            </a>
                          </TableCell>
                        );
                      }
                      if (col === "Their ask") {
                        return <TableCell key={col}>${creator.theirAsk}</TableCell>;
                      }
                      if (col === "Stage") {
                        return (
                          <TableCell key={col}>
                            <span className="text-xs text-muted-foreground">
                              {STAGE_DISPLAY[creator.stage] ?? creator.stage}
                            </span>
                          </TableCell>
                        );
                      }
                      if (col === "Rec. Range") {
                        const range = Number(creator.theirAsk) > 0
                          ? getRecommendedRange(creator.theirAsk, parseFollowers(creator.followers))
                          : null;
                        return (
                          <TableCell key={col}>
                            {range === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-[#038B97]">${range.low} – ${range.high}</span>
                                {range.belowFloor && (
                                  <span className="block text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 w-fit">
                                    Below {range.tier} floor (${range.floor})
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      }
                      if (col === "Final bid") {
                        return <TableCell key={col} className="text-sm">{creator.finalBid || "—"}</TableCell>;
                      }
                      if (col === "Last contact") {
                        return <TableCell key={col} className="text-sm text-muted-foreground">{creator.lastContact}</TableCell>;
                      }
                      if (col === "Days silent") {
                        return <TableCell key={col} className="text-sm text-red-600">{creator.daysSilent} days</TableCell>;
                      }
                      return null;
                    })}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {activeTab === 'bidsToScore' && (
                          <Button size="sm" style={{ backgroundColor: "#038B97" }} onClick={(e) => openScoringPanel(creator, e)}>
                            Score
                          </Button>
                        )}
                        {activeTab === 'negotiating' && (
                          <Button size="sm" style={{ backgroundColor: "#038B97" }} onClick={(e) => openScoringPanel(creator, e)}>
                            Edit deal
                          </Button>
                        )}
                        {activeTab === 'finalBidSet' && (
                          <Button
                            size="sm"
                            disabled={pushing || creator.pushedForApproval}
                            style={!creator.pushedForApproval ? { backgroundColor: "#038B97" } : {}}
                            variant={creator.pushedForApproval ? "outline" : "default"}
                            onClick={(e) => handlePushForLeadApproval(creator.id, e)}
                          >
                            {creator.pushedForApproval ? "Pushed ✓" : "Push for Lead approval"}
                          </Button>
                        )}
                        {(activeTab === 'waitlisted' || activeTab === 'notQualified') && (
                          <Button
                            size="sm"
                            disabled={pushing}
                            style={{ backgroundColor: "#038B97" }}
                            onClick={(e) => handleReActivate(creator.id, e)}
                          >
                            Re-activate
                          </Button>
                        )}
                        {(activeTab === 'all' || activeTab === 'silent') && (
                          <Button size="sm" variant="outline" onClick={(e) => openScoringPanel(creator, e)}>
                            Review
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={100} className="bg-muted/30 p-4">
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            {creator.handle} · {creator.followers} followers
                          </div>
                          {(creator.contentQuality || creator.briefAlignment || creator.audienceOverlap) && (
                            <div className="flex gap-2 flex-wrap">
                              {creator.contentQuality && (
                                <span className="px-2 py-1 rounded-full text-xs border bg-blue-100 text-blue-700 border-blue-200">
                                  Content quality: {creator.contentQuality}
                                </span>
                              )}
                              {creator.briefAlignment && (
                                <span className="px-2 py-1 rounded-full text-xs border bg-green-100 text-green-700 border-green-200">
                                  Brief alignment: {creator.briefAlignment}
                                </span>
                              )}
                              {creator.audienceOverlap && (
                                <span className="px-2 py-1 rounded-full text-xs border bg-purple-100 text-purple-700 border-purple-200">
                                  Audience overlap: {creator.audienceOverlap}
                                </span>
                              )}
                            </div>
                          )}
                          {creator.opsNotes && (
                            <div className="text-sm text-muted-foreground italic">{creator.opsNotes}</div>
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); openScoringPanel(creator, e); }}
                              className="text-sm text-[#038B97] hover:underline"
                            >
                              Edit scoring →
                            </button>
                            {creator.stage === "negotiating" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLogContact(creator.id); }}
                                className="text-sm text-[#038B97] hover:underline"
                              >
                                Log contact →
                              </button>
                            )}
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                            >
                              View history →
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} · showing {visibleCreators.length} of {list.length}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {selectedCreator && (
        <CreatorSidePanel creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      )}

      {toastMsg && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm shadow-lg z-50 text-white ${toastError ? "bg-red-600" : "bg-gray-900"}`}>
          {toastMsg}
        </div>
      )}

      {/* Scoring Side Panel */}
      {scoringPanelOpen && scoringCreator && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeScoringPanel} />
          <div className="fixed inset-y-0 right-0 w-[500px] bg-white border-l border-border shadow-2xl z-50 flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl mb-1">{scoringCreator.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {scoringCreator.handle} · {scoringCreator.followers} followers
                </p>
              </div>
              <button onClick={closeScoringPanel} className="p-2 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <Label>Content quality <span className="text-red-500">*</span></Label>
                <Select
                  value={scoringData.contentQuality}
                  onValueChange={(v) => setScoringData({ ...scoringData, contentQuality: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Raw">Raw — first brand deal, unproven format</SelectItem>
                    <SelectItem value="Emerging">Emerging — some brand experience, inconsistent delivery</SelectItem>
                    <SelectItem value="Practiced">Practiced — solid execution, reliable format</SelectItem>
                    <SelectItem value="Fluent">Fluent — strong brand storytelling, high consistency</SelectItem>
                    <SelectItem value="Studio">Studio — premium production, top-tier performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Brief alignment <span className="text-red-500">*</span></Label>
                <Select
                  value={scoringData.briefAlignment}
                  onValueChange={(v) => setScoringData({ ...scoringData, briefAlignment: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select alignment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Off-brief">Off-brief</SelectItem>
                    <SelectItem value="Partially aligned">Partially aligned</SelectItem>
                    <SelectItem value="On-brief">On-brief</SelectItem>
                    <SelectItem value="Perfect fit">Perfect fit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audience overlap <span className="text-red-500">*</span></Label>
                <Select
                  value={scoringData.audienceOverlap}
                  onValueChange={(v) => setScoringData({ ...scoringData, audienceOverlap: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select overlap" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weak overlap">Weak overlap</SelectItem>
                    <SelectItem value="Moderate overlap">Moderate overlap</SelectItem>
                    <SelectItem value="Strong overlap">Strong overlap</SelectItem>
                    <SelectItem value="Ideal match">Ideal match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FIX 5: niche tags with free-text custom entry */}
              <div className="space-y-2">
                <Label>Niche tags <span className="text-red-500">*</span></Label>
                {/* Selected tags (preset + custom) */}
                {scoringData.nicheTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {scoringData.nicheTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#038B97] text-white border border-[#038B97]">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:bg-[#027580] rounded-full p-0.5 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Custom tag input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag, press Enter…"
                    value={scoringData.customTagInput}
                    onChange={(e) => setScoringData(prev => ({ ...prev, customTagInput: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                    className="flex-1"
                  />
                </div>
                {/* Preset tag search */}
                <Input
                  placeholder="Search presets..."
                  value={nicheSearchQuery}
                  onChange={(e) => setNicheSearchQuery(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS
                    .filter((tag) => tag.toLowerCase().includes(nicheSearchQuery.toLowerCase()))
                    .map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleNicheTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          scoringData.nicheTags.includes(tag)
                            ? "bg-[#038B97] text-white border-[#038B97]"
                            : "bg-white text-muted-foreground border-border hover:border-[#038B97]"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Format fit <span className="text-red-500">*</span></Label>
                <Select
                  value={scoringData.formatFit}
                  onValueChange={(v) => setScoringData({ ...scoringData, formatFit: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reel">Reel</SelectItem>
                    <SelectItem value="Static">Static</SelectItem>
                    <SelectItem value="Story">Story</SelectItem>
                    <SelectItem value="UGC hybrid">UGC hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Past brand deal?</Label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScoringData({ ...scoringData, pastBrandDeal: false })}
                    className={`px-4 py-2 rounded border ${!scoringData.pastBrandDeal ? "bg-[#038B97] text-white border-[#038B97]" : "bg-white border-border"}`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setScoringData({ ...scoringData, pastBrandDeal: true })}
                    className={`px-4 py-2 rounded border ${scoringData.pastBrandDeal ? "bg-[#038B97] text-white border-[#038B97]" : "bg-white border-border"}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated views <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground">Suggested: 28,000 views · based on follower count + Reel format</p>
                <Input
                  type="number"
                  value={scoringData.estimatedViews}
                  onChange={(e) => setScoringData({ ...scoringData, estimatedViews: e.target.value })}
                  placeholder="28000"
                />
              </div>

              <div className="space-y-2">
                <Label>Recommended bid range <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground">System range based on follower count, niche, and format</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Low</Label>
                    <Input
                      type="number"
                      value={scoringData.recRangeLow}
                      onChange={(e) => setScoringData({ ...scoringData, recRangeLow: e.target.value })}
                      placeholder="300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">High</Label>
                    <Input
                      type="number"
                      value={scoringData.recRangeHigh}
                      onChange={(e) => setScoringData({ ...scoringData, recRangeHigh: e.target.value })}
                      placeholder="400"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>NEG tier</Label>
                <p className="text-xs text-muted-foreground">System recommended range based on brief formula</p>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {scoringCreator ? (() => {
                    const r = getRecommendedRange(scoringCreator.theirAsk, parseFollowers(scoringCreator.followers));
                    return r ? `$${r.low} – $${r.high}` : "—";
                  })() : "—"}
                </div>
              </div>

              {/* Final bid field */}
              <div className="space-y-2">
                <Label>Final bid</Label>
                <p className="text-xs text-muted-foreground">Pre-filled with creator's offer. Required for "Approve as final bid".</p>
                <Input
                  type="number"
                  value={scoringData.finalBidValue}
                  onChange={(e) => setScoringData({ ...scoringData, finalBidValue: e.target.value })}
                  placeholder="Enter final bid amount"
                />
                {!finalBidValid && (
                  <p className="text-xs text-muted-foreground">Enter a final bid to approve.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Risk flag</Label>
                {scoringCreator && getAutoDetectedFlags(scoringCreator).length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Auto-detected:</div>
                    <div className="flex flex-wrap gap-2">
                      {getAutoDetectedFlags(scoringCreator).map((flag) => (
                        <div key={flag} className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                          {flag}
                          <button
                            onClick={() => setDismissedAutoFlags([...dismissedAutoFlags, flag])}
                            className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Select
                  value={scoringData.riskFlag}
                  onValueChange={(v) => setScoringData({ ...scoringData, riskFlag: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select risk flag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Late history">Late history</SelectItem>
                    <SelectItem value="Low engagement">Low engagement</SelectItem>
                    <SelectItem value="Contract issues">Contract issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ops notes (visible to Lead)</Label>
                <p className="text-xs text-muted-foreground">
                  Pricing history, DM conversations, relationship flags.
                </p>
                <Textarea
                  value={scoringData.notes}
                  onChange={(e) => setScoringData({ ...scoringData, notes: e.target.value })}
                  placeholder="Optional notes about this creator..."
                  rows={4}
                />
              </div>
            </div>

            {/* Footer — outcome buttons only, no plain Save */}
            <div className="p-4 border-t border-border space-y-2">
              {/* FIX 4: disabled until scoringComplete */}
              {!scoringComplete && (
                <p className="text-xs text-muted-foreground text-center">Complete scoring to enable actions.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={pushing || !scoringComplete}
                  onClick={() => handleOutcome('waitlisted')}
                >
                  Waitlist
                </Button>
                <Button
                  variant="outline"
                  disabled={pushing || !scoringComplete}
                  onClick={() => handleOutcome('not_qualified')}
                >
                  Not qualified
                </Button>
                <Button
                  disabled={pushing || !scoringComplete}
                  style={scoringComplete ? { backgroundColor: "#038B97" } : {}}
                  variant={scoringComplete ? "default" : "secondary"}
                  onClick={() => handleOutcome('negotiating', { last_contact: new Date().toISOString() })}
                >
                  Approve for negotiating
                </Button>
                <Button
                  disabled={pushing || !scoringComplete || !finalBidValid}
                  style={scoringComplete && finalBidValid ? { backgroundColor: "#038B97" } : {}}
                  variant={scoringComplete && finalBidValid ? "default" : "secondary"}
                  onClick={() => handleOutcome('final_bid_set', { final_bid: parseFloat(scoringData.finalBidValue) })}
                >
                  Approve as final bid
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={closeScoringPanel}>
                Cancel
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
