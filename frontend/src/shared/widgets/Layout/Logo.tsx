import type { JSX } from "react";

type LogoProps = {
  size?: number;
};

export function Logo({ size = 24 }: LogoProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="6" fill="currentColor" fillOpacity="0.04" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="6" stroke="currentColor" strokeOpacity="0.18" />
      <path d="M16 6.5L25 22H7L16 6.5Z" fill="currentColor" />
      <path d="M16 11.1L20.7 19.3H11.3L16 11.1Z" fill="var(--bg-page)" />
    </svg>
  );
}
