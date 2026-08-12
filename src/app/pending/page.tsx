import { Clock, Ban, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { requireDbUser } from "@/server/db-user";
import { signOutAction } from "@/server/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

// PENDING/REJECTED/DISABLED all render here rather than redirecting
// elsewhere - there's nowhere safe to send them: /login would immediately
// bounce a still-Supabase-authenticated user back to /home, which the
// (app) layout would just redirect back to /pending, looping forever.
// Only APPROVED has somewhere real to go.
const STATUS_COPY = {
  PENDING: {
    icon: Clock,
    title: "Awaiting approval",
    description: "is waiting on an admin to approve access. You'll be able to sign in normally once that happens.",
  },
  REJECTED: {
    icon: XCircle,
    title: "Request declined",
    description: "was not approved for access to AURA OS.",
  },
  DISABLED: {
    icon: Ban,
    title: "Account disabled",
    description: "has been disabled by an admin.",
  },
} as const;

export default async function PendingPage() {
  const dbUser = await requireDbUser();
  if (dbUser.status === "APPROVED") redirect("/home");

  const copy = STATUS_COPY[dbUser.status];
  const Icon = copy.icon;

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <CardTitle className="text-xl">{copy.title}</CardTitle>
            <CardDescription>
              Your account ({dbUser.email}) {copy.description}
            </CardDescription>
          </CardHeader>
          <CardContent />
          <CardFooter>
            <form action={signOutAction} className="w-full">
              <SubmitButton variant="outline" className="w-full">
                Sign out
              </SubmitButton>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
