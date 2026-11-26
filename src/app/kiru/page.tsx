import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Mascot } from "@/components/Mascot";
import { Ornament } from "@/components/Ornament";
import { StudentForm, TeacherForm } from "./Forms";

export const metadata: Metadata = { title: "Кіру" };

export default async function LoginPage() {
  const u = await getUser();
  if (u) redirect(u.role === "teacher" ? "/mugalim" : "/oqushy");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <Logo />
      <section className="relative overflow-hidden rounded-[32px] bg-navy px-6 pb-12 pt-8 text-white sm:px-10">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Әдебиетті зертте. <span className="text-gold">Мағынаны аш.</span> Ойыңды дамыт.
          </h1>
          <p className="mt-4 text-lg text-white/85">5–11 сынып оқушылары мен қазақ әдебиеті мұғалімдеріне арналған зертхана.</p>
        </div>
        <Mascot size={170} priority className="absolute -bottom-2 right-4 hidden sm:block" />
        <Ornament className="absolute inset-x-0 bottom-0" />
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card" aria-labelledby="st">
          <h2 id="st" className="mb-1 text-2xl font-bold">Оқушы</h2>
          <p className="mb-5 text-muted">Мұғалім берген сынып кодымен қосыл.</p>
          <StudentForm />
        </section>
        <section className="card" aria-labelledby="tc">
          <h2 id="tc" className="mb-1 text-2xl font-bold">Мұғалім</h2>
          <p className="mb-5 text-muted">Сынып ашып, тапсырма жасаңыз.</p>
          <TeacherForm />
        </section>
      </div>
      <p className="text-center text-sm text-muted">
        Демо: мұғалім — demo@adebietlab.kz / demo1234 · оқушы — LAB7QA, Айару, PIN 1234
      </p>
    </div>
  );
}
