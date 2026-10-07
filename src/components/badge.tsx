import { BADGE_CLASS, statusLabel, type LicenseItem } from "@/domain/license";

export function Badge({ item }: { item: LicenseItem }) {
  return <span className={`badge ${BADGE_CLASS[item.status]}`}>{statusLabel(item)}</span>;
}
