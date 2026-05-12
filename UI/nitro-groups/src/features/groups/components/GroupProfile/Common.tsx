import { Star, MapPin, Users, Zap } from "lucide-react";
import type { StatCardProps, FieldProps } from "./types";

export function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white truncate">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}
