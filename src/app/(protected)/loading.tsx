import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center animate-pulse">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-900">Loading data...</h3>
        <p className="text-xs text-gray-500 mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}
