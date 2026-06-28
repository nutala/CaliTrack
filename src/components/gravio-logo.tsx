"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface GravioLogoProps {
  className?: string;
}

export function GravioLogo({ className }: GravioLogoProps) {
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
    <img
      src={src}
      alt="Gravio"
      className={className}
    />
  );
}
