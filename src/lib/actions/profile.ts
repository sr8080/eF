"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { fail, validationError, type ActionResult } from "./result";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, username: parsed.data.username })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That username is taken.", fieldErrors: { username: ["That username is taken"] } };
    }
    return fail("Could not save your profile. Please try again.");
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.");
  const ext = AVATAR_TYPES[file.type];
  if (!ext) return fail("Use a PNG, JPG, WebP or GIF image.");
  if (file.size > AVATAR_MAX_BYTES) return fail("Image must be 2 MB or smaller.");

  const supabase = await createClient();
  const folder = user.id;
  // Unique filename per upload so CDNs and browsers never serve a stale avatar.
  const path = `${folder}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return fail("Upload failed. Please try again.");

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", user.id);
  if (updateError) {
    await supabase.storage.from("avatars").remove([path]);
    return fail("Could not save your new avatar.");
  }

  // Best-effort cleanup of previous avatars in this user's folder.
  const { data: existing } = await supabase.storage.from("avatars").list(folder);
  const stale = (existing ?? [])
    .map((f) => `${folder}/${f.name}`)
    .filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("avatars").remove(stale);

  revalidatePath("/", "layout");
  return { ok: true, message: "Avatar updated.", data: { url: publicUrl.publicUrl } };
}

export async function removeAvatar(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return fail("Could not remove your avatar.");

  const { data: existing } = await supabase.storage.from("avatars").list(user.id);
  const paths = (existing ?? []).map((f) => `${user.id}/${f.name}`);
  if (paths.length) await supabase.storage.from("avatars").remove(paths);

  revalidatePath("/", "layout");
  return { ok: true, message: "Avatar removed." };
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/same.*password|different from the old/i.test(error.message)) {
      return fail("New password must be different from your current one.");
    }
    if (/reauthenticat/i.test(error.message)) {
      return fail("For security, sign out and use “Forgot password” to change it.");
    }
    return fail("Could not update your password. Please try again.");
  }
  return { ok: true, message: "Password updated." };
}
