import type { TransferView } from "./model";
import type { TransferOptions } from "./lifecycle";
import { createOutgoingTransfer } from "./outgoing-transfer";
import { createIncomingTransfer } from "./incoming-transfer";

/** Select the role once; shared transports do not determine transfer responsibilities. */
export function createTransfer(item: TransferView, options: TransferOptions) {
  return item.direction === "outgoing"
    ? createOutgoingTransfer(item, options)
    : createIncomingTransfer(item, options);
}

export type Transfer = ReturnType<typeof createTransfer>;
