import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Mascot } from "@/components/Mascot";
import { Ornament } from "@/components/Ornament";
import { StudentForm, TeacherForm } from "./Forms";
import { Quote } from "@/components/Quote";
import Link from "next/link";
import { AudioLines, MessageCircleQuestion, Waypoints, Wand2 } from "lucide-react";

export const metadata: Metadata = { title: "Кіру", alternates: { canonical: "/kiru" } };

export default async function LoginPage() {
  const u = await getUser();
  if (u) redirect(u.role === "teacher" ? "/mugalim" : "/oqushy");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <Logo />
      <section className="relative overflow-hidden rounded-[32px] bg-navy px-6 pb-12 pt-8 text-white sm:px-10">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Шығарманы оқып қана қоймай, <span className="text-gold">зерттейтін</span> орын
          </h1>
          <p className="mt-4 text-lg text-white/85">5–11 сынып оқушылары мен қазақ әдебиеті мұғалімдеріне арналған зертхана.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#st" className="btn-gold">Оқушы ретінде кіру</a>
            <a href="#tc" className="btn border-2 border-white/40 text-white hover:bg-white/10">Мұғалім ретінде кіру</a>
          </div>
        </div>
        <Mascot size={170} priority className="float absolute -bottom-2 right-4 hidden sm:block" />
        <Ornament className="absolute inset-x-0 bottom-0" />
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section id="st" className="card scroll-mt-6" aria-labelledby="st-h">
          <h2 id="st-h" className="mb-1 text-2xl font-bold">Оқушы</h2>
          <p className="mb-5 text-muted">Мұғалім берген сынып кодымен қосыл.</p>
          <StudentForm />
        </section>
        <section id="tc" className="card scroll-mt-6" aria-labelledby="tc-h">
          <h2 id="tc-h" className="mb-1 text-2xl font-bold">Мұғалім</h2>
          <p className="mb-5 text-muted">Сынып ашып, тапсырма жасаңыз.</p>
          <TeacherForm />
        </section>
      </div>

      <section aria-labelledby="what" className="flex flex-col gap-4">
        <h2 id="what" className="text-2xl font-bold">Мұнда не істей аласыз</h2>
        <ul className="rise grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text, who }) => (
            <li key={title} className="card flex flex-col gap-3 p-5">
              <span className="flex items-center justify-between">
                <Icon className="size-7 text-primary" aria-hidden="true" />
                <span className="tag bg-soft text-muted">{who}</span>
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="card">
        <h2 id="how" className="text-2xl font-bold">Қалай басталады</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-primary-dark">{i + 1}</span>
              <span className="pt-1.5">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <Quote />
      <p className="text-center text-sm text-muted">
        Демо: мұғалім — demo@adebietlab.kz / demo1234 · оқушы — LAB7QA, Айару, PIN 1234
      </p>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-line pt-4 text-center text-sm text-muted">
        <span>ӘдебиетLab — «Жасанды интеллект негіздері» пәні бойынша студенттік оқу жобасы</span>
        <Link href="/qupiyalyq" className="font-bold text-primary-dark underline-offset-4 hover:underline">Құпиялық және деректер</Link>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: AudioLines, who: "Оқушы", title: "Өлең өлшегіш", text: "Буын санын, ұйқас түрін және өлең өлшемін өзің анықтап, бірден тексересің." },
  { icon: Waypoints, who: "Оқушы", title: "Кейіпкер картасы", text: "Кейіпкерлерді байланыстырып, әр байланысты мәтіннен дәлелдейсің." },
  { icon: MessageCircleQuestion, who: "Оқушы", title: "Қырантай көмекшісі", text: "Сұрақ қоясың, ол дайын жауап емес, ойлануға бағыт береді." },
  { icon: Wand2, who: "Мұғалім", title: "Тапсырма жасау", text: "Өз материалыңыздан ЖИ тапсырма құрастырады, сіз тексеріп бекітесіз." },
];

const STEPS = [
  "Мұғалім тіркеліп, сынып ашады. Жүйе 6 таңбалы код береді.",
  "Оқушы кодты, атын және 4 цифрлы PIN-ді жазып кіреді.",
  "Мұғалім тапсырма береді, нәтиже мен «сынып қайда қиналды» кестесін көреді.",
];
