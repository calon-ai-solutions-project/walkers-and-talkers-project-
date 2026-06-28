import { VolunteerShell } from "@/components/VolunteerShell";
import AddMember from "@/pages/AddMember";

// Same AddMember form the admin uses, just rendered inside the volunteer
// shell so it inherits the dark-blue kiosk chrome (and the persistent
// Check-in / Add member tab bar) instead of the admin sidebar. AddMember
// already detects the /walk path and redirects back to /walk on save
// instead of /members/:id, so no extra state to thread through.
export default function VolunteerAddMember() {
  return (
    <VolunteerShell>
      <div className="bg-white text-foreground rounded-2xl p-6 sm:p-8">
        <AddMember />
      </div>
    </VolunteerShell>
  );
}
