import type { JSX, ReactNode } from "react";

import clsx from "clsx";

import styles from "./Panel.module.scss";

type PanelProps = {
  children: ReactNode;
  className?: string | undefined;
};

export function Panel({ children, className }: PanelProps): JSX.Element {
  return <section className={clsx(styles.panel, className)}>{children}</section>;
}
