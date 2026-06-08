import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { getTierLabel, CONTENT_MATCH_SHORT, AUDIENCE_FIT_SHORT } from "../../lib/scoring";
import { getCurrentUser } from "../../lib/auth";

export function PendingApproval() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.role !== "ops") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const creators = [
    {
      id: 1,
      name: "Sarah Johnson",
      handle: "@sarahjstyle",
      tierNum: 4,
      finalPrice: 420,
      contentMatchNum: 5,
      audienceFitNum: 4,
      sentToLead: null,
    },
    {
      id: 2,
      name: "Emma Davis",
      handle: "@emmastyle",
      tierNum: 5,
      finalPrice: 520,
      contentMatchNum: 5,
      audienceFitNum: 5,
      sentToLead: "Apr 22, 2:15 PM",
    },
  ];


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Ready for Lead</h1>
          <p className="text-sm text-muted-foreground">
            Creators approved and ready for director review
          </p>
        </div>
        <Button
          disabled={selectedIds.length === 0}
          style={{ backgroundColor: "#038B97" }}
        >
          Send all selected → ({selectedIds.length})
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Final Bid</TableHead>
              <TableHead>Brief Match</TableHead>
              <TableHead>Audience Fit</TableHead>
              <TableHead>Sent to Lead</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell>{creator.name}</TableCell>
                <TableCell className="text-muted-foreground">{creator.handle}</TableCell>
                <TableCell className="text-sm">{getTierLabel(creator.tierNum)}</TableCell>
                <TableCell>Final bid: ${creator.finalPrice}</TableCell>
                <TableCell className="text-sm">Brief match: {CONTENT_MATCH_SHORT[creator.contentMatchNum]}</TableCell>
                <TableCell className="text-sm">Audience fit: {AUDIENCE_FIT_SHORT[creator.audienceFitNum]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {creator.sentToLead || "Not yet sent"}
                </TableCell>
                <TableCell>
                  <Button size="sm" style={{ backgroundColor: "#038B97" }}>
                    Send to Lead →
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
