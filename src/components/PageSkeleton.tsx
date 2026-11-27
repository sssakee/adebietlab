import Image from "next/image";

/** Shown at once when a link is clicked, while the server prepares the page. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="skeleton relative h-40 rounded-[32px] sm:h-44">
        <Image src="/mascot/kyrantay.png" alt="" width={70} height={90} className="float absolute bottom-3 right-6" />
      </div>
      <p role="status" className="sr-only">
        Бет ашылып жатыр…
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton h-28 rounded-[var(--radius-card)]" />
        <div className="skeleton h-28 rounded-[var(--radius-card)]" />
        <div className="skeleton h-28 rounded-[var(--radius-card)]" />
        <div className="skeleton h-28 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
