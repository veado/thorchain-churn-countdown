import { sequenceT } from "fp-ts/lib/Apply";
import * as RD from "@devexperts/remote-data-ts";

export const sequenceTRD = sequenceT(RD.remoteData);
