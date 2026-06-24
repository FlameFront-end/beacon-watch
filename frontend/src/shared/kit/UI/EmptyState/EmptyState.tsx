import type { JSX, ReactNode } from "react";

import clsx from "clsx";

import styles from "./EmptyState.module.scss";

type EmptyStateProps = {
  title: string;
  description?: string;
  loading?: boolean;
  children?: ReactNode;
  className?: string | undefined;
};

export function EmptyState({
  title,
  description,
  loading = false,
  children,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div className={clsx(styles.emptyState, className)}>
      {loading ? <span className={styles.spinner} /> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  );
}
