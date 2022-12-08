import { execSync } from 'child_process'
import { readFileSync, unlinkSync } from 'fs'
import { setTimeout } from 'timers/promises'
export async function waitForAuthenticatorExists(config) {
    try { unlinkSync(config.pathTitle) } catch (error) { }
    execSync(`"C:\\Program Files\\AutoHotkey\\AutoHotkey.exe" src\\Support\\getAllWindowsTitle.ahk`)
    const content = readFileSync(config.pathTitle).toString().split('\n')
    const exists = content.find(item => item.includes('Informações de Segurança') || item.includes('Assinadoc'))
    if (!exists) {
        await setTimeout(1500)
        return waitForAuthenticatorExists(config)
    }

    return true
}
