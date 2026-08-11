"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function saveTemplateAction(type: string, value: string): Promise<{ success?: boolean; error?: string }> {
  const session = await requireAuth();

  await prisma.settings.upsert({
    where: {
      userId_key: {
        userId: session.id,
        key: `whatsapp_template_${type}`,
      },
    },
    update: { value },
    create: {
      userId: session.id,
      key: `whatsapp_template_${type}`,
      value,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.SETTINGS_UPDATED,
      entityType: "Settings",
      details: { key: `whatsapp_template_${type}` },
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
