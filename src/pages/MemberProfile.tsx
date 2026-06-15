import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, CreditCard, Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const attendanceHistory = [
  { date: "15 Jan 2025", location: "Bristol", time: "10:14am" },
  { date: "8 Jan 2025", location: "Bristol", time: "10:22am" },
  { date: "1 Jan 2025", location: "Bristol", time: "10:08am" },
  { date: "18 Dec 2024", location: "Bristol", time: "10:31am" },
  { date: "11 Dec 2024", location: "Bristol", time: "10:05am" },
  { date: "4 Dec 2024", location: "Bristol", time: "10:19am" },
  { date: "27 Nov 2024", location: "Bristol", time: "10:12am" },
];

export default function MemberProfile() {
  const navigate = useNavigate();

  return (
    <div>
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/members")}>
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="stat-card">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground">
                MJ
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-foreground">Mary Johnson</h1>
                  <Badge>MC-001</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                  <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-1">07712 345 678</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-1">mary.j@email.com</span></div>
                  <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground ml-1">14 Park Lane, Bristol BS1 5JA</span></div>
                  <div><span className="text-muted-foreground">Emergency:</span> <span className="text-foreground ml-1">John Johnson — 07798 123 456</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-1">Card Status</h3>
            <div className="flex items-center gap-2">
              <Badge variant="default">Active</Badge>
              <span className="text-sm text-muted-foreground">NFC card linked — ID #NFC-8834</span>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Stats</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div><p className="text-2xl font-bold text-foreground">23</p><p className="text-xs text-muted-foreground">Total Visits</p></div>
              <div><p className="text-2xl font-bold text-foreground">14 Aug 2024</p><p className="text-xs text-muted-foreground">First Visit</p></div>
              <div><p className="text-2xl font-bold text-foreground">15 Jan 2025</p><p className="text-xs text-muted-foreground">Last Visit</p></div>
              <div><p className="text-2xl font-bold text-success">7 weeks</p><p className="text-xs text-muted-foreground">Current Streak</p></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button className="gap-2"><Pencil className="h-4 w-4" /> Edit Details</Button>
            <Button variant="outline" className="gap-2"><CreditCard className="h-4 w-4" /> Deactivate Card</Button>
            <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Print Record</Button>
          </div>
        </div>

        {/* Right Column — History */}
        <div className="w-full lg:w-96">
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Attendance History</h3>
            <div className="space-y-3">
              {attendanceHistory.map((a, i) => (
                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.date}</p>
                    <p className="text-xs text-muted-foreground">{a.location}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
