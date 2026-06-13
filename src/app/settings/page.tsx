import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { DEFAULT_TEMPLATES } from "@/features/whatsapp";
import { MessageType } from "@prisma/client";

export default async function SettingsPage() {
  const session = await requireAuth();

  // Load current templates from DB
  const savedSettings = await prisma.settings.findMany({
    where: {
      key: { startsWith: "whatsapp_template_" },
    },
  });

  const templates = Object.values(MessageType)
    .filter((t) => t !== MessageType.CUSTOM)
    .map((type) => {
      const saved = savedSettings.find((s) => s.key === `whatsapp_template_${type}`);
      return {
        type,
        value: saved?.value || DEFAULT_TEMPLATES[type],
      };
    });

  return <SettingsClient user={session} templates={templates} />;
}
