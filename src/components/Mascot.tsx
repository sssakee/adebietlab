import Image from "next/image";

export function Mascot({ size = 120, className = "", priority = false, alt = "Қырантай — оюлы тақия киген бүркіт балапаны" }: { size?: number; className?: string; priority?: boolean; alt?: string }) {
  return (
    <Image
      src="/mascot/kyrantay.png"
      alt={alt}
      width={size}
      height={Math.round((size * 490) / 382)}
      className={className}
      priority={priority}
    />
  );
}
