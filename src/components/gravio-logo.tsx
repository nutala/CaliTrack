"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface GravioLogoProps {
  className?: string;
  showTagline?: boolean;
  taglineClassName?: string;
}

export function GravioLogo({
  className,
  showTagline = false,
  taglineClassName,
}: GravioLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src =
    mounted && resolvedTheme === "light"
      ? "/logo-light.png"
      : "/logo.png";

  return (
    <div className="flex flex-col items-center">
      <img
        src={src}
        alt="Gravio"
        className={className}
      />
      {showTagline && (
        <p
          className={`mt-1 text-[10px] font-bold tracking-[0.25em] text-muted-foreground ${taglineClassName ?? ""}`}
        >
          TRACK. <span style={{ color: "#C5DD48" }}>PROGRESS</span>. EVOLVE.
        </p>
      )}
    </div>
  );
}
