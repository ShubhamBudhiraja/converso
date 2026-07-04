"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

type UserDropdownProps = {
  email?: string;
  onLogout: () => void;
};

export function UserDropdown({ email, onLogout }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="secondary"
        onClick={() => setOpen((value) => !value)}
        aria-label="Profile menu"
        className="flex h-9 w-9 items-center justify-center rounded-full p-0"
      >
        {(email?.[0] ?? "U").toUpperCase()}
      </Button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {email ? (
            <div className="border-b border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
              {email}
            </div>
          ) : null}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="selectable-item block px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            Profile settings
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="block w-full rounded-none border-0 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            Logout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
