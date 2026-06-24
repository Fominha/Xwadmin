import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { getTierLabel, TIER_SHORT, CONTENT_MATCH_SHORT, AUDIENCE_FIT_SHORT } from "../../lib/scoring";
import { getCurrentUser } from "../../lib/auth";
import { Toast } from "../Toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useCampaign } from "../../lib/CampaignContext";

interface Creator {
  id: string;
  name: string;
  handle: string;
  size: string;
  tierNum: number;
  finalPrice: number;
  marketRateHigh: number;
  contentMatchNum: number;
  audienceFitNum: number;
  whyXWRecommends: string;
  briefFitExplanation: string;
  audienceFitExplanation: string;
  opsNotes: string;
  opsName?: string;
  contentQuality?: string;
  briefAlignment?: string;
  audienceOverlap?: string;
}

interface ApprovedCreator extends Creator {
  approvedDate: string;
  clientStatus: "Pending view" | "Viewed" | "Waitlisted" | "Ordered" | "Passed";
}

interface PassedBackCreator extends Creator {
  passBackReason: string;
  passBackDate: string;
}

export function Approvals() {
  const navigate = useNavigate();
  const { activeCampaign } = useCampaign();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [passBackPopoverId, setPassBackPopoverId] = useState<string | null>(null);
  const [passBackReason, setPassBackReason] = useState("");
  const [passBackError, setPassBackError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [visibleCreators, setVisibleCreators] = useState<Creator[]>([]);
  const [levelLegendOpen, setLevelLegendOpen] = useState(false);
  const [sentToClientExpanded, setSentToClientExpanded] = useState(false);
  const [passedBackExpanded, setPassedBackExpanded] = useState(false);
  const [approvedCreators, setApprovedCreators] = useState<ApprovedCreator[]>([]);
  const [passedBackCreators, setPassedBackCreators] = useState<PassedBackCreator[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "lead") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const msaBudget = 10000;
  const realized = 9400;

  const fetchPushedCreators = async () => {
    if (!activeCampaign) { setVisibleCreators([]); return; }
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .eq("campaign_id", activeCampaign.id)
      .eq("pushed_for_approval", true)
      .order("pushed_at", { ascending: false });
    if (error || !data) { setVisibleCreators([]); return; }
    const mapped: Creator[] = data.map((r: any) => ({
      id: r.id,
      name: r.name ?? "",
      handle: r.handle ?? "",
      size: r.size ?? "—",
      tierNum: r.production_tier ?? 0,
      finalPrice: r.final_bid ?? 0,
      marketRateHigh: r.rec_range_high ?? 0,
      contentMatchNum: r.content_match ?? 0,
      audienceFitNum: r.audience_fit ?? 0,
      whyXWRecommends: r.why_xw_recommends ?? "",
      briefFitExplanation: r.audience_match ?? "",
      audienceFitExplanation: r.brief_fit_explanation ?? "",
      opsNotes: r.ops_notes ?? "",
      opsName: r.ops_name ?? "",
      contentQuality: r.why_xw_recommends ?? "",
      briefAlignment: r.audience_match ?? "",
      audienceOverlap: r.brief_fit_explanation ?? "",
    }));
    setVisibleCreators(mapped);
  };

  useEffect(() => { fetchPushedCreators(); }, [activeCampaign?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (passBackPopoverId !== null && !target.closest(".pass-back-popover")) {
        setPassBackPopoverId(null);
        setPassBackReason("");
        setPassBackError("");
      }
      if (levelLegendOpen && !target.closest(".level-legend-popover")) {
        setLevelLegendOpen(false);
      }
    };

    if (passBackPopoverId !== null || levelLegendOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [passBackPopoverId, levelLegendOpen]);

  const handleApproveAll = () => {
    const newApproved: ApprovedCreator[] = visibleCreators.map(creator => ({
      ...creator,
      approvedDate: new Date().toISOString().split('T')[0],
      clientStatus: "Pending view",
    }));
    setApprovedCreators((prev) => [...prev, ...newApproved]);
    setVisibleCreators([]);
    setToastMessage(`All creators approved — now visible to client`);
    updateBadgeCount(0);
  };

  const getMarketReference = (finalPrice: number, marketRateHigh: number) => {
    const diff = ((finalPrice - marketRateHigh) / marketRateHigh) * 100;
    if (diff < 0) {
      return `${Math.abs(diff).toFixed(0)}% below market rate`;
    } else if (diff > 0) {
      return `${diff.toFixed(0)}% above market rate`;
    } else {
      return "At market rate";
    }
  };

  // Sort by recommendation strength (content match + audience fit)
  const sortedCreators = [...visibleCreators].sort((a, b) => {
    const aScore = a.contentMatchNum + a.audienceFitNum;
    const bScore = b.contentMatchNum + b.audienceFitNum;
    return bScore - aScore;
  });

  const totalPendingValue = visibleCreators.reduce((sum, c) => sum + c.finalPrice, 0);

  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
    // Close pass back popover when expanding/collapsing row
    setPassBackPopoverId(null);
    setPassBackReason("");
    setPassBackError("");
  };

  const updateBadgeCount = (newCount: number) => {
    localStorage.setItem("xw_approvals_count", newCount.toString());
    window.dispatchEvent(new Event("storage"));
  };

  const handleApprove = (creator: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleCreators((prev) => prev.filter((c) => c.id !== creator.id));

    const approvedCreator: ApprovedCreator = {
      ...creator,
      approvedDate: new Date().toISOString().split('T')[0],
      clientStatus: "Pending view",
    };
    setApprovedCreators((prev) => [...prev, approvedCreator]);

    setToastMessage(`${creator.name} approved — now visible to client`);
    updateBadgeCount(visibleCreators.length - 1);
  };

  const handlePassBackClick = (creatorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPassBackPopoverId(creatorId);
    setPassBackReason("");
    setPassBackError("");
  };

  const handleCancelPassBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPassBackPopoverId(null);
    setPassBackReason("");
    setPassBackError("");
  };

  const handleConfirmPassBack = (creator: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!passBackReason) {
      setPassBackError("Please select a reason before passing back");
      return;
    }

    setVisibleCreators((prev) => prev.filter((c) => c.id !== creator.id));

    const passedBack: PassedBackCreator = {
      ...creator,
      passBackReason: passBackReason,
      passBackDate: new Date().toISOString().split('T')[0],
    };
    setPassedBackCreators((prev) => [...prev, passedBack]);

    setToastMessage(`${creator.name} passed back to Ops — ${passBackReason}`);
    updateBadgeCount(visibleCreators.length - 1);

    // Store pass back reason for Creators table
    const passedBackOps = JSON.parse(localStorage.getItem("xw_passed_back_creators") || "[]");
    passedBackOps.push({ id: creator.id, name: creator.name, reason: passBackReason });
    localStorage.setItem("xw_passed_back_creators", JSON.stringify(passedBackOps));

    setPassBackPopoverId(null);
    setPassBackReason("");
    setPassBackError("");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Approved creators become visible to the client for selection. Orders are confirmed by the client.
        </p>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-lg border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total pending value</div>
            <div className="text-xl">${totalPendingValue.toLocaleString()}</div>
          </div>
          <div className="text-sm text-[#038B97]">
            Approving all makes ${totalPendingValue.toLocaleString()} available for client selection
          </div>
        </div>
        <Button style={{ backgroundColor: "#038B97" }} onClick={handleApproveAll}>
          Approve all →
        </Button>
      </div>

      {/* Creator Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead className="relative">
                <div className="flex items-center gap-1">
                  Level
                  <button
                    className="p-0.5 hover:bg-muted rounded level-legend-popover"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLevelLegendOpen(!levelLegendOpen);
                    }}
                  >
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                {levelLegendOpen && (
                  <div className="level-legend-popover absolute top-full left-0 mt-1 z-10 bg-white border border-border shadow-lg text-sm text-foreground font-normal max-w-[320px] whitespace-normal break-words rounded-lg p-3">
                    Levels are assigned by Ops during scoring. Studio = premium production, top-tier performance. Fluent = strong brand storytelling, high consistency. Practiced = solid execution, reliable format. Emerging = some brand experience, inconsistent delivery. Raw = first brand deal, unproven format.
                  </div>
                )}
              </TableHead>
              <TableHead>Final Bid</TableHead>
              <TableHead>Brief fit</TableHead>
              <TableHead>Audience fit</TableHead>
              <TableHead>GMV impact</TableHead>
              <TableHead>Pass Back</TableHead>
              <TableHead>Approve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCreators.map((creator) => {
              const newRealized = realized + creator.finalPrice;
              const currentPercentage = ((realized / msaBudget) * 100);
              const newPercentage = ((newRealized / msaBudget) * 100);
              const percentageGain = (newPercentage - currentPercentage).toFixed(0);
              const msaPercentage = ((creator.finalPrice / msaBudget) * 100).toFixed(1);
              const isExpanded = expandedRowId === creator.id;
              const marketRef = getMarketReference(creator.finalPrice, creator.marketRateHigh);

              return (
                <React.Fragment key={creator.id}>
                  <TableRow
                    className="h-12 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(creator.id)}
                  >
                    <TableCell>{creator.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <a
                        href={`https://instagram.com/${creator.handle.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#038B97] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {creator.handle}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{TIER_SHORT[creator.tierNum]}</TableCell>
                    <TableCell>
                      <div>${creator.finalPrice}</div>
                      <div className="text-xs text-muted-foreground">{marketRef}</div>
                    </TableCell>
                    <TableCell className="text-sm">{CONTENT_MATCH_SHORT[creator.contentMatchNum]}</TableCell>
                    <TableCell className="text-sm">{AUDIENCE_FIT_SHORT[creator.audienceFitNum]}</TableCell>
                    <TableCell>
                      <div className="text-sm text-[#038B97]">+${creator.finalPrice}</div>
                      <div className="text-xs text-muted-foreground">{msaPercentage}% of MSA goal</div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="relative">
                      <button
                        className="text-sm text-muted-foreground hover:text-foreground pass-back-popover"
                        onClick={(e) => handlePassBackClick(creator.id, e)}
                      >
                        Pass back
                      </button>
                      {passBackPopoverId === creator.id && (
                        <div className="pass-back-popover absolute top-full left-0 mt-1 z-10 bg-white border border-border rounded-lg shadow-lg p-4 w-72">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reason for passing back</label>
                              <Select value={passBackReason} onValueChange={setPassBackReason}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Price too high">Price too high</SelectItem>
                                  <SelectItem value="Not the right fit">Not the right fit</SelectItem>
                                  <SelectItem value="Brief misalignment">Brief misalignment</SelectItem>
                                  <SelectItem value="Try renegotiating">Try renegotiating</SelectItem>
                                  <SelectItem value="Compliance concern">Compliance concern</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {passBackError && (
                                <div className="text-xs text-red-600">{passBackError}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelPassBack}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                style={{ backgroundColor: "#038B97" }}
                                onClick={(e) => handleConfirmPassBack(creator, e)}
                                className="flex-1"
                              >
                                Confirm pass back
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        style={{ backgroundColor: "#038B97" }}
                        onClick={(e) => handleApprove(creator, e)}
                      >
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${creator.id}-detail`}>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Scored by {creator.opsName || "Ops"} · {creator.contentQuality || "—"} · {creator.briefAlignment || "—"} · {creator.audienceOverlap || "—"}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Brief fit explained:</span> {creator.briefFitExplanation}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Audience fit explained:</span> {creator.audienceFitExplanation}
                          </div>
                          {creator.opsNotes && (
                            <div className="text-sm text-muted-foreground italic">
                              {creator.opsNotes}
                            </div>
                          )}
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

      {/* Sent to Client Section */}
      {approvedCreators.length > 0 && (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setSentToClientExpanded(!sentToClientExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {sentToClientExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">Sent to client</span>
              <span className="text-sm text-muted-foreground">({approvedCreators.length})</span>
            </div>
          </button>
          {sentToClientExpanded && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Final bid</TableHead>
                  <TableHead>Sent date</TableHead>
                  <TableHead>Client status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedCreators.map((creator) => (
                  <TableRow key={creator.id}>
                    <TableCell>{creator.name}</TableCell>
                    <TableCell className="text-sm">{TIER_SHORT[creator.tierNum]}</TableCell>
                    <TableCell>${creator.finalPrice}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{creator.approvedDate}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs border bg-amber-100 text-amber-700 border-amber-200">
                        {creator.clientStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Passed Back Section */}
      {passedBackCreators.length > 0 && (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setPassedBackExpanded(!passedBackExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {passedBackExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">Passed back</span>
              <span className="text-sm text-muted-foreground">({passedBackCreators.length})</span>
            </div>
          </button>
          {passedBackExpanded && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Final bid</TableHead>
                  <TableHead>Pass back reason</TableHead>
                  <TableHead>Date passed back</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passedBackCreators.map((creator) => (
                  <TableRow key={creator.id}>
                    <TableCell>{creator.name}</TableCell>
                    <TableCell className="text-sm">{TIER_SHORT[creator.tierNum]}</TableCell>
                    <TableCell>${creator.finalPrice}</TableCell>
                    <TableCell className="text-sm">{creator.passBackReason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{creator.passBackDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </div>
  );
}
