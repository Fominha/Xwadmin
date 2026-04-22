import { useState } from "react";
import { Upload } from "lucide-react";
import { Progress } from "../ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export function Import() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploaded(true);
        }
      }, 200);
    }
  };

  const recentUploads = [
    { creator: "Sarah Johnson", handle: "@sarahjstyle", followers: "245K", offer: "$450", status: "Queued" },
    { creator: "Marcus Chen", handle: "@marcusfashion", followers: "189K", offer: "$380", status: "Queued" },
    { creator: "Emma Davis", handle: "@emmastyle", followers: "312K", offer: "$520", status: "Queued" },
    { creator: "Alex Rodriguez", handle: "@alexfits", followers: "156K", offer: "$340", status: "Queued" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl mb-2">Import Creators</h1>
        <p className="text-sm text-muted-foreground">
          Upload XLS files to add creators to the campaign pipeline
        </p>
      </div>

      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-border p-12 cursor-pointer hover:border-[#038B97] transition-colors"
      >
        <Upload className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm mb-2">Drop XLS file here or click to upload</p>
        <p className="text-xs text-muted-foreground">Supports .xls and .xlsx files</p>
        <input
          id="file-upload"
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </label>

      {uploading && (
        <div className="bg-white rounded-lg border border-border p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading batch 3 of 10...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" style={{ backgroundColor: "#038B97" }} />
        </div>
      )}

      {uploaded && (
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Upload Summary</h3>
            <div className="text-sm text-muted-foreground">Just now</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-2xl text-[#038B97]">124</div>
              <div className="text-muted-foreground">New creators</div>
            </div>
            <div>
              <div className="text-2xl text-muted-foreground">18</div>
              <div className="text-muted-foreground">Duplicates skipped</div>
            </div>
            <div>
              <div className="text-2xl text-[#038B97]">124</div>
              <div className="text-muted-foreground">Offers queued</div>
            </div>
          </div>
        </div>
      )}

      {uploaded && (
        <div className="bg-white rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm">Latest Upload Batch</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUploads.map((creator, idx) => (
                <TableRow key={idx}>
                  <TableCell>{creator.creator}</TableCell>
                  <TableCell className="text-muted-foreground">{creator.handle}</TableCell>
                  <TableCell>{creator.followers}</TableCell>
                  <TableCell>{creator.offer}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full bg-muted text-xs">
                      {creator.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
