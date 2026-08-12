import { Clock } from "lucide-react";
import { requireDbUser } from "@/server/db-user";
import { signOutAction } from "@/server/actions/auth";
import { redirect } from "next/navigation";
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

export default async function PendingPage() {
  const dbUser = await requireDbUser();
  // Already resolved, nothing to wait for - don't strand an approved or
  // rejected user on a "pending" page.
  if (dbUser.status !== "PENDING") redirect(dbUser.status === "APPROVED" ? "/home" : "/login");

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Clock className="size-4 text-primary" />
            </div>
            <CardTitle className="text-xl">Awaiting approval</CardTitle>
            <CardDescription>
              Your account ({dbUser.email}) is waiting on an admin to approve access. You&apos;ll be able to sign
              in normally once that happens.
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
