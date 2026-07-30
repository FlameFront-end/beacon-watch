import type { JSX } from "react";

import { Link, useParams } from "wouter";

import { Button, EmptyState, Panel } from "@/shared/kit";

import { CallbackDetail } from "../components/CallbackDetail";
import { useCallbackDetail } from "../hooks/use-callbacks";
import styles from "../components/Callbacks.module.scss";

export function CallbackDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { event, isLoading, error } = useCallbackDetail(params.id ?? "");

  if (isLoading) {
    return <EmptyState title="Loading callback event" loading />;
  }

  if (error || !event) {
    return (
      <Panel className={styles.errorPanel}>
        <strong>Failed to load callback</strong>
        <p>{error ?? "Not found"}</p>
        <Link href="/callbacks"><Button variant="secondary">Back to callbacks</Button></Link>
      </Panel>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/callbacks" className={styles.backLink}>← Back to callbacks</Link>
      <CallbackDetail event={event} />
    </div>
  );
}
