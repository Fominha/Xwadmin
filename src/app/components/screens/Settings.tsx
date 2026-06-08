import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { supabase } from "../../lib/supabase";
import { Users, Mail, Plus, Shield } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: "ops" | "lead" | "client";
  created_at: string;
}

const roleLabels: Record<string, string> = {
  ops: "Ops",
  lead: "Lead",
  client: "Client",
};

const roleStyles: Record<string, string> = {
  ops: "bg-[#038B97]/10 text-[#038B97] border-[#038B97]/20",
  lead: "bg-purple-50 text-purple-700 border-purple-200",
  client: "bg-amber-50 text-amber-700 border-amber-200",
};

export function Settings() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"ops" | "lead" | "client">("ops");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteName("");
    setInviteError("");
    setInviteRole("ops");
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError("Email is required."); return; }
    if (!inviteName.trim()) { setInviteError("Name is required."); return; }

    setInviting(true);
    setInviteError("");

    const { error } = await supabase.from("user_profiles").insert({
      email: inviteEmail.trim().toLowerCase(),
      name: inviteName.trim(),
      role: inviteRole,
      created_at: new Date().toISOString(),
    });

    setInviting(false);

    if (error) {
      setInviteError(error.message);
      return;
    }

    setInviteOpen(false);
    resetInviteForm();
    setToastMsg("Invite sent");
    fetchUsers();
  };

  const teamMembers = users.filter(u => u.role === "ops" || u.role === "lead");
  const clientAccess = users.filter(u => u.role === "client");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage team access and client logins</p>
      </div>

      {/* Team Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#038B97]" />
            <h2 className="text-base">Team</h2>
          </div>
          <Button
            style={{ backgroundColor: "#038B97" }}
            className="flex items-center gap-2"
            onClick={() => { resetInviteForm(); setInviteRole("ops"); setInviteOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            Invite Team Member
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-border divide-y divide-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : teamMembers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No team members yet.</div>
          ) : (
            teamMembers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#038B97]/10 flex items-center justify-center text-sm text-[#038B97]">
                    {(u.name ?? u.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm">{u.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${roleStyles[u.role]}`}>
                  {roleLabels[u.role]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Client Access Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#038B97]" />
            <h2 className="text-base">Client Access</h2>
          </div>
          <Button
            variant="outline"
            style={{ borderColor: "#038B97", color: "#038B97" }}
            className="flex items-center gap-2"
            onClick={() => { resetInviteForm(); setInviteRole("client"); setInviteOpen(true); }}
          >
            <Mail className="w-4 h-4" />
            Invite Fundify
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-border divide-y divide-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : clientAccess.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No client accounts yet.</div>
          ) : (
            clientAccess.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-sm text-amber-700">
                    {(u.name ?? u.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm">{u.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${roleStyles[u.role]}`}>
                  {roleLabels[u.role]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) { setInviteOpen(false); resetInviteForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {inviteRole === "client" ? "Invite Fundify" : "Invite Team Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            {inviteRole !== "client" && (
              <div className="space-y-1.5">
                <Label>Role</Label>
                <div className="flex gap-2">
                  {(["ops", "lead"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`flex-1 py-2 rounded border text-sm transition-colors ${
                        inviteRole === r
                          ? "border-[#038B97] bg-[#038B97]/10 text-[#038B97]"
                          : "border-border text-muted-foreground hover:border-[#038B97]/50"
                      }`}
                    >
                      {roleLabels[r]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setInviteOpen(false); resetInviteForm(); }}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                style={{ backgroundColor: "#038B97" }}
                disabled={inviting}
                onClick={handleInvite}
              >
                {inviting ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
