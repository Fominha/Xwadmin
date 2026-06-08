import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Search, X } from "lucide-react";
import { CreatorSidePanel } from "../CreatorSidePanel";
import { calculateRecommendedRange, TIER_SHORT } from "../../lib/scoring";
import { getCurrentUser } from "../../lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { supabase } from "../../lib/supabase";

const stages = ["All", "New bid", "Scoring", "Negotiating", "Final bid set", "Silent 48h+"];

const statusStyles: Record<string, string> = {
  "New bid": "bg-amber-100 text-amber-700 border-amber-200",
  "Scoring": "bg-blue-100 text-blue-700 border-blue-200",
  "Negotiating": "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  "Counter sent": "bg-gray-100 text-gray-700 border-gray-200",
  "Silent 48h+": "bg-red-100 text-red-700 border-red-200",
  "Final bid set": "bg-green-100 text-green-700 border-green-200",
  "Passed back": "bg-purple-100 text-purple-700 border-purple-200",
};

export function Creators() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign") || localStorage.getItem("xw_campaign_id");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(searchParams.get("filter") || "All");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [pushing, setPushing] = useState(false);
  const [scoringPanelOpen, setScoringPanelOpen] = useState(false);
  const [scoringCreator, setScoringCreator] = useState<any>(null);
  const [scoringData, setScoringData] = useState({
    contentQuality: "",
    briefAlignment: "",
    audienceOverlap: "",
    nicheTags: [] as string[],
    formatFit: "",
    pastBrandDeal: false,
    estimatedViews: "",
    recRangeLow: "",
    recRangeHigh: "",
    riskFlag: "",
    notes: "",
  });
  const [passedBackCreators, setPassedBackCreators] = useState<Record<number, string>>({});
  const [nicheSearchQuery, setNicheSearchQuery] = useState("");
  const [dismissedAutoFlags, setDismissedAutoFlags] = useState<string[]>([]);
  const [urgencyBannerDismissed, setUrgencyBannerDismissed] = useState(false);
  const [expandedCreatorId, setExpandedCreatorId] = useState<number | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "ops") {
      navigate("/dashboard");
    }

    // Load passed back creators from localStorage
    const passedBack = JSON.parse(localStorage.getItem("xw_passed_back_creators") || "[]");
    const passedBackMap: Record<number, string> = {};
    passedBack.forEach((item: any) => {
      passedBackMap[item.id] = item.reason;
    });
    setPassedBackCreators(passedBackMap);
  }, [navigate]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  // Fetch creators from Supabase
  const [allCreators, setAllCreators] = useState<any[]>([]);

  const fetchCreators = async () => {
    if (!campaignId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("creators")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (data) {
      // Normalise Supabase rows to the shape the rest of the UI expects
      const normalised = data.map((r: any) => ({
        id: r.id,
        name: r.name ?? "",
        handle: r.handle ?? "",
        followers: r.followers ? `${Math.round(r.followers / 1000)}K` : "—",
        size: "—",
        theirAsk: r.bid ?? r.their_ask ?? 0,
        status: r.status ?? "New bid",
        lastContact: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—",
        contentQuality: r.content_quality ?? "",
        briefAlignment: r.brief_alignment ?? "",
        audienceOverlap: r.audience_overlap ?? "",
        recRange: r.rec_range ?? "",
        finalBid: r.final_bid ? `$${r.final_bid}` : "",
        daysSilent: r.days_silent ?? 0,
        pipelineStage: r.pipeline_stage ?? 0,
        opsNotes: r.ops_notes ?? "",
        score: r.score ?? null,
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
  }, [campaignId]);

  // Priority sorting order for All tab
  const priorityOrder: Record<string, number> = {
    "Silent 48h+": 1,
    "Final bid set": 2,
    "Negotiating": 3,
    "Counter sent": 4,
    "New bid": 5,
    "Scoring": 6,
  };

  // Sort creators by priority
  const sortedCreators = [...allCreators].sort((a, b) => {
    const aOrder = priorityOrder[a.status] || 999;
    const bOrder = priorityOrder[b.status] || 999;
    return aOrder - bOrder;
  });

  // Filter creators
  const filteredCreators = sortedCreators.filter((creator) => {
    // Filter by stage
    if (activeFilter === "urgent") {
      if (creator.status !== "New bid" && creator.status !== "Silent 48h+") {
        return false;
      }
    } else if (activeFilter === "Negotiating") {
      // Negotiating tab includes both "Negotiating" and "Counter sent" statuses
      if (creator.status !== "Negotiating" && creator.status !== "Counter sent") {
        return false;
      }
    } else if (activeFilter !== "All" && creator.status !== activeFilter) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        creator.name.toLowerCase().includes(query) ||
        creator.handle.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const creators = filteredCreators;

  const silentCreatorsCount = allCreators.filter(c => c.status === "Silent 48h+").length;
  const showUrgencyBanner = silentCreatorsCount > 0 && !urgencyBannerDismissed;

  const getRecRange = (ask: number) => calculateRecommendedRange(ask);

  const getPrimaryActionButton = (creator: any) => {
    if (creator.status === "Silent 48h+") {
      return { label: "Follow up →", variant: "outline-red" };
    }
    if (creator.status === "New bid") {
      return { label: "Score now →", variant: "teal" };
    }
    if (creator.status === "Scoring") {
      const isComplete = creator.contentQuality && creator.briefAlignment;
      return isComplete ? { label: "Send counter →", variant: "teal" } : { label: "Complete scoring →", variant: "teal" };
    }
    if (creator.status === "Negotiating" || creator.status === "Counter sent") {
      if (creator.daysSilent > 2) {
        return { label: "Follow up →", variant: "outline-red" };
      }
      return creator.status === "Counter sent" ? { label: "Mark final bid →", variant: "teal" } : { label: "Send counter →", variant: "teal" };
    }
    if (creator.status === "Final bid set") {
      return { label: "Send to Lead →", variant: "teal" };
    }
    return { label: "Review", variant: "teal" };
  };

  const getPipelineStages = (creator: any) => {
    const stages = ["Scored", "Counter sent", "Final bid", "Sent to Lead", "Client ready"];
    const currentStage = creator.pipelineStage;
    return stages.map((stage, idx) => ({
      name: stage,
      status: idx < currentStage ? "completed" : idx === currentStage ? "current" : "pending",
    }));
  };

  const getColumnsForFilter = () => {
    switch (activeFilter) {
      case "New bid":
        return ["Creator", "Their ask", "Last contact"];
      case "Scoring":
        return ["Creator", "Their ask", "Content quality", "Brief alignment", "Last contact"];
      case "Negotiating":
        return ["Creator", "Their ask", "Rec. Range", "Last contact"];
      case "Final bid set":
        return ["Creator", "Their ask", "Rec. Range", "Final bid"];
      case "Silent 48h+":
        return ["Creator", "Their ask", "Last contact", "Days silent"];
      default:
        // "All" tab
        return ["Creator", "Their ask", "Rec. Range", "Status", "Last contact"];
    }
  };

  const openScoringPanel = (creator: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setScoringCreator(creator);
    setScoringPanelOpen(true);
    const range = calculateRecommendedRange(creator.theirAsk);
    const [low, high] = range.replace(/\$/g, "").split("–");
    setScoringData({
      contentQuality: "",
      briefAlignment: "",
      audienceOverlap: "",
      nicheTags: [],
      formatFit: "",
      pastBrandDeal: false,
      estimatedViews: "",
      recRangeLow: low,
      recRangeHigh: high,
      riskFlag: "",
      notes: "",
    });
    setDismissedAutoFlags([]);
  };

  const getAutoDetectedFlags = (creator: any) => {
    const flags: string[] = [];
    const systemHigh = parseInt(scoringData.recRangeHigh || "0");

    if (creator.status === "Silent 48h+") {
      flags.push("Silent 48h+");
    }
    if (systemHigh > 0 && creator.theirAsk > systemHigh * 2) {
      flags.push("Overpriced");
    }
    if (!scoringData.pastBrandDeal) {
      flags.push("Unproven");
    }

    return flags.filter(f => !dismissedAutoFlags.includes(f));
  };

  const toggleNicheTag = (tag: string) => {
    setScoringData((prev) => ({
      ...prev,
      nicheTags: prev.nicheTags.includes(tag)
        ? prev.nicheTags.filter((t) => t !== tag)
        : [...prev.nicheTags, tag],
    }));
  };

  const closeScoringPanel = () => {
    setScoringPanelOpen(false);
    setScoringCreator(null);
    setNicheSearchQuery("");
    setDismissedAutoFlags([]);
  };

  const saveScoringData = async () => {
    if (!scoringCreator) return;
    await supabase.from("creators").update({
      content_quality: scoringData.contentQuality,
      brief_alignment: scoringData.briefAlignment,
      audience_overlap: scoringData.audienceOverlap,
      niche_tags: scoringData.nicheTags,
      format_fit: scoringData.formatFit,
      past_brand_deal: scoringData.pastBrandDeal,
      estimated_views: scoringData.estimatedViews ? parseInt(scoringData.estimatedViews) : null,
      rec_range: scoringData.recRangeLow && scoringData.recRangeHigh
        ? `$${scoringData.recRangeLow}–$${scoringData.recRangeHigh}`
        : null,
      risk_flag: scoringData.riskFlag,
      ops_notes: scoringData.notes,
      status: "Scored",
      updated_at: new Date().toISOString(),
    }).eq("id", scoringCreator.id);
    await fetchCreators();
    setToastMsg("Scoring saved");
    closeScoringPanel();
  };

  const handlePushToFundify = async () => {
    const selectedCreators = allCreators.filter(c => selectedIds.includes(c.id));
    const unscored = selectedCreators.filter(c => c.score === null && c.production_tier === null);
    if (unscored.length > 0) return;

    setPushing(true);
    await supabase.from("creators").update({
      status: "Pushed",
      pushed_at: new Date().toISOString(),
    }).in("id", selectedIds);

    await supabase.from("client_selections").insert(
      selectedCreators.map(c => ({
        campaign_id: campaignId,
        creator_id: c.id,
        handle: c.handle,
        name: c.name,
        execution_price: c.theirAsk,
        production_tier: c.production_tier,
        decision: "Pending",
        pushed_at: new Date().toISOString(),
      }))
    );

    await fetchCreators();
    setSelectedIds([]);
    setToastMsg(`${selectedCreators.length} creator${selectedCreators.length !== 1 ? "s" : ""} pushed to Fundify`);
    setPushing(false);
  };

  // Empty state check
  if (!loading && creators.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl mb-2">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Manage bids, scoring and negotiation
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg mb-2">No bids received yet</h3>
            <p className="text-sm text-muted-foreground">Import creators to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Manage bids, scoring and negotiation
          </p>
        </div>
        <div className="flex gap-2">
          {activeFilter === "Silent 48h+" && (
            <Button
              disabled={selectedIds.length === 0}
              variant="outline"
              style={selectedIds.length > 0 ? { borderColor: "#038B97", color: "#038B97" } : {}}
            >
              Send follow-up ({selectedIds.length})
            </Button>
          )}
          {activeFilter === "Final bid set" && (
            <Button
              disabled={selectedIds.length === 0}
              style={selectedIds.length > 0 ? { backgroundColor: "#038B97" } : {}}
            >
              Mark final bid ({selectedIds.length})
            </Button>
          )}
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
              onClick={() => setActiveFilter("Silent 48h+")}
              className="text-sm text-foreground hover:underline flex-1 text-left"
            >
              {silentCreatorsCount} creator{silentCreatorsCount !== 1 ? 's have' : ' has'} gone silent — follow up before they drop.
            </button>
            <button
              onClick={() => setUrgencyBannerDismissed(true)}
              className="p-1 hover:bg-amber-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveFilter(stage)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeFilter === stage
                  ? "bg-[#038B97] text-white border-[#038B97]"
                  : "bg-white text-muted-foreground border-border hover:border-[#038B97]/50"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              {getColumnsForFilter().map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
              <TableHead>Pipeline</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => {
              const columns = getColumnsForFilter();
              const actionButton = getPrimaryActionButton(creator);
              const stages = getPipelineStages(creator);
              const isExpanded = expandedCreatorId === creator.id;

              return (
                <React.Fragment key={creator.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedCreatorId(isExpanded ? null : creator.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(creator.id)}
                        onCheckedChange={(checked) => {
                          setSelectedIds(prev =>
                            checked ? [...prev, creator.id] : prev.filter(id => id !== creator.id)
                          );
                        }}
                      />
                    </TableCell>
                    {columns.map((col) => {
                      if (col === "Creator") {
                        return <TableCell key={col}>{creator.name}</TableCell>;
                      }
                      if (col === "Their ask") {
                        return <TableCell key={col}>${creator.theirAsk}</TableCell>;
                      }
                      if (col === "Rec. Range") {
                        return (
                          <TableCell key={col} className="text-[#038B97]">
                            {creator.recRange || (activeFilter === "All" ? (
                              <span className="px-2 py-1 rounded-full text-xs border bg-muted text-muted-foreground border-border">
                                Score needed
                              </span>
                            ) : "—")}
                          </TableCell>
                        );
                      }
                      if (col === "Content quality") {
                        return <TableCell key={col} className="text-sm">{creator.contentQuality || "—"}</TableCell>;
                      }
                      if (col === "Brief alignment") {
                        return <TableCell key={col} className="text-sm">{creator.briefAlignment || "—"}</TableCell>;
                      }
                      if (col === "Final bid") {
                        return <TableCell key={col} className="text-sm">{creator.finalBid || "—"}</TableCell>;
                      }
                      if (col === "Days silent") {
                        return <TableCell key={col} className="text-sm text-red-600">{creator.daysSilent} days</TableCell>;
                      }
                      if (col === "Status") {
                        return (
                          <TableCell key={col}>
                            {passedBackCreators[creator.id] ? (
                              <span className={`px-2 py-1 rounded-full text-xs border inline-flex flex-col ${statusStyles["Passed back"]}`}>
                                <span>Passed back</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{passedBackCreators[creator.id]}</span>
                              </span>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs border ${statusStyles[creator.status]}`}>
                                {creator.status}
                              </span>
                            )}
                          </TableCell>
                        );
                      }
                      if (col === "Last contact") {
                        return <TableCell key={col} className="text-sm text-muted-foreground">{creator.lastContact}</TableCell>;
                      }
                      return null;
                    })}
                    {/* Pipeline stage track */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {stages.map((stage, idx) => (
                          <div
                            key={idx}
                            className="group relative"
                            title={stage.name}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                stage.status === "completed"
                                  ? "bg-[#038B97]"
                                  : stage.status === "current"
                                  ? "bg-amber-500"
                                  : "bg-gray-300"
                              }`}
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {stage.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    {/* Action button */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={actionButton.variant === "outline-red" ? "outline" : "default"}
                        className={actionButton.variant === "outline-red" ? "border-red-500 text-red-600" : ""}
                        style={actionButton.variant === "teal" ? { backgroundColor: "#038B97" } : {}}
                        onClick={(e) => {
                          if (creator.status === "New bid" || creator.status === "Scoring" || activeFilter === "New bid" || activeFilter === "Scoring") {
                            openScoringPanel(creator, e);
                          }
                        }}
                      >
                        {actionButton.label}
                      </Button>
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
                            <div className="text-sm text-muted-foreground italic">
                              {creator.opsNotes}
                            </div>
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openScoringPanel(creator, e);
                              }}
                              className="text-sm text-[#038B97] hover:underline"
                            >
                              Edit scoring →
                            </button>
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

      {selectedCreator && (
        <CreatorSidePanel
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
        />
      )}

      {/* Batch push action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-8 py-4 flex items-center justify-between z-30">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} creator{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
          <div className="relative group">
            <Button
              style={
                allCreators.filter(c => selectedIds.includes(c.id)).every(c => c.score !== null || c.production_tier !== null)
                  ? { backgroundColor: "#038B97" }
                  : {}
              }
              disabled={
                pushing ||
                !allCreators.filter(c => selectedIds.includes(c.id)).every(c => c.score !== null || c.production_tier !== null)
              }
              onClick={handlePushToFundify}
            >
              {pushing ? "Pushing..." : `Push to Fundify (${selectedIds.length})`}
            </Button>
            {!allCreators.filter(c => selectedIds.includes(c.id)).every(c => c.score !== null || c.production_tier !== null) && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                All selected creators must be scored first
              </div>
            )}
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          {toastMsg}
        </div>
      )}

      {/* Scoring Side Panel */}
      {scoringPanelOpen && scoringCreator && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeScoringPanel}
          />
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
                <Label>Content quality</Label>
                <Select
                  value={scoringData.contentQuality}
                  onValueChange={(v) => setScoringData({ ...scoringData, contentQuality: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
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
                <Label>Brief alignment</Label>
                <Select
                  value={scoringData.briefAlignment}
                  onValueChange={(v) => setScoringData({ ...scoringData, briefAlignment: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Off-brief">Off-brief</SelectItem>
                    <SelectItem value="Partially aligned">Partially aligned</SelectItem>
                    <SelectItem value="On-brief">On-brief</SelectItem>
                    <SelectItem value="Perfect fit">Perfect fit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audience overlap</Label>
                <Select
                  value={scoringData.audienceOverlap}
                  onValueChange={(v) => setScoringData({ ...scoringData, audienceOverlap: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select overlap" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weak overlap">Weak overlap</SelectItem>
                    <SelectItem value="Moderate overlap">Moderate overlap</SelectItem>
                    <SelectItem value="Strong overlap">Strong overlap</SelectItem>
                    <SelectItem value="Ideal match">Ideal match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Niche tags</Label>
                <Input
                  placeholder="Search tags..."
                  value={nicheSearchQuery}
                  onChange={(e) => setNicheSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  {["Fashion", "Beauty", "Skincare", "Hair", "Lifestyle", "Fitness", "Wellness", "Food", "Travel", "Tech", "Gaming", "Parenting", "Pet", "Home", "DIY", "Finance", "Education", "Comedy", "Music", "Sports", "Luxury", "Sustainability", "Other"]
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
                <Label>Format fit</Label>
                <Select
                  value={scoringData.formatFit}
                  onValueChange={(v) => setScoringData({ ...scoringData, formatFit: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
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
                    className={`px-4 py-2 rounded border ${
                      !scoringData.pastBrandDeal
                        ? "bg-[#038B97] text-white border-[#038B97]"
                        : "bg-white border-border"
                    }`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setScoringData({ ...scoringData, pastBrandDeal: true })}
                    className={`px-4 py-2 rounded border ${
                      scoringData.pastBrandDeal
                        ? "bg-[#038B97] text-white border-[#038B97]"
                        : "bg-white border-border"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated views</Label>
                <p className="text-xs text-muted-foreground">Suggested: 28,000 views · based on follower count + Reel format</p>
                <Input
                  type="number"
                  value={scoringData.estimatedViews}
                  onChange={(e) => setScoringData({ ...scoringData, estimatedViews: e.target.value })}
                  placeholder="28000"
                />
              </div>

              <div className="space-y-2">
                <Label>Recommended bid range</Label>
                <p className="text-xs text-muted-foreground">System range: $300–$400 · based on follower count, niche, and format</p>
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
                  {scoringCreator ? calculateRecommendedRange(scoringCreator.theirAsk) : "—"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Risk flag</Label>
                {scoringCreator && getAutoDetectedFlags(scoringCreator).length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Auto-detected:</div>
                    <div className="flex flex-wrap gap-2">
                      {getAutoDetectedFlags(scoringCreator).map((flag) => (
                        <div
                          key={flag}
                          className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"
                        >
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk flag" />
                  </SelectTrigger>
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
                  Use this to share context Lead needs to make an approval decision — pricing history, DM conversations, relationship flags.
                </p>
                <Textarea
                  value={scoringData.notes}
                  onChange={(e) => setScoringData({ ...scoringData, notes: e.target.value })}
                  placeholder="Optional notes about this creator..."
                  rows={4}
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeScoringPanel}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                style={{ backgroundColor: "#038B97" }}
                onClick={saveScoringData}
              >
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
