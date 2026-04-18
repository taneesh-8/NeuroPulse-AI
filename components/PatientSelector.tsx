"use client";

import { ChevronDown, User } from "lucide-react";

interface Patient {
  id: string;
  name: string;
}

interface PatientSelectorProps {
  patients: Patient[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function PatientSelector({
  patients,
  selectedId,
  onSelect,
}: PatientSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-violet/10">
        <User className="w-4 h-4 text-violet" />
      </div>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="np-select min-w-[200px]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
