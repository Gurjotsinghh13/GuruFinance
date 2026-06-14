"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageCircle, Edit2, Archive,
  RefreshCw, MoreVertical, MapPin, FileText
} from "lucide-react";
import { archiveBorrowerAction, restoreBorrowerAction } from "@/app/actions/borrowers";
import type { Borrower } from "@prisma/client";

interface Props {
  borrower: Borrower & { loans: any[] };
  whatsappLink: string;
}

export function BorrowerHeader({ borrower, whatsappLink }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);

  function handleArchive() {
    setShowMenu(false);
    startTransition(async () => {
      await archiveBorrowerAction(borrower.id);
      router.refresh();
    });
  }

  function handleRestore() {
    setShowMenu(false);
    startTransition(async () => {
      await restoreBorrowerAction(borrower.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Link href="/borrowers" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-sm text-gray-500">Borrowers</span>
      </div>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold flex-shrink-0">
              {borrower.fullName.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{borrower.fullName}</h1>
                {borrower.isArchived && (
                  <span className="badge-closed">Archived</span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <a href={`tel:${borrower.mobile}`} className="text-sm text-gray-600 hover:text-indigo-600">
                  {borrower.mobile}
                </a>
              </div>
              {borrower.alternateMobile && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-gray-300" />
                  <a href={`tel:${borrower.alternateMobile}`} className="text-sm text-gray-500">
                    {borrower.alternateMobile}
                  </a>
                </div>
              )}
              {borrower.address && (
                <div className="flex items-start gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500">{borrower.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="btn-ghost p-2"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden py-1">
                  <Link
                    href={`/borrowers/${borrower.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowMenu(false)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </Link>
                  <Link
                    href={`/borrowers/${borrower.id}/statement`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowMenu(false)}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Statement
                  </Link>
                  {borrower.isArchived ? (
                    <button
                      onClick={handleRestore}
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 w-full text-left"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={handleArchive}
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 w-full text-left"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <a href={`tel:${borrower.mobile}`} className="btn-secondary flex-1 text-sm py-2">
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp flex-1 text-sm py-2"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>

        {/* Notes */}
        {borrower.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{borrower.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
