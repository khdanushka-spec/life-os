"use client";

import { useActionState } from "react";
import { adminSignInAction, type AdminAuthState } from "@/server/actions/admin-auth";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AdminAuthState = {};

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(adminSignInAction, initialState);

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Admin sign in</CardTitle>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="flex flex-col gap-4">
              {state.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <SubmitButton>Sign in</SubmitButton>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
