import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Download, RefreshCw } from "lucide-react";

const paymentStatusStyles: Record<string, string> = {
  Unpaid: "bg-amber-100 text-amber-700 border-amber-200",
  Invoiced: "bg-blue-100 text-blue-700 border-blue-200",
  Paid: "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  Overdue: "bg-red-100 text-red-700 border-red-200",
};

const orders = [
  {
    creator: "Sarah Johnson",
    price: "$450",
    paymentStatus: "Paid",
    invoiceDue: "Apr 30",
    scriptStatus: "Approved",
    contentStatus: "In Review",
    creatorNotified: true,
    dueDate: "May 5",
  },
  {
    creator: "Marcus Chen",
    price: "$380",
    paymentStatus: "Invoiced",
    invoiceDue: "Apr 28",
    scriptStatus: "Pending",
    contentStatus: "Not Started",
    creatorNotified: true,
    dueDate: "May 8",
  },
  {
    creator: "Emma Davis",
    price: "$520",
    paymentStatus: "Paid",
    invoiceDue: "Apr 25",
    scriptStatus: "Approved",
    contentStatus: "Delivered",
    creatorNotified: true,
    dueDate: "May 3",
  },
  {
    creator: "Alex Rodriguez",
    price: "$340",
    paymentStatus: "Unpaid",
    invoiceDue: "May 2",
    scriptStatus: "Draft",
    contentStatus: "Not Started",
    creatorNotified: false,
    dueDate: "May 10",
  },
  {
    creator: "Jessica Park",
    price: "$490",
    paymentStatus: "Overdue",
    invoiceDue: "Apr 20",
    scriptStatus: "Approved",
    contentStatus: "In Progress",
    creatorNotified: true,
    dueDate: "May 6",
  },
];

export function Orders() {
  const handleSync = () => {
    alert("Syncing latest decisions from Client_Selections...");
  };

  const handleExport = () => {
    alert("Exporting orders to CSV...");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl mb-2">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track payment, script, and content status for all campaign orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync decisions
          </Button>
          <Button
            onClick={handleExport}
            className="flex items-center gap-2"
            style={{ backgroundColor: "#038B97" }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Invoice Due</TableHead>
              <TableHead>Script Status</TableHead>
              <TableHead>Content Status</TableHead>
              <TableHead>Creator Notified</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, idx) => (
              <TableRow key={idx}>
                <TableCell>{order.creator}</TableCell>
                <TableCell>{order.price}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${
                      paymentStatusStyles[order.paymentStatus]
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{order.invoiceDue}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {order.scriptStatus}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {order.contentStatus}
                </TableCell>
                <TableCell>
                  {order.creatorNotified ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{order.dueDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl text-[#038B97] mb-1">15</div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </div>
          <div>
            <div className="text-3xl text-green-600 mb-1">8</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </div>
          <div>
            <div className="text-3xl text-amber-600 mb-1">5</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div>
            <div className="text-3xl text-red-600 mb-1">2</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
