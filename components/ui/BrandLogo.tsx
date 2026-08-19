"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  href?: string;
  className?: string;
}

export default function BrandLogo({
  size = "md",
  showWordmark = true,
  href = "/home",
  className = "",
}: BrandLogoProps) {
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const updateMode = () => {
      if (typeof document !== "undefined") {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
      }
    };

    updateMode();

    if (typeof document !== "undefined") {
      const observer = new MutationObserver(updateMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  }, [theme]);

  const logoSrc = isDarkMode ? "/logos/Logo_White.png" : "/logos/Logo_Black.png";
  const wordmarkSrc = isDarkMode ? "/logos/Wordmark_White.png" : "/logos/Wordmark_Black.png";

  const dimensions = {
    sm: { logo: 22, wordmarkW: 64, wordmarkH: 18 },
    md: { logo: 26, wordmarkW: 76, wordmarkH: 20 },
    lg: { logo: 36, wordmarkW: 100, wordmarkH: 26 },
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity ${className}`}>
      <Image
        src={logoSrc}
        alt="Nexus Logo"
        width={dimensions.logo}
        height={dimensions.logo}
        className="object-contain shrink-0"
        priority
      />
      {showWordmark && (
        <Image
          src={wordmarkSrc}
          alt="Nexus"
          width={dimensions.wordmarkW}
          height={dimensions.wordmarkH}
          className="object-contain shrink-0"
          priority
        />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

