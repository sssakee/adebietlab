"use client";
import { useActionState, useState } from "react";
import { studentJoin, teacherLogin, teacherRegister, type FormState } from "./actions";

function FormError({ state }: { state: FormState }) {
  return (
    <p role="alert" aria-live="polite" className="min-h-6 text-sm font-bold text-red-ink">
      {state?.error}
    </p>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; state?: FormState }) {
  const { label, state, ...rest } = props;
  return (
    <div>
      <label htmlFor={props.name} className="label">
        {label}
      </label>
      <input id={props.name} className="field" required defaultValue={state?.values?.[props.name]} {...rest} />
    </div>
  );
}

export function StudentForm() {
  const [state, action, pending] = useActionState(studentJoin, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" key={JSON.stringify(state?.values)}>
      <Field state={state} label="Сынып коды" name="code" placeholder="LAB7QA" autoComplete="off" maxLength={6} className="field uppercase tracking-[0.3em]" />
      <Field state={state} label="Атың" name="name" placeholder="Айару" autoComplete="given-name" />
      <Field label="PIN (4 цифр)" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} type="password" autoComplete="off" />
      <p className="text-sm text-muted">Бірінші рет кірсең, PIN-ді өзің ойлап тап және есте сақта. Телефон, мекенжай сұралмайды.</p>
      <FormError state={state} />
      <button className="btn-gold h-14" disabled={pending}>
        {pending ? "Күте тұр…" : "Зертханаға кіру"}
      </button>
    </form>
  );
}

export function TeacherForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, login, p1] = useActionState(teacherLogin, undefined);
  const [regState, register, p2] = useActionState(teacherRegister, undefined);
  const isLogin = mode === "login";
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Әрекет" className="flex gap-2">
        <button type="button" className="chip flex-1 justify-center" aria-pressed={isLogin} onClick={() => setMode("login")}>
          Кіру
        </button>
        <button type="button" className="chip flex-1 justify-center" aria-pressed={!isLogin} onClick={() => setMode("register")}>
          Тіркелу
        </button>
      </div>
      <form action={isLogin ? login : register} className="flex flex-col gap-4" key={mode + JSON.stringify((isLogin ? loginState : regState)?.values)}>
        {!isLogin && <Field state={regState} label="Аты-жөніңіз" name="name" autoComplete="name" />}
        <Field state={isLogin ? loginState : regState} label="Электрондық пошта" name="email" type="email" autoComplete="email" />
        <Field label="Құпиясөз" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={isLogin ? undefined : 8} />
        <FormError state={isLogin ? loginState : regState} />
        <button className="btn-primary h-14" disabled={p1 || p2}>
          {isLogin ? "Кіру" : "Тіркелу"}
        </button>
      </form>
    </div>
  );
}
