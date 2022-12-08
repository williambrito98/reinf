import { readdirSync } from 'fs'
import { setTimeout } from 'timers/promises'

export async function waitForDownload(pathDownload) {
  let wasDownload = false
  let string = ''
  while (wasDownload === false) {
    string = readdirSync(pathDownload).join('')
    if (!string.includes('crdownload')) {
      if (!string.includes('.jnlp')) {
        await setTimeout(1500)
        continue
      }
      wasDownload = true
      continue
    }
  }
}

