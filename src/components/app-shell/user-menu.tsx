"use client";

import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { signOutAction } from "@/server/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFor(user: User | null) {
  if (!user?.email) return "?";
  return user.email.slice(0, 2).toUpperCase();
}

export function UserMenu({ initialUser }: { initialUser: User | null }) {
  const user = useUser(initialUser);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar size="sm">
          <AvatarFallback>{initialsFor(user)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user?.email ?? "Not signed in"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem variant="destructive" render={<button type="submit" />}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
