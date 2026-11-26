"use client";

import { useRef, useTransition } from "react";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeAvatar, uploadAvatar } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/user/user-avatar";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    // Quick client-side checks for instant feedback; the server re-validates.
    if (!ACCEPT.split(",").includes(file.type)) return toast.error("Use a PNG, JPG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return toast.error("Image must be 2 MB or smaller.");

    const data = new FormData();
    data.set("avatar", file);
    startTransition(async () => {
      const result = await uploadAvatar(data);
      if (result.ok) toast.success(result.message ?? "Avatar updated.");
      else toast.error(result.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.ok) toast.success(result.message ?? "Avatar removed.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar name={name} src={avatarUrl} className="size-16 text-lg" />
        {pending && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
            <LoaderCircle className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          id="avatar-input"
          onChange={(e) => onFileChosen(e.target.files?.[0])}
          disabled={pending}
        />
        <Button type="button" variant="secondary" disabled={pending} onClick={() => inputRef.current?.click()}>
          <ImageUp /> {avatarUrl ? "Change photo" : "Upload photo"}
        </Button>

        {avatarUrl && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" disabled={pending} className="text-muted-foreground">
                <Trash2 /> Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                <AlertDialogDescription>Your initials will be shown instead.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onRemove}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <p className="w-full text-xs text-muted-foreground">PNG, JPG, WebP or GIF, up to 2 MB.</p>
      </div>
    </div>
  );
}
