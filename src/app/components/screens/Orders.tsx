import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Download, RefreshCw, Search, Lock, AlertCircle } from "lucide-react";
import { fetchSheetData } from "../../lib/mockApi";
import { Input } from "../ui/input";
import { TIER_SHORT } from "../../lib/scoring";
import { supabase } from "../../lib/supabase";

const paymentStatusStyles: Record<string, string> = {
  Unpaid: "bg-amber-100 text-amber-700 border-amber-200",
  Invoiced: "bg-blue-100 text-blue-700 border-blue-200",
  Paid: "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  Overdue: "bg-red-100 text-red-700 border-red-200",
};

const clientStatusStyles: Record<string, string> = {
  "Pending view": "bg-gray-100 text-gray-700 border-gray-200",
  "Viewed": "bg-blue-100 text-blue-700 border-blue-200",
  "Waitlisted": "bg-amber-100 text-amber-700 border-amber-200",
  "Ordered": "bg-green-100 text-green-700 border-green-200",
  "Passed": "bg-red-100 text-red-700 border-red-200",
};

interface ClientSelection {
  creator: string;
  level: number;
  finalBid: number;
  sentDate: string;
  clientStatus: "Pending view" | "Viewed" | "Waitlisted" | "Ordered" | "Passed";
  lastStatusChange?: string;
}

interface PaymentPipeline {
  invoice: { complete: boolean; date?: string };
  funded: { complete: boolean; date?: string };
  scriptApproved: { complete: boolean; date?: string };
  contentApproved: { complete: boolean; date?: string };
  timer: { complete: boolean; daysRemaining?: number; startDate?: string };
  paid: { complete: boolean; date?: string };
}

interface Order {
  creator: string;
  price: string;
  paymentStatus: "Unpaid" | "Invoiced" | "Paid" | "Overdue";
  creatorPaid: "Yes" | "No" | "Overdue";
  invoiceDue: string;
  scriptStatus: string;
  contentStatus: string;
  creatorNotified: boolean;
  dueDate: string;
  pipeline?: PaymentPipeline;
}

interface BenchCreator {
  creator: string;
  handle: string;
  level: number;
  nicheTags: string[];
  finalBid: number;
  campaignStatus: "Ordered" | "Waitlisted" | "Passed" | "Passed back";
  lastActive: string;
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays === 0 && diffHours < 24) {
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? "just now" : `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  }
};

const getDaysSince = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

export function Orders() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedRowIdx, setExpandedRowIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"client-selections" | "payments" | "creator-bench">("client-selections");
  const [benchSearchQuery, setBenchSearchQuery] = useState("");
  const [benchFilter, setBenchFilter] = useState("All");
  const [clientSelections, setClientSelections] = useState<ClientSelection[]>([]);
  const [benchCreators, setBenchCreators] = useState<BenchCreator[]>([]);
  const campaignId = localStorage.getItem("xw_campaign_id");
  const msaBudget = 10000;

  const clientLastActive = "2026-04-22T08:00:00";

  const fetchSelections = async () => {
    if (!campaignId) return;
    const { data } = await supabase
      .from("client_selections")
      .select("*, creators(*)")
      .eq("campaign_id", campaignId)
      .order("pushed_at", { ascending: false });

    if (data) {
      const mapped: ClientSelection[] = data.map((row: any) => ({
        creator: row.creators?.name ?? "",
        level: row.creators?.production_tier ?? 0,
        finalBid: row.creators?.bid ?? 0,
        sentDate: row.pushed_at ?? "",
        clientStatus: row.client_status ?? "Pending view",
        lastStatusChange: row.last_status_change ?? row.pushed_at,
      }));
      setClientSelections(mapped);

      // Also populate bench from creators table
      const { data: creatorsData } = await supabase
        .from("creators")
        .select("*")
        .eq("campaign_id", campaignId);
      if (creatorsData) {
        const bench: BenchCreator[] = creatorsData.map((c: any) => ({
          creator: c.name ?? "",
          handle: c.handle ?? "",
          level: c.production_tier ?? 0,
          nicheTags: c.niche_tags ?? [],
          finalBid: c.bid ?? 0,
          campaignStatus: c.status === "Pushed" ? "Ordered" : c.status ?? "Passed",
          lastActive: c.updated_at ?? c.created_at ?? "",
        }));
        setBenchCreators(bench);
      }
    }
  };

  useEffect(() => {
    loadOrders();
    fetchSelections();
    const interval = setInterval(fetchSelections, 30000);
    return () => clearInterval(interval);
  }, [campaignId]);

  // Initialize orders with pipeline data
  useEffect(() => {
    if (!loading && orders.length === 0) {
      const mockOrders: Order[] = [
        {
          creator: "Sarah Johnson",
          price: "$420",
          paymentStatus: "Invoiced",
          creatorPaid: "No",
          invoiceDue: "2026-05-01",
          scriptStatus: "Approved",
          contentStatus: "Approved",
          creatorNotified: true,
          dueDate: "2026-05-15",
          pipeline: {
            invoice: { complete: true, date: "2026-04-19" },
            funded: { complete: true, date: "2026-04-20" },
            scriptApproved: { complete: true, date: "2026-04-21" },
            contentApproved: { complete: true, date: "2026-04-22" },
            timer: { complete: false, daysRemaining: 18, startDate: "2026-04-22" },
            paid: { complete: false },
          },
        },
        {
          creator: "Emma Davis",
          price: "$520",
          paymentStatus: "Invoiced",
          creatorPaid: "No",
          invoiceDue: "2026-05-05",
          scriptStatus: "Approved",
          contentStatus: "Pending",
          creatorNotified: true,
          dueDate: "2026-05-20",
          pipeline: {
            invoice: { complete: true, date: "2026-04-21" },
            funded: { complete: true, date: "2026-04-21" },
            scriptApproved: { complete: true, date: "2026-04-22" },
            contentApproved: { complete: false },
            timer: { complete: false },
            paid: { complete: false },
          },
        },
      ];
      setOrders(mockOrders);
    }
  }, [loading]);

  const loadOrders = async () => {
    const sheetId = localStorage.getItem("xw_sheet_id") || "mock";

    try {
      const data = await fetchSheetData(sheetId, "Campaign_Orders");
      const mapped = (data.rows || []).map((row: any) => ({
          creator: row.creatorName || "Unknown",
          price: `$${row.price || 0}`,
          paymentStatus: (row.paymentStatus || "Unpaid") as Order["paymentStatus"],
          creatorPaid: (row.creatorPaid || "No") as Order["creatorPaid"],
          invoiceDue: row.invoiceDue || "",
          scriptStatus: row.scriptStatus || "Pending",
          contentStatus: row.contentStatus || "Not Started",
          creatorNotified: row.creatorNotified === "true",
          dueDate: row.dueDate || "",
        }));
      setOrders(mapped);
      setError(false);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  const handleSync = () => {
    alert("Syncing latest decisions from Client_Selections...");
    loadOrders();
  };

  const handleExport = () => {
    alert("Exporting orders to CSV...");
  };

  const handleMarkInvoiceSent = (idx: number) => {
    const updated = [...orders];
    updated[idx].paymentStatus = "Invoiced";
    setOrders(updated);
  };

  const handleMarkPaid = (idx: number) => {
    const updated = [...orders];
    updated[idx].paymentStatus = "Paid";
    setOrders(updated);
  };

  const isOverdue = (order: Order) => {
    if (order.paymentStatus === "Paid") return false;
    if (!order.invoiceDue) return false;
    const dueDate = new Date(order.invoiceDue);
    const today = new Date();
    return dueDate < today;
  };

  const toggleRow = (idx: number) => {
    setExpandedRowIdx(expandedRowIdx === idx ? null : idx);
  };

  const handleMarkClientPaid = (idx: number) => {
    const updated = [...orders];
    updated[idx].paymentStatus = "Paid";
    setOrders(updated);
  };

  const handleMarkCreatorPaid = (idx: number) => {
    const updated = [...orders];
    updated[idx].creatorPaid = "Yes";
    setOrders(updated);
  };

  const handleTogglePaymentSent = (idx: number) => {
    const updated = [...orders];
    updated[idx].creatorPaid = updated[idx].creatorPaid === "Yes" ? "No" : "Yes";
    setOrders(updated);
  };

  const handlePipelineStep = (idx: number, step: keyof PaymentPipeline) => {
    const updated = [...orders];
    const pipeline = updated[idx].pipeline;
    if (pipeline) {
      const today = new Date().toISOString().split('T')[0];
      if (step === "invoice") {
        pipeline.invoice = { complete: true, date: today };
      } else if (step === "funded") {
        pipeline.funded = { complete: true, date: today };
      } else if (step === "scriptApproved") {
        pipeline.scriptApproved = { complete: true, date: today };
      } else if (step === "contentApproved") {
        pipeline.contentApproved = { complete: true, date: today };
        pipeline.timer = { complete: false, daysRemaining: 30, startDate: today };
      } else if (step === "paid") {
        pipeline.paid = { complete: true, date: today };
        pipeline.timer.complete = true;
        updated[idx].creatorPaid = "Yes";
      }
    }
    setOrders(updated);
  };

  const getCurrentPipelineStep = (pipeline?: PaymentPipeline): number => {
    if (!pipeline) return 0;
    if (pipeline.paid.complete) return 5;
    if (pipeline.timer.complete || (pipeline.timer.daysRemaining !== undefined && pipeline.timer.daysRemaining <= 0)) return 5;
    if (pipeline.contentApproved.complete) return 4;
    if (pipeline.scriptApproved.complete) return 3;
    if (pipeline.funded.complete) return 2;
    if (pipeline.invoice.complete) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#038B97] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Loading orders...</div>
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
              setError(false);
              setLoading(true);
              loadOrders();
            }}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalOrders = orders.length;

  // Client selection counts
  const pendingCount = clientSelections.filter(c => c.clientStatus === "Pending view").length;
  const viewedCount = clientSelections.filter(c => c.clientStatus === "Viewed").length;
  const waitlistedCount = clientSelections.filter(c => c.clientStatus === "Waitlisted").length;
  const orderedCount = clientSelections.filter(c => c.clientStatus === "Ordered").length;
  const passedCount = clientSelections.filter(c => c.clientStatus === "Passed").length;

  // Client → XW metrics
  const clientPaidSum = orders.filter(o => o.paymentStatus === "Paid").reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);
  const clientInvoicedSum = orders.filter(o => o.paymentStatus === "Invoiced").reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);
  const clientOverdueSum = orders.filter(o => isOverdue(o)).reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);

  // XW → Creators metrics with pipeline states
  const creatorPaidSum = orders.filter(o => o.pipeline?.paid.complete).reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);
  const creatorAwaitingApproval = orders.filter(o => {
    const step = getCurrentPipelineStep(o.pipeline);
    return step === 2 || step === 3; // Funded or Script approved, waiting for content
  }).reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);
  const creatorInTimer = orders.filter(o => {
    const step = getCurrentPipelineStep(o.pipeline);
    return step === 4; // Content approved, timer running
  }).reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);
  const creatorPendingSum = orders.filter(o => {
    const step = getCurrentPipelineStep(o.pipeline);
    return step === 0 || step === 1; // Invoice or just started
  }).reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);
  const creatorOverdueSum = orders.filter(o => o.creatorPaid === "Overdue").reduce((sum, o) => sum + parseInt(o.price.replace("$", "")), 0);

  const msaRealized = clientPaidSum;
  const realizationPercent = ((msaRealized / msaBudget) * 100).toFixed(0);

  // Filtered bench creators
  const filteredBenchCreators = benchCreators.filter(c => {
    const matchesSearch = c.creator.toLowerCase().includes(benchSearchQuery.toLowerCase()) ||
                          c.handle.toLowerCase().includes(benchSearchQuery.toLowerCase());
    const matchesFilter = benchFilter === "All" || c.campaignStatus === benchFilter;
    return matchesSearch && matchesFilter;
  });

  const hasOrderedCreators = orderedCount > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Track client selections, payments, and creator bench
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("client-selections")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "client-selections"
              ? "border-b-2 border-[#038B97] text-[#038B97]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Client selections
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-b-2 border-[#038B97] text-[#038B97]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Payments
          {hasOrderedCreators && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("creator-bench")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "creator-bench"
              ? "border-b-2 border-[#038B97] text-[#038B97]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Creator bench
        </button>
      </div>

      {/* Tab 1: Client selections */}
      {activeTab === "client-selections" && (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Client last active: {formatRelativeTime(clientLastActive)}
          </div>

          <div className="bg-white rounded-lg border border-border p-4">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-sm text-muted-foreground">Pending review</div>
                <div className="text-xl">{pendingCount}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-sm text-muted-foreground">Viewed</div>
                <div className="text-xl">{viewedCount}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-sm text-muted-foreground">Waitlisted</div>
                <div className="text-xl">{waitlistedCount}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-sm text-muted-foreground">Ordered</div>
                <div className="text-xl">{orderedCount}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="text-sm text-muted-foreground">Passed</div>
                <div className="text-xl">{passedCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-x-auto">
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
                {clientSelections.map((selection, idx) => {
                  const daysSinceSent = getDaysSince(selection.sentDate);
                  const daysSinceStatusChange = selection.lastStatusChange ? getDaysSince(selection.lastStatusChange) : 0;
                  const showPendingFlag = selection.clientStatus === "Pending view" && daysSinceSent > 2;
                  const showViewedFlag = selection.clientStatus === "Viewed" && daysSinceStatusChange > 2;

                  return (
                    <TableRow key={idx}>
                      <TableCell>{selection.creator}</TableCell>
                      <TableCell className="text-sm">{TIER_SHORT[selection.level]}</TableCell>
                      <TableCell>${selection.finalBid}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(selection.sentDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {showPendingFlag && (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          {showViewedFlag && (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs border ${clientStatusStyles[selection.clientStatus]}`}>
                            {selection.clientStatus}
                            {showPendingFlag && ` · ${daysSinceSent}d`}
                            {showViewedFlag && ` · ${daysSinceStatusChange}d ago`}
                          </span>
                          {selection.clientStatus === "Waitlisted" && (
                            <button className="text-sm text-[#038B97] hover:underline">
                              Follow up →
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-border p-6 space-y-4">
            <div>
              <div className="text-sm font-medium mb-3">Client → XW</div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg mb-1">${clientInvoicedSum.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Invoiced</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-lg mb-1">${clientPaidSum.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Paid</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-lg mb-1 text-red-600">${clientOverdueSum.toLocaleString()}</div>
                  <div className="text-xs text-red-600">Overdue</div>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            <div>
              <div className="text-sm font-medium mb-3">XW → Creators</div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg mb-1">${creatorPaidSum.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Paid</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-lg mb-1">${creatorAwaitingApproval.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Awaiting approval</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-lg mb-1">${creatorInTimer.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">In timer</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-lg mb-1">${creatorPendingSum.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-lg mb-1 text-red-600">${creatorOverdueSum.toLocaleString()}</div>
                  <div className="text-xs text-red-600">Overdue</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Final bid</TableHead>
                  <TableHead colSpan={6}>Payment Pipeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, idx) => {
                  const isExpanded = expandedRowIdx === idx;
                  const pipeline = order.pipeline;
                  const currentStep = getCurrentPipelineStep(pipeline);

                  const steps = [
                    { name: "Invoice", key: "invoice", complete: pipeline?.invoice.complete || false },
                    { name: "Funded", key: "funded", complete: pipeline?.funded.complete || false },
                    { name: "Script approved", key: "scriptApproved", complete: pipeline?.scriptApproved.complete || false },
                    { name: "Content approved", key: "contentApproved", complete: pipeline?.contentApproved.complete || false },
                    { name: "Timer", key: "timer", complete: pipeline?.timer.complete || false },
                    { name: "Paid", key: "paid", complete: pipeline?.paid.complete || false },
                  ];

                  return (
                    <React.Fragment key={idx}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(idx)}
                      >
                        <TableCell>{order.creator}</TableCell>
                        <TableCell>${order.price.replace("$", "")}</TableCell>
                        <TableCell colSpan={6}>
                          <div className="flex items-center gap-3">
                            {steps.map((step, stepIdx) => {
                              const isCurrent = stepIdx === currentStep && !step.complete;
                              const isLocked = stepIdx > currentStep;
                              const isComplete = step.complete;

                              return (
                                <div key={step.key} className="flex flex-col items-center gap-1 group relative">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      isComplete
                                        ? "bg-[#038B97]"
                                        : isCurrent
                                        ? "bg-amber-500"
                                        : "bg-gray-300"
                                    } ${isLocked ? "opacity-50" : ""}`}
                                  >
                                    {isLocked && (
                                      <Lock className="w-2 h-2 text-white" style={{ marginTop: "1px", marginLeft: "1px" }} />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">{step.name}</div>
                                  {step.key === "timer" && pipeline?.timer.daysRemaining !== undefined && !pipeline.timer.complete && (
                                    <div className="text-[10px] text-amber-600">
                                      {pipeline.timer.daysRemaining}d
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              {steps.map((step, stepIdx) => {
                                const isCurrent = stepIdx === currentStep && !step.complete;
                                const isLocked = stepIdx > currentStep;
                                const isComplete = step.complete;

                                return (
                                  <div key={step.key} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          isComplete
                                            ? "bg-[#038B97]"
                                            : isCurrent
                                            ? "bg-amber-500"
                                            : "bg-gray-300"
                                        }`}
                                      />
                                      <span>{step.name}</span>
                                      {isComplete && (
                                        <span className="text-xs text-muted-foreground">Complete</span>
                                      )}
                                      {isCurrent && (
                                        <span className="text-xs text-amber-600">Active</span>
                                      )}
                                      {isLocked && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Lock className="w-3 h-3" />
                                          Locked
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      {isCurrent && step.key === "invoice" && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePipelineStep(idx, "invoice"); }}>
                                          Mark invoice sent →
                                        </Button>
                                      )}
                                      {isCurrent && step.key === "funded" && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePipelineStep(idx, "funded"); }}>
                                          Mark client paid →
                                        </Button>
                                      )}
                                      {isCurrent && step.key === "scriptApproved" && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePipelineStep(idx, "scriptApproved"); }}>
                                          Mark script approved →
                                        </Button>
                                      )}
                                      {isCurrent && step.key === "contentApproved" && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePipelineStep(idx, "contentApproved"); }}>
                                          Mark content approved →
                                        </Button>
                                      )}
                                      {isCurrent && step.key === "timer" && pipeline?.timer.daysRemaining !== undefined && (
                                        <span className="text-sm text-amber-600">
                                          Payment eligible in {pipeline.timer.daysRemaining} days
                                        </span>
                                      )}
                                      {isCurrent && step.key === "paid" && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePipelineStep(idx, "paid"); }}>
                                          Mark creator paid →
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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
        </div>
      )}

      {/* Tab 3: Creator bench */}
      {activeTab === "creator-bench" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              This bench grows with every campaign. Creators here are available for future activations.
            </p>
          </div>

          <Input
            placeholder="Search by name or handle..."
            value={benchSearchQuery}
            onChange={(e) => setBenchSearchQuery(e.target.value)}
            className="max-w-md"
          />

          <div className="flex gap-2 flex-wrap">
            {["All", "Ordered", "Waitlisted", "Passed", "Passed back"].map((filter) => (
              <button
                key={filter}
                onClick={() => setBenchFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  benchFilter === filter
                    ? "bg-[#038B97] text-white border-[#038B97]"
                    : "bg-white text-muted-foreground border-border hover:border-[#038B97]/50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Niche tags</TableHead>
                  <TableHead>Final bid</TableHead>
                  <TableHead>Campaign status</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBenchCreators.map((creator, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{creator.creator}</TableCell>
                    <TableCell className="text-muted-foreground">{creator.handle}</TableCell>
                    <TableCell className="text-sm">{TIER_SHORT[creator.level]}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {creator.nicheTags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>${creator.finalBid}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs border ${
                        creator.campaignStatus === "Ordered" ? clientStatusStyles["Ordered"] :
                        creator.campaignStatus === "Waitlisted" ? clientStatusStyles["Waitlisted"] :
                        creator.campaignStatus === "Passed" ? clientStatusStyles["Passed"] :
                        "bg-purple-100 text-purple-700 border-purple-200"
                      }`}>
                        {creator.campaignStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(creator.lastActive)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
