import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  size?: number;
  weight?: 300 | 400 | 500;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, weight = 300, className, style }: IconProps) {
  return (
    <span
      className={cn("select-none leading-none", className)}
      style={{
        fontFamily: "'Material Symbols Rounded'",
        fontSize: size,
        fontVariationSettings: `'wght' ${weight}`,
        fontStyle: "normal",
        lineHeight: 1,
        display: "inline-block",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {name}
    </span>
  );
}
