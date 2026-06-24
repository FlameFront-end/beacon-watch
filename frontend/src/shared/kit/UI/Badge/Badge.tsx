import type { JSX, ReactNode } from "react";

import clsx from "clsx";

import styles from "./Badge.module.scss";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string | undefined;
};

export function Badge({ children, tone = "neutral", className }: BadgeProps): JSX.Element {
  return <span className={clsx(styles.badge, styles[tone], className)}>{children}</span>;
}
