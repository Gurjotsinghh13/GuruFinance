import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditBorrowerForm } from "@/components/borrowers/EditBorrowerForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBorrowerPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();

  const borrower = await prisma.borrower.findFirst({
    where: { id, userId: session.id },
  });

  if (!borrower) notFound();

  return <EditBorrowerForm borrower={borrower} />;
}
