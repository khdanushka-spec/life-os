"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, KeyRound, UserPen } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { signOutAction } from "@/server/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/app-shell/change-password-dialog";
import { NicknameDialog } from "@/components/app-shell/nickname-dialog";

function initialsFor(user: User | null) {
  if (!user?.email) return "?";
  return user.email.slice(0, 2).toUpperCase();
}

export function UserMenu({
  initialUser,
  nickname,
}: {
  initialUser: User | null;
  nickname: string | null;
}) {
  const user = useUser(initialUser);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(user)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {user?.email ?? "Not signed in"}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNicknameDialogOpen(true)}>
            <UserPen />
            Edit nickname
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
            <KeyRound />
            Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem variant="destructive" nativeButton render={<button type="submit" />}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      <NicknameDialog
        open={nicknameDialogOpen}
        onOpenChange={setNicknameDialogOpen}
        currentNickname={nickname}
      />
    </>
  );
}
