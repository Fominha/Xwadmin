import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Search } from "lucide-react";
import { fetchSheetData } from "../../lib/mockApi";

const stagePillStyles: Record<string, string> = {
  Stored: "bg-gray-100 text-gray-700 border-gray-200",
  "In Pool": "bg-blue-100 text-blue-700 border-blue-200",
  "Offer In": "bg-amber-100 text-amber-700 border-amber-200",
  "Ready to Neg": "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  "Final Bid": "bg-green-100 text-green-700 border-green-200",
  "Sent to Client": "bg-purple-100 text-purple-700 border-purple-200",
};

const stages = ["All", "Stored", "In Pool", "Offer In", "Ready to Neg", "Final Bid", "Sent to Client"];

interface Creator {
  id: number;
  name: string;
  handle: string;
  stage: string;
  followers: string;
  offer: string;
  sendgrid: boolean;
  readyToNeg: boolean;
  finalBid: string;
  action: string;
}

export function Pipeline() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPipeline();
  }, []);

  const loadPipeline = async () => {
    const sheetId = localStorage.getItem("xw_sheet_id") || "mock";

    try {
      const data = await fetchSheetData(sheetId, "Supply_Pipeline");
      const mapped = (data.rows || []).map((row: any, idx: number) => ({
          id: idx + 1,
          name: row.creatorName || "Unknown",
          handle: row.handle || "@unknown",
          stage: row.pipelineStatus || "Stored",
          followers: row.followers || "0",
          offer: row.offer || "$0",
          sendgrid: row.sendgridActive === "true",
          readyToNeg: row.readyToNegotiate === "true",
          finalBid: row.finalBid || "-",
          action: getAction(row.pipelineStatus),
        }));
      setCreators(mapped);
      setError(false);
    } catch (err) {
      console.error("Failed to load pipeline:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getAction = (stage: string) => {
    if (stage === "Ready to Neg" || stage === "Offer In") return "Set Bid";
    if (stage === "Final Bid") return "Push to Client";
    if (stage === "In Pool") return "Qualify";
    return "Activate";
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const filtered = getFilteredCreators();
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((c) => c.id));
  };

  const getFilteredCreators = () => {
    let filtered = creators;

    if (activeFilter !== "All") {
      filtered = filtered.filter((c) => c.stage === activeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(query) || c.handle.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredCreators = getFilteredCreators();

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#038B97] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Loading pipeline...</div>
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
              loadPipeline();
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

      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveFilter(stage)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeFilter === stage
                  ? "bg-[#038B97] text-white border-[#038B97]"
                  : "bg-white text-muted-foreground border-border hover:border-[#038B97]/50"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by creator name or handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredCreators.length > 0 && selectedIds.length === filteredCreators.length}
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
            {filteredCreators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No creators found
                </TableCell>
              </TableRow>
            ) : (
              filteredCreators.map((creator) => (
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
                    <Button size="sm" variant="outline" className="text-xs">
                      {creator.action}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
