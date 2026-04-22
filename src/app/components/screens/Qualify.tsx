import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface Creator {
  id: number;
  name: string;
  handle: string;
  stage: string;
  followers: string;
  offer: string;
  scores?: {
    productionTier: number;
    category1: string;
    category2: string;
    category3: string;
    contentMatch: number;
    audienceFit: number;
    notes: string;
  };
}

export function Qualify() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creators, setCreators] = useState<Creator[]>([
    { id: 1, name: "Sarah Johnson", handle: "@sarahjstyle", stage: "Ready to Score", followers: "245K", offer: "$450" },
    { id: 2, name: "Marcus Chen", handle: "@marcusfashion", stage: "Ready to Score", followers: "189K", offer: "$380", scores: { productionTier: 4, category1: "Fashion", category2: "Lifestyle", category3: "Beauty", contentMatch: 5, audienceFit: 4, notes: "Strong fit" } },
    { id: 3, name: "Emma Davis", handle: "@emmastyle", stage: "Ready to Score", followers: "312K", offer: "$520" },
    { id: 4, name: "Alex Rodriguez", handle: "@alexfits", stage: "Ready to Score", followers: "156K", offer: "$340", scores: { productionTier: 3, category1: "Fashion", category2: "Fitness", category3: "Travel", contentMatch: 4, audienceFit: 3, notes: "Good reach" } },
  ]);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSave = (id: number) => {
    alert(`Creator ${id} saved and sent to client`);
    setExpandedId(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Qualify</h1>
        <p className="text-sm text-muted-foreground">
          Score creators and send to client
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead>Scores</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => (
              <React.Fragment key={creator.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(creator.id)}
                >
                  <TableCell>
                    {expandedId === creator.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </TableCell>
                  <TableCell>{creator.name}</TableCell>
                  <TableCell className="text-muted-foreground">{creator.handle}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-[#038B97]/10 text-[#038B97] border border-[#038B97]/20">
                      {creator.stage}
                    </span>
                  </TableCell>
                  <TableCell>{creator.followers}</TableCell>
                  <TableCell>{creator.offer}</TableCell>
                  <TableCell>
                    {creator.scores && (
                      <div className="flex gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                          T{creator.scores.productionTier}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                          C{creator.scores.contentMatch}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                          A{creator.scores.audienceFit}
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {expandedId === creator.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/30 p-6">
                      <div className="max-w-3xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Production Tier (1-5)</Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((tier) => (
                                <button
                                  key={tier}
                                  className={`w-10 h-10 rounded border ${
                                    creator.scores?.productionTier === tier
                                      ? "bg-[#038B97] text-white border-[#038B97]"
                                      : "bg-white border-border"
                                  }`}
                                >
                                  {tier}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>XW Category 1</Label>
                            <Select defaultValue={creator.scores?.category1}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
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
                            <Label>Content Match (1-5)</Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  className={`w-10 h-10 rounded border ${
                                    creator.scores?.contentMatch === score
                                      ? "bg-[#038B97] text-white border-[#038B97]"
                                      : "bg-white border-border"
                                  }`}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Audience Fit (1-5)</Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  className={`w-10 h-10 rounded border ${
                                    creator.scores?.audienceFit === score
                                      ? "bg-[#038B97] text-white border-[#038B97]"
                                      : "bg-white border-border"
                                  }`}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Add notes about this creator..."
                            defaultValue={creator.scores?.notes}
                            rows={3}
                          />
                        </div>

                        <Button
                          className="w-full"
                          style={{ backgroundColor: "#038B97" }}
                          onClick={() => handleSave(creator.id)}
                        >
                          Save & send to client
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
