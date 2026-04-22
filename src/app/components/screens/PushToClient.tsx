import { useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { PushToClientModal } from "../modals/PushToClientModal";

interface QualifiedCreator {
  id: number;
  name: string;
  handle: string;
  tier: number;
  executionPrice: number;
  usageRights: string;
  contentMatch: number;
  audienceFit: number;
}

const qualifiedCreators: QualifiedCreator[] = [
  { id: 1, name: "Sarah Johnson", handle: "@sarahjstyle", tier: 4, executionPrice: 450, usageRights: "1 year", contentMatch: 5, audienceFit: 4 },
  { id: 2, name: "Marcus Chen", handle: "@marcusfashion", tier: 3, executionPrice: 380, usageRights: "6 months", contentMatch: 4, audienceFit: 4 },
  { id: 3, name: "Emma Davis", handle: "@emmastyle", tier: 5, executionPrice: 520, usageRights: "1 year", contentMatch: 5, audienceFit: 5 },
  { id: 4, name: "Jessica Park", handle: "@jessicap", tier: 4, executionPrice: 490, usageRights: "1 year", contentMatch: 5, audienceFit: 4 },
  { id: 5, name: "Tyler Brooks", handle: "@tylerb", tier: 3, executionPrice: 340, usageRights: "6 months", contentMatch: 3, audienceFit: 3 },
];

export function PushToClient() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<QualifiedCreator | null>(null);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(
      selectedIds.length === qualifiedCreators.length
        ? []
        : qualifiedCreators.map((c) => c.id)
    );
  };

  const handlePushClick = (creator: QualifiedCreator) => {
    setSelectedCreator(creator);
    setModalOpen(true);
  };

  const handleBatchPush = () => {
    alert(`Pushing ${selectedIds.length} creators to client...`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Push to Client</h1>
          <p className="text-sm text-muted-foreground">
            Review and send qualified creators to client for final selection
          </p>
        </div>
        <Button
          disabled={selectedIds.length === 0}
          onClick={handleBatchPush}
          style={{ backgroundColor: "#038B97" }}
        >
          Push selected ({selectedIds.length})
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === qualifiedCreators.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Usage Rights</TableHead>
              <TableHead>Content Match</TableHead>
              <TableHead>Audience Fit</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qualifiedCreators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(creator.id)}
                    onCheckedChange={() => toggleSelection(creator.id)}
                  />
                </TableCell>
                <TableCell>{creator.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {creator.handle}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-[#038B97]/10 text-[#038B97] border border-[#038B97]/20">
                    Tier {creator.tier}
                  </span>
                </TableCell>
                <TableCell>${creator.executionPrice}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {creator.usageRights}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-muted">
                    {creator.contentMatch}/5
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-muted">
                    {creator.audienceFit}/5
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => handlePushClick(creator)}
                    style={{ backgroundColor: "#038B97" }}
                  >
                    Push →
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedCreator && (
        <PushToClientModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          creator={selectedCreator}
          budgetWarning={selectedCreator.executionPrice > 450}
        />
      )}
    </div>
  );
}
