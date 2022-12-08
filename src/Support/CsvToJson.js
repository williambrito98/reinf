import csv from 'csvtojson';
import fs from 'fs';
export default async function (inputFile = '', header = [], delimiter = ';', outPutFile = '', valuesToInput = {}) {
    const jsonArray = await csv({ delimiter: delimiter, headers: header }).fromFile(inputFile, { encoding: 'UTF-8' });
    if (valuesToInput) {
        valuesToInput = Object.entries(valuesToInput);
        for (let i = 0; i < jsonArray.length; i++) {
            for (let y = 0; y < valuesToInput.length; y++) {
                jsonArray[i][valuesToInput[y][0]] = valuesToInput[y][1];
            }
        }
    }
    fs.writeFileSync(outPutFile, JSON.stringify(jsonArray));
}
