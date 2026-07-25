import { requireAdminUser } from "@/server/admin-user";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const admin = await requireAdminUser("ADMIN");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {admin.username}</CardTitle>
          <CardDescription>
            Signed in as {admin.role.replace("_", " ").toLowerCase()}. This is
            a placeholder — admin tooling (user management, system settings)
            lands in a later phase.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
