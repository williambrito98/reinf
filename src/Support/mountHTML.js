import fs from 'fs';
import path from 'path';

export default async function (nameHtml = '', values = []) {
    let html = fs.readFileSync(path.join(path.resolve(), 'src', 'Support', 'html', nameHtml), { encoding: 'UTF-8' })
    values.map(item => {
        html = html.replace('{}', item)
    })
    return html;

}