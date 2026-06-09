"use client";

import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/ui/components/Avatar";
import { Button } from "@/ui/components/Button";
import { FeatherUpload } from "@subframe/core";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  currentUrl: string | null;
  fullName: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AvatarSection({ currentUrl, fullName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar 2 MB");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("No autenticado");
      setLoading(false);
      return;
    }

    const ext = file.name.split(".").at(-1) ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Error al subir la imagen");
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar image={preview ?? undefined} size="x-large" variant="brand">
        {!preview ? initials(fullName) : undefined}
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          variant="neutral-secondary"
          size="small"
          icon={<FeatherUpload />}
          onClick={() => inputRef.current?.click()}
          loading={loading}
        >
          {loading ? "Subiendo..." : "Cambiar foto"}
        </Button>
        <p className="text-xs text-neutral-400">PNG, JPG o WebP · máx. 2 MB</p>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </div>
  );
}
