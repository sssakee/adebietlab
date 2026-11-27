import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { buildQuiz, DAILY } from "@/lib/quiz";
import { quizWorks, today } from "@/lib/queries";
import { PageHead } from "@/components/PageHead";
import { QuizRunner } from "@/components/QuizRunner";

export const metadata = { title: "Викторина" };

export default async function Quiz({ params }: PageProps<"/oqushy/baige/[quiz]">) {
  const u = await requireRole("student");
  const { quiz } = await params;
  const [works, seed] = await Promise.all([quizWorks(), today()]);
  const work = works.find((w) => w.slug === quiz);
  if (quiz !== DAILY && !work) notFound();
  const questions = buildQuiz(works, quiz, seed, u.grade).map(({ q, options }) => ({ q, options }));
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={work ? `Викторина: «${work.title}»` : "Бүгінгі викторина"}
        sub={work ? "Бес сұрақ: авторы, жанры, кейіпкерлері, оқиғалары. Сұрақтар күн сайын ауысады." : "Сыныбыңдағы бес шығарма бойынша бес сұрақ. Ертең жаңасы шығады."}
      />
      <QuizRunner quiz={quiz} seed={seed} questions={questions} />
    </div>
  );
}
