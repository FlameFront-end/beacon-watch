import type { JSX } from "react";
import { useState } from "react";

import { RefreshCw, Trash2, Webhook } from "lucide-react";

import { Badge, Button, Modal, Panel } from "@/shared/kit";
import type { CallbackListFilters, CallbackSortField } from "@/shared/model/callback";

import { CallbackFilter } from "../components/CallbackFilter";
import { CallbackList } from "../components/CallbackList";
import { CallbackStats } from "../components/CallbackStats";
import { useCallbackList, useCallbackStats } from "../hooks/use-callbacks";
import styles from "../components/Callbacks.module.scss";

const PAGE_SIZE = 50;

export function CallbackPage(): JSX.Element {
  const [filters, setFilters] = useState<CallbackListFilters>({
    limit: PAGE_SIZE,
    offset: 0,
    sortBy: "timestamp",
    sortDirection: "DESC",
  });
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const { result, isLoading, error, reload, remove, clear } = useCallbackList(filters);
  const { stats } = useCallbackStats();
  const offset = result?.offset ?? filters.offset ?? 0;
  const total = result?.total ?? 0;

  const updatePage = (nextOffset: number): void => {
    setFilters((current) => ({ ...current, offset: Math.max(0, nextOffset) }));
  };

  const updateSort = (field: CallbackSortField): void => {
    setFilters((current) => ({
      ...current,
      sortBy: field,
      sortDirection: current.sortBy === field && current.sortDirection === "DESC" ? "ASC" : "DESC",
      offset: 0,
    }));
  };

  const clearAll = async (): Promise<void> => {
    await clear();
    setIsClearModalOpen(false);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroIcon} aria-hidden="true">
            <Webhook size={18} />
          </div>
          <div>
            <h1>Callback Events</h1>
            <p>Public callback receiver for exploit verification, request evidence, and payload inspection.</p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Badge tone="neutral">POST /api/callback</Badge>
          <Button variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void reload()}>
            Refresh
          </Button>
          <Button variant="danger" leftIcon={<Trash2 size={13} />} onClick={() => setIsClearModalOpen(true)}>
            Clear all
          </Button>
        </div>
      </section>

      <CallbackStats stats={stats} />
      <CallbackFilter filters={filters} onChange={setFilters} />

      {error ? (
        <Panel className={styles.errorPanel}>
          <strong>Failed to load callbacks</strong>
          <p>{error}</p>
        </Panel>
      ) : null}

      <CallbackList
        events={result?.items ?? []}
        isLoading={isLoading}
        sortBy={filters.sortBy ?? "timestamp"}
        sortDirection={filters.sortDirection ?? "DESC"}
        onSort={updateSort}
        onDelete={(id) => void remove(id)}
      />

      <div className={styles.pagination}>
        <span>{total === 0 ? "0 events" : `${offset + 1}-${Math.min(offset + PAGE_SIZE, total)} of ${total}`}</span>
        <div>
          <Button variant="secondary" disabled={offset === 0} onClick={() => updatePage(offset - PAGE_SIZE)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => updatePage(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isClearModalOpen}
        title="Clear callback events?"
        confirmText="Clear all"
        variant="danger"
        onConfirm={() => void clearAll()}
        onCancel={() => setIsClearModalOpen(false)}
      >
        This permanently removes all stored callback events.
      </Modal>
    </div>
  );
}
