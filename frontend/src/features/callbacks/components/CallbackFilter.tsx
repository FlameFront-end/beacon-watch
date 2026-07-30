import type { FormEvent, JSX } from "react";
import { useEffect, useState } from "react";

import { Button, Panel } from "@/shared/kit";
import type { CallbackListFilters } from "@/shared/model/callback";

import styles from "./Callbacks.module.scss";

type CallbackFilterProps = {
  readonly filters: CallbackListFilters;
  readonly onChange: (filters: CallbackListFilters) => void;
};

export function CallbackFilter({ filters, onChange }: CallbackFilterProps): JSX.Element {
  const [sourceIp, setSourceIp] = useState(filters.sourceIp ?? "");
  const [from, setFrom] = useState(toDateInputValue(filters.from));
  const [to, setTo] = useState(toDateInputValue(filters.to));

  useEffect(() => {
    setSourceIp(filters.sourceIp ?? "");
    setFrom(toDateInputValue(filters.from));
    setTo(toDateInputValue(filters.to));
  }, [filters.sourceIp, filters.from, filters.to]);

  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onChange({
      ...filters,
      sourceIp: sourceIp.trim() || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      offset: 0,
    });
  };

  return (
    <Panel className={styles.filterPanel}>
      <form className={styles.filterForm} onSubmit={apply}>
        <label>
          <span>Source IP</span>
          <input value={sourceIp} placeholder="203.0.113.10" onChange={(event) => setSourceIp(event.target.value)} />
        </label>
        <label>
          <span>From</span>
          <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <div className={styles.filterActions}>
          <Button type="submit">Apply</Button>
          <Button
            variant="secondary"
            onClick={() => onChange({
              limit: filters.limit,
              offset: 0,
              sortBy: filters.sortBy,
              sortDirection: filters.sortDirection,
            })}
          >
            Reset
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function toDateInputValue(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 16);
}
