import { useState } from "react";
import { X, Instagram } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  TIER_LABELS,
  CONTENT_MATCH_LABELS,
  AUDIENCE_FIT_LABELS,
  calculateRecommendedRange,
} from "../lib/scoring";
import { supabase } from "../lib/supabase";

interface CreatorSidePanelProps {
  creator: any;
  onClose: () => void;
}

export function CreatorSidePanel({ creator, onClose }: CreatorSidePanelProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "score" | "negotiate">("profile");
  const [pushing, setPushing] = useState(false);
  const [scores, setScores] = useState({
    productionTier: creator.productionTier || 0,
    contentMatch: creator.contentMatch || 0,
    audienceFit: creator.audienceFit || 0,
    category1: "",
    category2: "",
    notes: "",
    whyXWRecommends: "",
  });
  const [negotiation, setNegotiation] = useState({
    counterOffer: "",
    status: "Pending Review",
    notes: "",
    finalBidLocked: false,
  });

  const allScoresSet = scores.productionTier > 0 && scores.contentMatch > 0 && scores.audienceFit > 0 && scores.whyXWRecommends.trim().length > 0;
  const recRange = calculateRecommendedRange(creator.theirAsk);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1">{creator.name}</h2>
          <p className="text-sm text-muted-foreground">{creator.handle}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-3 text-sm ${
            activeTab === "profile"
              ? "border-b-2 border-[#038B97] text-[#038B97]"
              : "text-muted-foreground"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("score")}
          className={`px-6 py-3 text-sm ${
            activeTab === "score"
              ? "border-b-2 border-[#038B97] text-[#038B97]"
              : "text-muted-foreground"
          }`}
        >
          Score
        </button>
        <button
          onClick={() => setActiveTab("negotiate")}
          className={`px-6 py-3 text-sm ${
            activeTab === "negotiate"
              ? "border-b-2 border-[#038B97] text-[#038B97]"
              : "text-muted-foreground"
          }`}
        >
          Negotiate
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Followers</div>
                <div>{creator.followers}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Size</div>
                <div>{creator.size}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Country</div>
                <div>United States</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Gender</div>
                <div>Female</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Instagram</div>
                <a
                  href={`https://instagram.com/${creator.handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#038B97] hover:underline"
                >
                  <Instagram className="w-4 h-4" />
                  {creator.handle}
                </a>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Email</div>
                <div>creator@example.com</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Phone</div>
                <div>+1 (555) 123-4567</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground mb-1">Categories</div>
                <div>Fashion, Lifestyle, Beauty</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "score" && (
          <div className="space-y-6">
            {/* Production Tier */}
            <div className="space-y-3">
              <Label>Production Tier</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setScores({ ...scores, productionTier: tier })}
                    className={`w-12 h-12 rounded border text-sm ${
                      scores.productionTier === tier
                        ? "bg-[#038B97] text-white border-[#038B97]"
                        : "bg-white border-border hover:border-[#038B97]"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
              {scores.productionTier > 0 && (
                <p className="text-sm text-muted-foreground">
                  {TIER_LABELS[scores.productionTier]}
                </p>
              )}
            </div>

            {/* Content Match */}
            <div className="space-y-3">
              <Label>Content Match (fit against campaign brief)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setScores({ ...scores, contentMatch: score })}
                    className={`w-12 h-12 rounded border text-sm ${
                      scores.contentMatch === score
                        ? "bg-[#038B97] text-white border-[#038B97]"
                        : "bg-white border-border hover:border-[#038B97]"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              {scores.contentMatch > 0 && (
                <p className="text-sm text-muted-foreground">
                  {CONTENT_MATCH_LABELS[scores.contentMatch]}
                </p>
              )}
            </div>

            {/* Audience Fit */}
            <div className="space-y-3">
              <Label>Audience Fit (demographic alignment)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setScores({ ...scores, audienceFit: score })}
                    className={`w-12 h-12 rounded border text-sm ${
                      scores.audienceFit === score
                        ? "bg-[#038B97] text-white border-[#038B97]"
                        : "bg-white border-border hover:border-[#038B97]"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              {scores.audienceFit > 0 && (
                <p className="text-sm text-muted-foreground">
                  {AUDIENCE_FIT_LABELS[scores.audienceFit]}
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>XW Category 1</Label>
                <Select value={scores.category1} onValueChange={(v) => setScores({ ...scores, category1: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fashion">Fashion</SelectItem>
                    <SelectItem value="Beauty">Beauty</SelectItem>
                    <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="Fitness">Fitness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>XW Category 2</Label>
                <Select value={scores.category2} onValueChange={(v) => setScores({ ...scores, category2: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fashion">Fashion</SelectItem>
                    <SelectItem value="Beauty">Beauty</SelectItem>
                    <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="Fitness">Fitness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={scores.notes}
                onChange={(e) => setScores({ ...scores, notes: e.target.value })}
                placeholder="Add notes about this creator..."
                rows={4}
              />
            </div>

            {/* Why XW recommends */}
            <div className="space-y-2">
              <Label>Why XW recommends</Label>
              <Textarea
                value={scores.whyXWRecommends}
                onChange={(e) => setScores({ ...scores, whyXWRecommends: e.target.value })}
                placeholder="One sentence shown to Lead in approval view..."
                rows={2}
              />
            </div>

            {/* Save Button */}
            <Button
              className="w-full"
              style={{ backgroundColor: allScoresSet ? "#038B97" : undefined }}
              variant={allScoresSet ? "default" : "secondary"}
            >
              {allScoresSet ? "Save & move to negotiation →" : "Save scores"}
            </Button>
          </div>
        )}

        {activeTab === "negotiate" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Their ask</div>
                <div className="text-lg">${creator.theirAsk}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Recommended range</div>
                <div className="text-lg text-[#038B97]">{recRange}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Counter offer</Label>
              <Input
                type="number"
                value={negotiation.counterOffer}
                onChange={(e) => setNegotiation({ ...negotiation, counterOffer: e.target.value })}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={negotiation.status}
                onValueChange={(v) => setNegotiation({ ...negotiation, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending Review">Pending Review</SelectItem>
                  <SelectItem value="Negotiating">Negotiating</SelectItem>
                  <SelectItem value="Ready to Score">Ready to Score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={negotiation.notes}
                onChange={(e) => setNegotiation({ ...negotiation, notes: e.target.value })}
                placeholder="Add negotiation notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-amber-500 text-amber-600"
                onClick={() => setNegotiation({ ...negotiation, finalBidLocked: true })}
              >
                Lock final bid →
              </Button>
              {negotiation.finalBidLocked && (
                <Button
                  className="flex-1"
                  style={{ backgroundColor: "#038B97" }}
                  disabled={pushing}
                  onClick={async () => {
                    setPushing(true);
                    const campaignId = localStorage.getItem("xw_campaign_id");
                    await supabase.from("creators").update({ status: "Pushed" }).eq("id", creator.id);
                    await supabase.from("client_selections").insert({
                      campaign_id: campaignId,
                      creator_id: creator.id,
                      handle: creator.handle,
                      name: creator.name,
                      execution_price: negotiation.finalBid || 0,
                      production_tier: creator.productionTier ?? 0,
                      decision: "Pending",
                      pushed_at: new Date().toISOString(),
                    });
                    setPushing(false);
                    onClose();
                  }}
                >
                  {pushing ? "Sending..." : "Send to Lead for approval →"}
                </Button>
              )}
            </div>

            {/* Timeline */}
            <div className="border-t border-border pt-4 mt-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <div>Bid received Apr 21</div>
                <div>Counter sent Apr 22</div>
                <div>Creator responded Apr 23</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
