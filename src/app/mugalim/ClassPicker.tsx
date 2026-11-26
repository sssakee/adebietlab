"use client";
import { useRouter } from "next/navigation";
import type { Klass } from "@/lib/teacher";

export function ClassPicker({ list, current, path = "/mugalim" }: { list: Klass[]; current: string; path?: string }) {
  const router = useRouter();
  if (list.length < 2) return null;
  return (
    <>
      <label htmlFor="cls" className="sr-only">Сынып</label>
      <select id="cls" className="field w-auto py-2" value={current} onChange={(e) => router.push(`${path}?c=${e.target.value}`)}>
        {list.map((k) => (
          <option key={k.id} value={k.id}>{k.name}</option>
        ))}
      </select>
    </>
  );
}
