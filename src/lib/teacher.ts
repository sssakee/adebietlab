import "server-only";
import { cache } from "react";
import { sql } from "./db";

export type Klass = { id: string; name: string; grade: number; join_code: string; students: number };

export const teacherClasses = cache(async (teacherId: string) =>
  sql<Klass[]>`select c.id, c.name, c.grade, c.join_code, (select count(*)::int from class_members m where m.class_id = c.id) as students
    from classes c where c.teacher_id = ${teacherId} order by c.created_at`,
);

/** The class picked with ?c=, or the first one. */
export async function pickClass(teacherId: string, c: string | string[] | undefined) {
  const list = await teacherClasses(teacherId);
  return { list, cls: list.find((k) => k.id === c) ?? list[0] ?? null };
}
