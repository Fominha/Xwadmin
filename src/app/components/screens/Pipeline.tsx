import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

const stagePillStyles: Record<string, string> = {
  Stored: "bg-gray-100 text-gray-700 border-gray-200",
  "In Pool": "bg-blue-100 text-blue-700 border-blue-200",
  "Offer In": "bg-amber-100 text-amber-700 border-amber-200",
  "Ready to Neg": "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  "Final Bid": "bg-green-100 text-green-700 border-green-200",
  "Sent to Client": "bg-purple-100 text-purple-700 border-purple-200",
};

const creators = [
  { id: 1, name: "Sarah Johnson", handle: "@sarahjstyle", stage: "Ready to Neg", followers: "245K", offer: "$450", sendgrid: true, readyToNeg: true, finalBid: "$420", action: "Set Bid" },
  { id: 2, name: "Marcus Chen", handle: "@marcusfashion", stage: "Offer In", followers: "189K", offer: "$380", sendgrid: false, readyToNeg: false, finalBid: "-", action: "Activate" },
  { id: 3, name: "Emma Davis", handle: "@emmastyle", stage: "Final Bid", followers: "312K", offer: "$520", sendgrid: true, readyToNeg: true, finalBid: "$480", action: "Push to Client" },
  { id: 4, name: "Alex Rodriguez", handle: "@alexfits", stage: "In Pool", followers: "156K", offer: "$340", sendgrid: true, readyToNeg: false, finalBid: "-", action: "Qualify" },
  { id: 5, name: "Jessica Park", handle: "@jessicap", stage: "Ready to Neg", followers: "298K", offer: "$490", sendgrid: true, readyToNeg: true, finalBid: "$450", action: "Set Bid" },
  { id: 6, name: "Tyler Brooks", handle: "@tylerb", stage: "Stored", followers: "134K", offer: "$320", sendgrid: false, readyToNeg: false, finalBid: "-", action: "Activate" },
];

export function Pipeline() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === creators.length ? [] : creators.map((c) => c.id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Manage creator stages and batch actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={selectedIds.length === 0}
            variant="outline"
            className="border-[#038B97] text-[#038B97]"
          >
            Activate Sendgrid ({selectedIds.length})
          </Button>
          <Button
            disabled={selectedIds.length === 0}
            style={{ backgroundColor: "#038B97" }}
          >
            Mark ready to negotiate ({selectedIds.length})
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === creators.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead>Sendgrid</TableHead>
              <TableHead>Ready to Neg</TableHead>
              <TableHead>Final Bid</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(creator.id)}
                    onCheckedChange={() => toggleSelection(creator.id)}
                  />
                </TableCell>
                <TableCell>{creator.name}</TableCell>
                <TableCell className="text-muted-foreground">{creator.handle}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs border ${stagePillStyles[creator.stage]}`}>
                    {creator.stage}
                  </span>
                </TableCell>
                <TableCell>{creator.followers}</TableCell>
                <TableCell>{creator.offer}</TableCell>
                <TableCell>
                  {creator.sendgrid ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {creator.readyToNeg ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>{creator.finalBid}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {creator.action}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
