import type { JSX } from "react";

import styles from "./Skeleton.module.scss";

type SkeletonProps = {
  width?: string;
  height?: string;
};

export function Skeleton({ width = "100%", height = "14px" }: SkeletonProps): JSX.Element {
  return <div className={styles.skeleton} style={{ width, height }} aria-hidden="true" />;
}
