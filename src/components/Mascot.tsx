import Image from "next/image";

export function Mascot({ size = 120, className = "", priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/mascot/kyrantay.png"
      alt="Қырантай — оюлы тақия киген бүркіт балапаны"
      width={size}
      height={Math.round((size * 490) / 382)}
      className={className}
      priority={priority}
    />
  );
}
