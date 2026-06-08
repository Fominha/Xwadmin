import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { getCurrentUser } from "../../lib/auth";
import { Lock, Copy } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface ActivationPipeline {
  notified: { complete: boolean; date?: string };
  scriptReceived: { complete: boolean; date?: string; link?: string };
  clientReviewingScript: { complete: boolean; date?: string };
  contentReceived: { complete: boolean; date?: string; link?: string };
  clientReviewingContent: { complete: boolean; date?: string };
  clientApproved: { complete: boolean; date?: string };
  posted: { complete: boolean; date?: string };
}

interface Activation {
  id: number;
  name: string;
  handle: string;
  followers: string;
  finalBid: number;
  confirmedDate: string;
  pipeline: ActivationPipeline;
  notes: string;
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 14) {
    return `${diffDays}d ago`;
  } else {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  }
};

export function CreatorsOrdered() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activations, setActivations] = useState<Activation[]>([]);
  const campaignId = localStorage.getItem("xw_campaign_id");

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "ops") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const fetchActivations = async () => {
    if (!campaignId) return;
    const { data, error } = await supabase
      .from("activations")
      .select("*, creators(*)")
      .eq("campaign_id", campaignId);

    if (error || !data) return;

    const mapped: Activation[] = data.map((row: any) => {
      const c = row.creators ?? {};
      const followers = c.followers ? (c.followers >= 1000000 ? `${(c.followers / 1000000).toFixed(1)}M` : `${Math.round(c.followers / 1000)}K`) : "—";
      return {
        id: row.id,
        name: c.name ?? row.creator_name ?? "",
        handle: c.handle ?? "",
        followers,
        finalBid: row.final_bid ?? 0,
        confirmedDate: row.confirmed_at ?? row.created_at ?? new Date().toISOString(),
        notes: row.notes ?? "",
        pipeline: {
          notified: { complete: !!row.notified_at, date: row.notified_at?.split("T")[0] },
          scriptReceived: { complete: !!row.script_received_at, date: row.script_received_at?.split("T")[0], link: row.script_link ?? "" },
          clientReviewingScript: { complete: !!row.client_reviewing_script_at, date: row.client_reviewing_script_at?.split("T")[0] },
          contentReceived: { complete: !!row.content_received_at, date: row.content_received_at?.split("T")[0], link: row.content_link ?? "" },
          clientReviewingContent: { complete: !!row.client_reviewing_content_at, date: row.client_reviewing_content_at?.split("T")[0] },
          clientApproved: { complete: !!row.client_approved_at, date: row.client_approved_at?.split("T")[0] },
          posted: { complete: !!row.posted_at, date: row.posted_at?.split("T")[0] },
        },
      };
    });

    setActivations(mapped);
  };

  useEffect(() => {
    fetchActivations();
  }, [campaignId]);

  const getCurrentStep = (pipeline: ActivationPipeline): number => {
    if (pipeline.posted.complete) return 6;
    if (pipeline.clientApproved.complete) return 5;
    if (pipeline.clientReviewingContent.complete) return 4;
    if (pipeline.contentReceived.complete) return 3;
    if (pipeline.clientReviewingScript.complete) return 2;
    if (pipeline.scriptReceived.complete) return 1;
    if (pipeline.notified.complete) return 0;
    return -1;
  };

  const getPrimaryAction = (pipeline: ActivationPipeline) => {
    const step = getCurrentStep(pipeline);
    if (step === -1) return { label: "Log notified →", step: "notified" };
    if (step === 0) return { label: "Log script received →", step: "scriptReceived" };
    if (step === 1) return null; // Client reviewing script - no action
    if (step === 2) return { label: "Log content received →", step: "contentReceived" };
    if (step === 3) return null; // Client reviewing content - no action
    if (step === 4) return { label: "Log client approved →", step: "clientApproved" };
    if (step === 5) return { label: "Mark posted →", step: "posted" };
    if (step === 6) return { label: "Done", step: "done" };
    return null;
  };

  const handlePipelineStep = async (id: number, step: string, link?: string) => {
    const now = new Date().toISOString();
    const stepToColumn: Record<string, string> = {
      notified: "notified_at",
      scriptReceived: "script_received_at",
      clientReviewingScript: "client_reviewing_script_at",
      contentReceived: "content_received_at",
      clientReviewingContent: "client_reviewing_content_at",
      clientApproved: "client_approved_at",
      posted: "posted_at",
    };

    const updates: Record<string, string> = { [stepToColumn[step]]: now };

    if (step === "scriptReceived") {
      updates["client_reviewing_script_at"] = now;
      if (link) updates["script_link"] = link;
    } else if (step === "contentReceived") {
      updates["client_reviewing_content_at"] = now;
      if (link) updates["content_link"] = link;
    }

    await supabase.from("activations").update(updates).eq("id", id);
    fetchActivations();
  };

  const handleNotesUpdate = (id: number, notes: string) => {
    setActivations(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
  };

  const handleNotesSave = async (id: number, notes: string) => {
    await supabase.from("activations").update({ notes }).eq("id", id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const pendingNotification = activations.filter(a => getCurrentStep(a.pipeline) === -1).length;
  const awaitingScript = activations.filter(a => {
    const step = getCurrentStep(a.pipeline);
    return step >= 0 && step <= 1;
  }).length;
  const awaitingContent = activations.filter(a => {
    const step = getCurrentStep(a.pipeline);
    return step >= 2 && step <= 4;
  }).length;
  const complete = activations.filter(a => a.pipeline.posted.complete).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Activations</h1>
        <p className="text-sm text-muted-foreground">
          Track creator progress from notification to posting. Client approves content — Ops keeps everything moving.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-2xl mb-1">{pendingNotification}</div>
          <div className="text-sm text-muted-foreground">Pending notification</div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-2xl mb-1">{awaitingScript}</div>
          <div className="text-sm text-muted-foreground">Awaiting script</div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-2xl mb-1">{awaitingContent}</div>
          <div className="text-sm text-muted-foreground">Awaiting content</div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-2xl mb-1">{complete}</div>
          <div className="text-sm text-muted-foreground">Complete</div>
        </div>
      </div>

      {activations.length > 0 ? (
        <div className="bg-white rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Final Bid</TableHead>
                <TableHead>Confirmed Date</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activations.map((activation) => {
                const currentStep = getCurrentStep(activation.pipeline);
                const action = getPrimaryAction(activation.pipeline);
                const isExpanded = expandedId === activation.id;

                const steps = [
                  { label: "Notified", status: activation.pipeline.notified },
                  { label: "Script received", status: activation.pipeline.scriptReceived },
                  { label: "Client reviewing script", status: activation.pipeline.clientReviewingScript },
                  { label: "Content received", status: activation.pipeline.contentReceived },
                  { label: "Client reviewing content", status: activation.pipeline.clientReviewingContent },
                  { label: "Client approved", status: activation.pipeline.clientApproved },
                  { label: "Posted", status: activation.pipeline.posted },
                ];

                return (
                  <React.Fragment key={activation.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : activation.id)}
                    >
                      <TableCell>{activation.name}</TableCell>
                      <TableCell>${activation.finalBid}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(activation.confirmedDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {steps.map((step, idx) => (
                            <div
                              key={idx}
                              className="relative group"
                              title={step.label}
                            >
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  step.status.complete
                                    ? "bg-[#038B97]"
                                    : idx === currentStep
                                    ? "bg-amber-500"
                                    : "bg-gray-300"
                                } ${!step.status.complete && idx > currentStep ? "opacity-40" : ""}`}
                              />
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {action && action.step !== "done" ? (
                          <Button
                            size="sm"
                            style={{ backgroundColor: "#038B97" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (action.step === "scriptReceived" || action.step === "contentReceived") {
                                // For these steps, expand the row to show link input
                                setExpandedId(isExpanded ? null : activation.id);
                              } else {
                                handlePipelineStep(activation.id, action.step);
                              }
                            }}
                          >
                            {action.label}
                          </Button>
                        ) : action && action.step === "done" ? (
                          <span className="text-sm text-muted-foreground">Done</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">Handle</div>
                                <div>{activation.handle}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Followers</div>
                                <div>{activation.followers}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Confirmed Date</div>
                                <div>{new Date(activation.confirmedDate).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Final Bid</div>
                                <div>${activation.finalBid}</div>
                              </div>
                            </div>

                            <div className="border-t border-border pt-4">
                              <div className="text-sm mb-3">Pipeline progress</div>
                              <div className="space-y-3">
                                {steps.map((step, idx) => {
                                  const isActive = idx === currentStep + 1;
                                  const isPast = step.status.complete;
                                  const isFuture = !isPast && !isActive;

                                  return (
                                    <div key={idx} className="space-y-2">
                                      <div className="flex items-center gap-3 text-sm">
                                        <div
                                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            isPast
                                              ? "bg-[#038B97]"
                                              : isActive
                                              ? "bg-amber-500"
                                              : "bg-gray-300"
                                          }`}
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                          <span className={isPast ? "" : "text-muted-foreground"}>
                                            {step.label}
                                          </span>
                                          {step.status.date && (
                                            <span className="text-muted-foreground text-xs">
                                              {formatRelativeTime(step.status.date)}
                                            </span>
                                          )}
                                          {isFuture && (
                                            <Lock className="w-3 h-3 text-muted-foreground" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Script link input */}
                                      {step.label === "Script received" && (
                                        <div className="ml-5 pl-3 border-l-2 border-muted">
                                          <div className="text-xs text-muted-foreground mb-1">Script link (from creator)</div>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              className="flex-1 px-3 py-1.5 text-sm border border-border rounded"
                                              placeholder="Paste script link here..."
                                              value={activation.pipeline.scriptReceived.link || ""}
                                              onChange={(e) => {
                                                const updated = activations.map(a => {
                                                  if (a.id === activation.id) {
                                                    return {
                                                      ...a,
                                                      pipeline: {
                                                        ...a.pipeline,
                                                        scriptReceived: {
                                                          ...a.pipeline.scriptReceived,
                                                          link: e.target.value,
                                                        },
                                                      },
                                                    };
                                                  }
                                                  return a;
                                                });
                                                setActivations(updated);
                                              }}
                                            />
                                            {activation.pipeline.scriptReceived.link && (
                                              <button
                                                onClick={() => copyToClipboard(activation.pipeline.scriptReceived.link || "")}
                                                className="p-1.5 hover:bg-muted rounded"
                                                title="Copy link"
                                              >
                                                <Copy className="w-4 h-4 text-muted-foreground" />
                                              </button>
                                            )}
                                            {!isPast && isActive && (
                                              <Button
                                                size="sm"
                                                style={{ backgroundColor: "#038B97" }}
                                                onClick={() => handlePipelineStep(activation.id, "scriptReceived", activation.pipeline.scriptReceived.link)}
                                              >
                                                Save & advance
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Content link input */}
                                      {step.label === "Content received" && (
                                        <div className="ml-5 pl-3 border-l-2 border-muted">
                                          <div className="text-xs text-muted-foreground mb-1">Content link (from creator)</div>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              className="flex-1 px-3 py-1.5 text-sm border border-border rounded"
                                              placeholder="Paste content link here..."
                                              value={activation.pipeline.contentReceived.link || ""}
                                              onChange={(e) => {
                                                const updated = activations.map(a => {
                                                  if (a.id === activation.id) {
                                                    return {
                                                      ...a,
                                                      pipeline: {
                                                        ...a.pipeline,
                                                        contentReceived: {
                                                          ...a.pipeline.contentReceived,
                                                          link: e.target.value,
                                                        },
                                                      },
                                                    };
                                                  }
                                                  return a;
                                                });
                                                setActivations(updated);
                                              }}
                                            />
                                            {activation.pipeline.contentReceived.link && (
                                              <button
                                                onClick={() => copyToClipboard(activation.pipeline.contentReceived.link || "")}
                                                className="p-1.5 hover:bg-muted rounded"
                                                title="Copy link"
                                              >
                                                <Copy className="w-4 h-4 text-muted-foreground" />
                                              </button>
                                            )}
                                            {!isPast && isActive && (
                                              <Button
                                                size="sm"
                                                style={{ backgroundColor: "#038B97" }}
                                                onClick={() => handlePipelineStep(activation.id, "contentReceived", activation.pipeline.contentReceived.link)}
                                              >
                                                Save & advance
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="border-t border-border pt-4">
                              <div className="text-sm mb-2">Facilitation notes — visible to Lead</div>
                              <textarea
                                className="w-full px-3 py-2 text-sm border border-border rounded"
                                rows={3}
                                placeholder="Add any context about creator or client communication..."
                                value={activation.notes}
                                onChange={(e) => handleNotesUpdate(activation.id, e.target.value)}
                                onBlur={(e) => handleNotesSave(activation.id, e.target.value)}
                              />
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
      ) : (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">No activations yet.</p>
        </div>
      )}
    </div>
  );
}
