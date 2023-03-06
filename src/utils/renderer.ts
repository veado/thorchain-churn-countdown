import type { WS_STATUS } from "src/stores/types";

export const bgColorByWSStatus = (status: WS_STATUS) => {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "closed":
      return "bg-red-500";
    case "connecting":
      return "bg-yellow-500";
  }
};
