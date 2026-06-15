import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";

export default function AddMember() {
  const [cardState, setCardState] = useState<"idle" | "waiting" | "linked">("idle");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="page-header">Add New Member</h1>
        <p className="page-subheader">Register a member and activate their NFC card</p>
      </div>

      <div className="stat-card space-y-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input placeholder="First name" />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input placeholder="Last name" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input placeholder="07700 000 000" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="email@example.com" type="email" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Input placeholder="Full address" />
        </div>

        <div className="space-y-2">
          <Label>Emergency Contact</Label>
          <Input placeholder="Name — Phone number" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Location</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bristol">Bristol</SelectItem>
                <SelectItem value="cardiff">Cardiff</SelectItem>
                <SelectItem value="worcester">Worcester</SelectItem>
                <SelectItem value="taunton">Taunton</SelectItem>
                <SelectItem value="durham">Durham</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Registration Method</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="How registered?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin Entry</SelectItem>
                <SelectItem value="paper">Paper Form</SelectItem>
                <SelectItem value="online">Online Registration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* NFC Card Activation */}
      <div className="stat-card mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Activate NFC Card
        </h3>
        {cardState === "idle" && (
          <Button variant="outline" onClick={() => setCardState("waiting")} className="w-full h-20 text-base border-dashed">
            Click to start card activation
          </Button>
        )}
        {cardState === "waiting" && (
          <div className="w-full h-20 rounded-lg border-2 border-dashed border-primary flex items-center justify-center animate-pulse">
            <p className="text-primary font-medium">Tap card on reader now...</p>
          </div>
        )}
        {cardState === "linked" && (
          <div className="w-full h-20 rounded-lg border-2 border-success bg-success/5 flex items-center justify-center">
            <p className="text-success font-medium">✓ Card linked successfully — NFC-8835</p>
          </div>
        )}
      </div>

      <Button size="lg" className="w-full sm:w-auto" onClick={() => setCardState("linked")}>
        Save & Activate Member
      </Button>
    </div>
  );
}
