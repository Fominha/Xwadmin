import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

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
  const [offers, setOffers] = useState<Offer[]>([
    { id: 1, creator: "Sarah Johnson", theirAsk: 500, recRange: "$400–$480", finalOffer: 450, status: "Negotiating", notes: "Counter offer sent" },
    { id: 2, creator: "Marcus Chen", theirAsk: 420, recRange: "$340–$400", finalOffer: 380, status: "Ready to Score", notes: "Accepted" },
    { id: 3, creator: "Emma Davis", theirAsk: 580, recRange: "$460–$540", finalOffer: 520, status: "Pending Review", notes: "" },
    { id: 4, creator: "Alex Rodriguez", theirAsk: 380, recRange: "$300–$360", finalOffer: 340, status: "Ready to Score", notes: "Accepted final offer" },
  ]);

  const updateOffer = (id: number, field: keyof Offer, value: any) => {
    setOffers(offers.map(offer =>
      offer.id === id ? { ...offer, [field]: value } : offer
    ));
  };

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
            {offers.map((offer) => (
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
