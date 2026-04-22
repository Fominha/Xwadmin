import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { DisconnectSheetModal } from "../modals/DisconnectSheetModal";

export function SheetConnector() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleConnect = () => {
    setSheetName("Campaign Q2 2026");
    setConnected(true);
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  const handleDisconnect = () => {
    setConnected(false);
    setSheetUrl("");
    setSheetName("");
  };

  if (connected) {
    return (
      <>
        <div className="h-full flex items-start justify-center pt-4">
          <div className="bg-white border border-border rounded-lg p-4 max-w-2xl w-full mx-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#038B97]" />
              <span className="text-sm">Connected: {sheetName}</span>
            </div>
            <button
              onClick={() => setDisconnectModalOpen(true)}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Disconnect
            </button>
          </div>
        </div>
        <DisconnectSheetModal
          open={disconnectModalOpen}
          onClose={() => setDisconnectModalOpen(false)}
          onConfirm={handleDisconnect}
        />
      </>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-12 max-w-lg w-full text-center border border-border">
        <div className="mb-8">
          <div
            className="text-3xl mb-2 tracking-tight"
            style={{ color: "#038B97" }}
          >
            XW
          </div>
          <h1 className="text-2xl mb-2">Connect a campaign sheet</h1>
          <p className="text-muted-foreground">
            Paste your Google Sheet URL to get started.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="w-full"
          />
          <Button
            onClick={handleConnect}
            className="w-full"
            style={{ backgroundColor: "#038B97" }}
            disabled={!sheetUrl}
          >
            Connect sheet
          </Button>
          <p className="text-xs text-muted-foreground">
            The sheet must be shared with the XW service account.
          </p>
        </div>
      </div>
    </div>
  );
}
