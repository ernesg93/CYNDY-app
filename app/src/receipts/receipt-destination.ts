import type { CountRecord } from "../storage/indexed-db-repository";

export interface ReceiptDestination {
  deliver(receipt: CountRecord): void;
}

export class BrowserPrintDestination implements ReceiptDestination {
  constructor(private readonly print: () => void = () => window.print()) {}

  deliver(_receipt: CountRecord): void {
    this.print();
  }
}
