import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { authenticateUser, setCurrentUser, UserRole } from "../../lib/auth";

export function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>("ops");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!password) {
      setError("Password required");
      return;
    }

    if (authenticateUser(selectedRole, password)) {
      setCurrentUser(selectedRole);
      navigate("/dashboard");
    } else {
      setError("Invalid password");
      setPassword("");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-white rounded-lg shadow-lg p-12 max-w-md w-full border border-border">
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2 tracking-tight" style={{ color: "#038B97" }}>
            XW Admin
          </div>
          <p className="text-sm text-muted-foreground">Select your role to continue</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Select your role</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedRole("ops")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedRole === "ops"
                    ? "border-[#038B97] bg-[#038B97]/5"
                    : "border-border hover:border-[#038B97]/50"
                }`}
              >
                <div className="text-sm mb-1">Ops</div>
                <div className="text-xs text-muted-foreground">Operations</div>
              </button>
              <button
                onClick={() => setSelectedRole("lead")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedRole === "lead"
                    ? "border-[#038B97] bg-[#038B97]/5"
                    : "border-border hover:border-[#038B97]/50"
                }`}
              >
                <div className="text-sm mb-1">Lead</div>
                <div className="text-xs text-muted-foreground">Director</div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter password"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button
            onClick={handleLogin}
            className="w-full"
            style={{ backgroundColor: "#038B97" }}
          >
            Sign in
          </Button>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          For demo: ops123 or lead123
        </div>
      </div>
    </div>
  );
}
