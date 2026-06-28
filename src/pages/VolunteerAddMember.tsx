import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { VolunteerShell } from "@/components/VolunteerShell";
import AddMember from "@/pages/AddMember";

// Same AddMember form the admin uses, just rendered inside the volunteer
// shell so it inherits the dark-blue kiosk chrome instead of the admin
// sidebar. AddMember already detects the /walk path and redirects back
// to /walk on save instead of /members/:id, so we don't need to thread
// any extra state through.
export default function VolunteerAddMember() {
  return (
    <VolunteerShell>
      <Link
        to="/walk"
        className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to today's walk
      </Link>
      <div className="bg-white text-foreground rounded-2xl p-6 sm:p-8">
        <AddMember />
      </div>
    </VolunteerShell>
  );
}
