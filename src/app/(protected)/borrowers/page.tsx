import { getBorrowersAction } from "@/app/actions/borrowers";
import { BorrowersList } from "@/components/borrowers/BorrowersList";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { serializeDecimal } from "@/utils";

interface Props {
  searchParams: Promise<{ search?: string; archived?: string }>;
}

export default async function BorrowersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search || "";
  const showArchived = params.archived === "true";

  const { borrowers } = await getBorrowersAction({
    search,
    includeArchived: showArchived,
  });
  const serializedBorrowers = serializeDecimal(borrowers);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Borrowers</h1>
        <Link href="/borrowers/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Borrower</span>
        </Link>
      </div>

      <BorrowersList
        borrowers={serializedBorrowers}
        initialSearch={search}
        showArchived={showArchived}
      />
    </div>
  );
}
