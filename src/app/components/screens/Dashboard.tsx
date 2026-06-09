import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { fetchSheetData } from "../../lib/mockApi";
import { getCurrentUser } from "../../lib/auth";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { CampaignSelector } from "../CampaignSelector";

interface DashboardData {
  campaignName: string;
  clientName: string;
  msaBudget: number;
  committed: number;
  postingStartDate: string;
  postingEndDate: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setData({
        campaignName: campaign?.name || "No active campaign",
        clientName: campaign?.client_name || "",
        msaBudget: campaign?.msa_budget || 0,
        committed: 0,
        postingStartDate: campaign?.posting_start_date || "",
        postingEndDate: campaign?.posting_end_date || "",
      });
      setError(null);
    } catch (err) {
      // No active campaign found — show defaults rather than error state
      setData({
        campaignName: "No active campaign",
        clientName: "",
        msaBudget: 0,
        committed: 0,
        postingStartDate: "",
        postingEndDate: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntilClose = () => {
    if (!data?.postingStartDate) return null;
    const startDate = new Date(data.postingStartDate);
    const today = new Date();
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#038B97] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-lg border border-border p-8 text-center max-w-md">
          <div className="text-muted-foreground mb-4">
            Could not load data — check your sheet connection
          </div>
          <Button
            onClick={() => {
              setError(null);
              setLoading(true);
              loadDashboardData();
            }}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const percentage = data.msaBudget > 0 ? (data.committed / data.msaBudget) * 100 : 0;
  const daysUntilClose = calculateDaysUntilClose();
  const creatorTarget = 80;

  return (
    <>
      <CampaignSelector />
      {/* Sticky campaign header for Ops and Lead */}
      <div className="sticky top-0 z-30 bg-white border-b border-border px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">{data.campaignName}</span>
            <span className="text-sm text-muted-foreground">
              {data.postingStartDate && data.postingEndDate
                ? `${new Date(data.postingStartDate).toLocaleDateString()} – ${new Date(data.postingEndDate).toLocaleDateString()}`
                : "Dates not set"}
            </span>
          </div>
          {daysUntilClose !== null && daysUntilClose > 0 && (
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                daysUntilClose <= 7
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : daysUntilClose <= 14
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-[#038B97]/10 text-[#038B97] border border-[#038B97]/20"
              }`}
            >
              {daysUntilClose} days until supply {user?.role === "ops" ? "chain" : "window"} closes
            </div>
          )}
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Role-specific content */}
      {user?.role === "ops" ? (
        <>
          {/* Needs Attention Section */}
          <div>
            <h3 className="text-lg mb-4">Needs your attention</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border-2 border-red-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm mb-1">Act now</h4>
                    <p className="text-xs text-muted-foreground">
                      New bids, counters waiting, creators silent 48+ hours
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl">12</div>
                  <Button
                    size="sm"
                    style={{ backgroundColor: "#038B97" }}
                    onClick={() => navigate("/creators?filter=urgent")}
                  >
                    Review
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border-2 border-amber-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm mb-1">Waiting on creator</h4>
                    <p className="text-xs text-muted-foreground">
                      Counter sent, awaiting response
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl">8</div>
                  <div className="text-xs text-muted-foreground">Last contact: 2d ago</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border-2 border-green-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm mb-1">Ready for Lead</h4>
                    <p className="text-xs text-muted-foreground">
                      Scored and final bid set
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl">8</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/pending-approval")}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Supply Overview */}
          <div>
            <h3 className="text-lg mb-4">Supply overview</h3>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Total in pool", count: 156 },
                { label: "New this week", count: 23 },
                { label: "Scored", count: 89 },
                { label: "Matched to brief", count: 47 },
                { label: "Activated", count: 34 },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-lg border border-border p-3 text-center">
                  <div className="text-xl mb-1">{stat.count}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Health */}
          <div>
            <h3 className="text-lg mb-4">Pipeline health</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Bids received", count: 47, target: creatorTarget, tip: "→ Increase outreach to close the gap" },
                { label: "Being scored", count: 12, target: creatorTarget, tip: "→ Open Creators and score new bids" },
                { label: "In negotiation", count: 18, target: creatorTarget, tip: "→ Send counters to waiting creators" },
                { label: "Final bid set", count: 8, target: creatorTarget, tip: "→ Review and send to Lead when ready" },
              ].map((stat) => {
                const progress = (stat.count / stat.target) * 100;
                const status = progress >= 80 ? "On track" : progress >= 50 ? "Behind" : "At risk";
                const statusColor = progress >= 80 ? "green" : progress >= 50 ? "amber" : "red";
                const dotClass = progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500";

                return (
                  <div key={stat.label} className="bg-white rounded-lg border border-border p-4">
                    <div className="text-2xl mb-1">
                      {stat.count} / {stat.target}
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                      <span className="text-muted-foreground">{status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground italic mb-1">{stat.tip}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Campaign Realization */}
          <div className="bg-white rounded-lg border border-border p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="font-medium">{data.campaignName}</div>
              <div className="text-sm text-muted-foreground">
                {data.postingStartDate && data.postingEndDate
                  ? `${new Date(data.postingStartDate).toLocaleDateString()} – ${new Date(data.postingEndDate).toLocaleDateString()}`
                  : "Dates not set"}
              </div>
            </div>

            {(() => {
              const realized = 1350;
              const waitlisted = 2860;
              const pendingApproval = 940;
              const inPlay = realized + waitlisted;
              const atRisk = 2100;
              const remaining = data.msaBudget - realized - waitlisted - pendingApproval;

              const realizedPct = (realized / data.msaBudget) * 100;
              const waitlistedPct = (waitlisted / data.msaBudget) * 100;
              const pendingPct = (pendingApproval / data.msaBudget) * 100;
              const remainingPct = (remaining / data.msaBudget) * 100;
              const inPlayPct = (inPlay / data.msaBudget) * 100;

              const daysUntilSupplyClose = daysUntilClose || 0;

              return (
                <div className="space-y-6">
                  {/* Hero row - three columns */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-2">Realized</div>
                      <div className="text-4xl font-bold mb-1">${realized.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{realizedPct.toFixed(1)}% of MSA</div>
                    </div>
                    <div className="text-center border-l border-r border-border">
                      <div className="text-sm text-muted-foreground mb-2">In play</div>
                      <div className="text-4xl font-bold mb-1">${inPlay.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{inPlayPct.toFixed(1)}% potential</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-2">At risk</div>
                      <div className="text-4xl font-bold mb-1 text-red-600">${atRisk.toLocaleString()}</div>
                      <div className="text-xs text-red-600">
                        supply closes in {daysUntilSupplyClose > 0 ? `${daysUntilSupplyClose}d` : "soon"}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar - four segments */}
                  <div className="h-6 bg-gray-200 rounded overflow-hidden flex">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${realizedPct}%`, backgroundColor: "#038B97" }}
                      title="Realized"
                    />
                    <div
                      className="h-full transition-all"
                      style={{ width: `${waitlistedPct}%`, backgroundColor: "#3b82f6" }}
                      title="Waitlisted"
                    />
                    <div
                      className="h-full transition-all"
                      style={{ width: `${pendingPct}%`, backgroundColor: "#f59e0b" }}
                      title="Pending approval"
                    />
                    <div
                      className="h-full transition-all"
                      style={{ width: `${remainingPct}%`, backgroundColor: "#d1d5db" }}
                      title="Remaining"
                    />
                  </div>

                  {/* Bottom summary line */}
                  <div className="text-sm text-muted-foreground text-center">
                    MSA budget: ${data.msaBudget.toLocaleString()} · Supply window closes{" "}
                    {data.postingStartDate
                      ? new Date(data.postingStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "TBD"}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Action Required */}
          <div className="space-y-4">
            <h3 className="text-lg">Action required</h3>

            {(() => {
              const creatorsPending = 8;
              const waitlistedByClient = 4;
              const overduePayments = 3;
              const daysUntilSupplyClose = daysUntilClose || 0;

              const cards = [];

              // Priority order: Overdue payments → Supply window closing → Creators pending → Waitlisted

              if (overduePayments > 0) {
                cards.push(
                  <div key="overdue-payments" className="bg-white rounded-lg border border-border border-l-4 border-l-red-500 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-3xl font-bold text-red-600">{overduePayments}</div>
                      <div className="flex-1">
                        <div className="text-sm mb-0.5">Overdue payments</div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-red-500 text-red-600"
                        onClick={() => navigate("/orders?tab=payments")}
                      >
                        View overdue →
                      </Button>
                    </div>
                  </div>
                );
              }

              if (daysUntilSupplyClose > 0 && daysUntilSupplyClose <= 7) {
                cards.push(
                  <div key="supply-closing" className="bg-white rounded-lg border border-border border-l-4 border-l-amber-500 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-3xl font-bold text-amber-600">{daysUntilSupplyClose}</div>
                      <div className="flex-1">
                        <div className="text-sm mb-0.5">Supply window closing</div>
                        <div className="text-xs text-muted-foreground">Creators not yet ordered will be lost when the window closes</div>
                      </div>
                      <Button
                        style={{ backgroundColor: "#f59e0b" }}
                        onClick={() => navigate("/approvals")}
                      >
                        View pipeline →
                      </Button>
                    </div>
                  </div>
                );
              }

              if (creatorsPending > 0) {
                cards.push(
                  <div key="creators-pending" className="bg-white rounded-lg border border-border border-l-4 border-l-[#038B97] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-3xl font-bold">{creatorsPending}</div>
                      <div className="flex-1">
                        <div className="text-sm">Creators pending approval</div>
                      </div>
                      <Button
                        style={{ backgroundColor: "#038B97" }}
                        onClick={() => navigate("/approvals")}
                      >
                        Review approvals →
                      </Button>
                    </div>
                  </div>
                );
              }

              if (waitlistedByClient > 0) {
                cards.push(
                  <div key="waitlisted" className="bg-white rounded-lg border border-border border-l-4 border-l-[#038B97] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-3xl font-bold">{waitlistedByClient}</div>
                      <div className="flex-1">
                        <div className="text-sm mb-0.5">Waitlisted by client</div>
                        <div className="text-xs text-muted-foreground">Convert waitlisted creators to orders to increase realized GMV</div>
                      </div>
                      <Button
                        style={{ backgroundColor: "#038B97" }}
                        onClick={() => navigate("/orders?tab=client-selections")}
                      >
                        Follow up with client →
                      </Button>
                    </div>
                  </div>
                );
              }

              if (cards.length === 0) {
                return <div className="text-center text-muted-foreground py-8">No actions needed right now.</div>;
              }

              return <>{cards}</>;
            })()}
          </div>
        </>
      )}
      </div>
    </>
  );
}
