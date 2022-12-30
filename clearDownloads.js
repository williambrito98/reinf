import { readdirSync, unlinkSync } from "fs";
import { join } from "path";

export function clearDownload(pathDownload) {
  readdirSync(pathDownload).forEach((item) => {
    if (item.includes("crdownload")) {
      unlinkSync(join(pathDownload, item));
    }
  });
}
