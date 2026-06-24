import type { JSX } from "react";

import type { BeaconFilter } from "@/shared/model/beacon";
import { Tabs } from "@/shared/kit";

type FilterBarProps = {
  value: BeaconFilter;
  onChange: (filter: BeaconFilter) => void;
};

const ITEMS = [
  { id: "all", label: "All" },
  { id: "loot", label: "Loot" },
  { id: "heartbeat", label: "Heartbeat" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
] as const;

export function FilterBar({ value, onChange }: FilterBarProps): JSX.Element {
  return <Tabs items={ITEMS} value={value} onChange={onChange} ariaLabel="Beacon filters" />;
}
