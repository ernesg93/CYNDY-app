import type { CountRecord } from "../storage/indexed-db-repository";
import type { ReceiptDestination } from "./receipt-destination";

export function ReceiptView({ record, destination }: {
  record: CountRecord;
  destination: ReceiptDestination;
}) {
  return <>
    <article className="receipt" aria-label="Saved count receipt">
      <p>Saved <time dateTime={record.createdAt}>{record.createdAt}</time></p>
      {record.snapshots.map((snapshot) => <section key={snapshot.currencyId}>
        <h2>{snapshot.name} ({snapshot.code})</h2>
        <ul>{snapshot.entries.map((entry) => <li key={entry.denomination}>
          {snapshot.symbol}{entry.denomination} × {entry.quantity} = {snapshot.symbol}{entry.total}
        </li>)}</ul>
        <p>Subtotal: {snapshot.symbol}{snapshot.subtotal} {snapshot.code}</p>
      </section>)}
      {record.note && <section><h2>Note</h2><p>{record.note}</p></section>}
    </article>
    <nav className="receipt-actions" aria-label="Receipt actions">
      <button type="button" onClick={() => destination.deliver(record)}>
        Print or save as PDF
      </button>
      <a className="button" href={`/history/${encodeURIComponent(record.id)}`}>
        Return to count details
      </a>
    </nav>
  </>;
}
