"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, startSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashSecret, verifySecret } from "@/lib/password";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

/** Error plus the non-secret fields, so the form can be refilled (React resets forms after an action). */
const fail = (error: string, f: FormData, keys: string[]): FormState => ({ error, values: Object.fromEntries(keys.map((k) => [k, str(f, k)])) });

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function teacherLogin(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const [u] = await sql`select id, password_hash from profiles where email = ${email} and role = 'teacher'`;
  // One message for both cases: do not reveal whether the account exists.
  if (!u || !verifySecret(str(f, "password"), u.password_hash)) return fail("Пошта немесе құпиясөз қате.", f, ["email"]);
  await startSession(u.id);
  redirect("/mugalim");
}

const Register = z.object({
  name: z.string().min(3, "Аты-жөніңізді толық жазыңыз."),
  email: z.email("Электрондық пошта дұрыс емес."),
  password: z.string().min(8, "Құпиясөз кемінде 8 таңба болсын."),
});

export async function teacherRegister(_: FormState, f: FormData): Promise<FormState> {
  const p = Register.safeParse({ name: str(f, "name"), email: str(f, "email").toLowerCase(), password: str(f, "password") });
  if (!p.success) return fail(p.error.issues[0].message, f, ["name", "email"]);
  const [u] = await sql`insert into profiles (role, full_name, email, password_hash)
    values ('teacher', ${p.data.name}, ${p.data.email}, ${hashSecret(p.data.password)})
    on conflict (email) do nothing returning id`;
  if (!u) return fail("Бұл поштамен тіркелген аккаунт бар. Кіріп көріңіз.", f, ["name", "email"]);
  await startSession(u.id);
  redirect("/mugalim/synyptar");
}

/** Student: class code + first name + PIN. First time creates the account, later it signs in. */
export async function studentJoin(_: FormState, f: FormData): Promise<FormState> {
  const code = str(f, "code").toUpperCase();
  const name = str(f, "name").replace(/\s+/g, " ");
  const pin = str(f, "pin");
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("Сынып коды 6 таңбадан тұрады.", f, ["code", "name"]);
  if (name.length < 2 || name.length > 40) return fail("Атыңды жаз.", f, ["code", "name"]);
  if (!/^\d{4}$/.test(pin)) return fail("PIN 4 цифрдан тұрады.", f, ["code", "name"]);

  const [cls] = await sql`select id from classes where join_code = ${code}`;
  if (!cls) return fail("Мұндай сынып коды табылмады. Мұғаліміңнен тексер.", f, ["code", "name"]);

  const [existing] = await sql`select p.id, p.pin_hash from profiles p
    join class_members m on m.student_id = p.id
    where m.class_id = ${cls.id} and lower(p.full_name) = lower(${name})`;
  if (existing) {
    if (!verifySecret(pin, existing.pin_hash)) return fail("Бұл есіммен сыныпта оқушы бар, PIN сәйкес емес.", f, ["code", "name"]);
    await startSession(existing.id);
  } else {
    const id = await sql.begin(async (tx) => {
      const [s] = await tx`insert into profiles (role, full_name, pin_hash) values ('student', ${name}, ${hashSecret(pin)}) returning id`;
      await tx`insert into class_members values (${cls.id}, ${s.id})`;
      return s.id as string;
    });
    await startSession(id);
  }
  redirect("/oqushy");
}

export async function logout() {
  await endSession();
  redirect("/kiru");
}
