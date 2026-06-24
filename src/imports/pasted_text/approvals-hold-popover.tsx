I have everything I need. The design is clean:

handlePassBackClick already receives the click event e. I'll capture e.currentTarget.getBoundingClientRect() there to record the button's screen position into a new popoverPos state.
The popover renders via createPortal(..., document.body) at position: fixed using those coordinates — escaping overflow-hidden entirely.
The click-outside handler keeps working because the portaled popover div still carries the pass-back-popover class, and target.closest(".pass-back-popover") walks the real DOM tree (which includes portaled nodes), so clicks inside it are still recognized.
position: fixed + viewport coordinates from getBoundingClientRect() means it's correctly placed relative to the button even though it's rendered at body level.

One positioning detail: I'll anchor the popover's top-right corner near the button and nudge it so it opens below-and-left of the Hold button, and clamp it so a button near the right edge doesn't push the 288px-wide (w-72) popover off-screen.
Here's the Option B prompt:

TARGET FILE: src/app/components/screens/Approvals.tsx — and ONLY this file.
ROOT CAUSE (confirmed): The Hold popover is absolute-positioned inside the table's overflow-hidden container (line ~289), so it gets clipped when the row is collapsed. CSS positioning alone can't escape an overflow-hidden ancestor.
FIX (portal): Render the Hold popover into a React portal at document.body level — outside the clipping container — positioned at the Hold button's screen coordinates using position: fixed. This makes the popover immune to the overflow-hidden clip regardless of row position or count.
CHANGES:
1. Add the import (top of file, with the other imports):
tsximport { createPortal } from "react-dom";
2. Add position state (near the other useState declarations, with the pass-back state):
tsxconst [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
3. Update handlePassBackClick to capture the button's screen position. Replace the current function with:
tsxconst handlePassBackClick = (creatorId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  // open below the button; clamp so the 288px popover stays on-screen
  const left = Math.min(rect.right - 288, window.innerWidth - 288 - 16);
  setPopoverPos({ top: rect.bottom + 4, left: Math.max(16, left) });
  setPassBackPopoverId(creatorId);
  setPassBackReason("");
  setPassBackError("");
};
4. Replace the inline popover with a portaled one. Find the Hold cell's popover block (currently the {passBackPopoverId === creator.id && ( <div className="pass-back-popover absolute ...">...</div> )} inside <div className="relative inline-block">). Replace ONLY the popover <div> (keep the button and the wrapper). The popover becomes a portal rendered at fixed coordinates:
tsx{passBackPopoverId === creator.id && popoverPos && createPortal(
  <div
    className="pass-back-popover bg-white border border-border rounded-lg shadow-lg p-4 w-72"
    style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 50 }}
  >
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Reason for hold</label>
        <Select value={passBackReason} onValueChange={setPassBackReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Price too high">Price too high</SelectItem>
            <SelectItem value="Not the right fit">Not the right fit</SelectItem>
            <SelectItem value="Brief misalignment">Brief misalignment</SelectItem>
            <SelectItem value="Try renegotiating">Try renegotiating</SelectItem>
            <SelectItem value="Compliance concern">Compliance concern</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {passBackError && (
          <div className="text-xs text-red-600">{passBackError}</div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleCancelPassBack} className="flex-1">
          Cancel
        </Button>
        <Button size="sm" style={{ backgroundColor: "#038B97" }} onClick={(e) => handleConfirmHold(creator, e)} className="flex-1">
          Confirm hold
        </Button>
      </div>
    </div>
  </div>,
  document.body
)}
5. Clear popoverPos when the popover closes. In handleCancelPassBack AND handleConfirmHold AND the click-outside handler, wherever setPassBackPopoverId(null) is called, also call setPopoverPos(null) right after it.
Keep the <div className="relative inline-block"> wrapper and the Hold <button> exactly as they are — only the popover moves to a portal. The button keeps its pass-back-popover class and onClick={(e) => handlePassBackClick(creator.id, e)}.
Why this works: the portaled popover renders at document.body, outside the overflow-hidden table container, so it can't be clipped. position: fixed + the button's getBoundingClientRect() coordinates place it correctly at the button. The click-outside handler still works because the portaled div keeps the pass-back-popover class and closest() traverses the real DOM.
DO NOT CHANGE: fetchPushedCreators, handleApprove, handleApproveAll, handleConfirmHold's DB write logic, the Held badge, the Sent-to-client section, the table structure, the overflow-hidden container (leave it — the portal escapes it), all other JSX/state/imports.
DO NOT import/recreate Pipeline.tsx.
VERIFICATION:

createPortal is imported from react-dom.
The Hold popover is rendered via createPortal(..., document.body) with position: fixed at popoverPos coordinates.
handlePassBackClick captures the button rect and sets popoverPos.
popoverPos is cleared (setPopoverPos(null)) everywhere the popover closes.
The button keeps the pass-back-popover class; no other logic changed.