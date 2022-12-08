import * as XLSX from 'xlsx/xlsx.mjs'
import * as fs from "fs";
import { extname, join } from 'path'
XLSX.set_fs(fs);

export function parseXLSXToJson(pathfile) {
    const fileName = fs.readdirSync(pathfile).find(filename => extname(filename) === '.xlsx' || extname(filename) === '.xls')
    const workbook = XLSX.readFileSync(join(pathfile, fileName))
    const clientes = XLSX.utils.sheet_to_json(workbook.Sheets['Planilha1'])
    return clientes.map(item => {
        item.CNPJ = item.CNPJ.toString().padStart(14, '0')
        item.RAZAO = item.RAZAO.replace(/\/|\.|\\/gmi, '')
        return item
    })

}