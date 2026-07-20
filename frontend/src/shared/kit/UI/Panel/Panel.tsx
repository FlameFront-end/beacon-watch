import type { ComponentPropsWithoutRef, JSX } from "react";

import clsx from "clsx";

import styles from "./Panel.module.scss";

type PanelProps = ComponentPropsWithoutRef<"section">;

export function Panel({ children, className, ...sectionProps }: PanelProps): JSX.Element {
  return (
    <section {...sectionProps} className={clsx(styles.panel, className)}>
      {children}
    </section>
  );
}
