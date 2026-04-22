import { Progress } from "../ui/progress";

const stageData = [
  { label: "Stored", count: 142, delta: "+12", color: "#9ca3af" },
  { label: "In Pool", count: 89, delta: "+5", color: "#3b82f6" },
  { label: "Offer In", count: 47, delta: "-3", color: "#f59e0b" },
  { label: "Ready to Neg", count: 12, delta: "+8", color: "#038B97" },
  { label: "Final Bid", count: 23, delta: "+4", color: "#10b981" },
  { label: "Sent to Client", count: 15, delta: "+2", color: "#a855f7" },
];

export function Dashboard() {
  const budget = 125000;
  const committed = 87500;
  const percentage = (committed / budget) * 100;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl mb-1">Spring Fashion Campaign</h2>
            <p className="text-sm text-muted-foreground">Client: Luxe Apparel</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">
              Posting window
            </div>
            <div className="text-sm">Apr 25 – May 15, 2026</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span>
              ${committed.toLocaleString()} / ${budget.toLocaleString()}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full text-sm bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
            12 days until supply chain closes
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stageData.map((stage) => (
          <div
            key={stage.label}
            className="bg-white rounded-lg border border-border p-4"
          >
            <div className="text-2xl mb-1">{stage.count}</div>
            <div className="text-sm text-muted-foreground mb-2">
              {stage.label}
            </div>
            <div
              className="text-xs"
              style={{
                color: stage.delta.startsWith("+") ? "#10b981" : "#ef4444",
              }}
            >
              {stage.delta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
