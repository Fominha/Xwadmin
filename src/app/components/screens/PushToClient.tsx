import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { PushToClientModal } from "../modals/PushToClientModal";
import { fetchSheetData } from "../../lib/mockApi";

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

export function PushToClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qualifiedCreators, setQualifiedCreators] = useState<QualifiedCreator[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<QualifiedCreator | null>(null);

  useEffect(() => {
    loadQualifiedCreators();
  }, []);

  const loadQualifiedCreators = async () => {
    const sheetId = localStorage.getItem("xw_sheet_id") || "mock";

    try {
      const data = await fetchSheetData(sheetId, "Score_Creators");
      const mapped = (data.rows || [])
          .filter((row: any) => row.reviewStatus === "Sent to Client")
          .map((row: any, idx: number) => ({
            id: idx + 1,
            name: row.creatorName || "Unknown",
            handle: row.handle || "@unknown",
            tier: parseInt(row.productionTier) || 1,
            executionPrice: parseFloat(row.executionPrice) || 0,
            usageRights: row.usageRights || "6 months",
            contentMatch: parseInt(row.contentMatch) || 1,
            audienceFit: parseInt(row.audienceFit) || 1,
          }));
      setQualifiedCreators(mapped);
      setError(false);
    } catch (err) {
      console.error("Failed to load qualified creators:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#038B97] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Loading qualified creators...</div>
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
              loadQualifiedCreators();
            }}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
