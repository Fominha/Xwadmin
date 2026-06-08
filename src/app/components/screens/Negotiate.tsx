import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { fetchSheetData } from "../../lib/mockApi";

type OfferStatus = "Pending Review" | "Negotiating" | "Ready to Score";

interface Offer {
  id: number;
  creator: string;
  theirAsk: number;
  recRange: string;
  finalOffer: number;
  status: OfferStatus;
  notes: string;
}

export function Negotiate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    const sheetId = localStorage.getItem("xw_sheet_id") || "mock";

    try {
      const data = await fetchSheetData(sheetId, "Net_New_Offers");
      const mapped = (data.rows || []).map((row: any, idx: number) => ({
          id: idx + 1,
          creator: row.creatorName || "Unknown",
          theirAsk: parseFloat(row.theirAsk) || 0,
          recRange: row.recRange || "$0–$0",
          finalOffer: parseFloat(row.finalOffer) || 0,
          status: (row.status as OfferStatus) || "Pending Review",
          notes: row.notes || "",
        }));
      setOffers(mapped);
      setError(false);
    } catch (err) {
      console.error("Failed to load offers:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const updateOffer = (id: number, field: keyof Offer, value: any) => {
    setOffers(offers.map(offer =>
      offer.id === id ? { ...offer, [field]: value } : offer
    ));
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#038B97] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-muted-foreground">Loading offers...</div>
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
              loadOffers();
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
      <div>
        <h1 className="text-2xl mb-2">Negotiate (Net_New_Offers)</h1>
        <p className="text-sm text-muted-foreground">
          Review creator asks and set final offers
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Their Ask</TableHead>
              <TableHead>Rec. Range</TableHead>
              <TableHead>Final Offer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No offers to review
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>{offer.creator}</TableCell>
                  <TableCell className="text-muted-foreground">
                    ${offer.theirAsk}
                  </TableCell>
                  <TableCell className="text-[#038B97]">
                    {offer.recRange}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={offer.finalOffer}
                      onChange={(e) => updateOffer(offer.id, "finalOffer", parseInt(e.target.value))}
                      className="w-24 h-8 text-sm"
                      prefix="$"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={offer.status}
                      onValueChange={(value) => updateOffer(offer.id, "status", value as OfferStatus)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending Review">Pending Review</SelectItem>
                        <SelectItem value="Negotiating">Negotiating</SelectItem>
                        <SelectItem value="Ready to Score">Ready to Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={offer.notes}
                      onChange={(e) => updateOffer(offer.id, "notes", e.target.value)}
                      className="w-32 h-8 text-xs"
                      placeholder="Add notes..."
                    />
                  </TableCell>
                  <TableCell>
                    {offer.status === "Ready to Score" ? (
                      <Button
                        size="sm"
                        className="text-xs"
                        style={{ backgroundColor: "#038B97" }}
                      >
                        → Qualify
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-amber-500 text-amber-600"
                      >
                        Lock bid
                      </Button>
                    )}
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
