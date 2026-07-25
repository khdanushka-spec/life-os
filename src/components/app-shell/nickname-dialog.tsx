"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateNicknameAction } from "@/server/actions/user";
import type { AuthActionState } from "@/server/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialState: AuthActionState = {};

export function NicknameDialog({
  open,
  onOpenChange,
  currentNickname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNickname: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateNicknameAction, initialState);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state.success, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit nickname</DialogTitle>
          <DialogDescription>
            What AURA OS calls you in greetings. Leave blank to use your email instead.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              name="nickname"
              defaultValue={currentNickname ?? ""}
              maxLength={30}
              autoComplete="nickname"
            />
          </div>
          <SubmitButton>Save nickname</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
