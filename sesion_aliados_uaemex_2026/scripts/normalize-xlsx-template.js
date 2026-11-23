'use strict';

// ExcelJS 4.x does not parse SpreadsheetML elements when they use the `x:`
// prefix. This keeps the workbook content intact while serializing its
// SpreadsheetML elements with the standard default namespace.
const fs = require('fs');
const JSZip = require('jszip');

const target = process.argv[2];
if (!target) throw new Error('Indica la ruta de la plantilla XLSX.');

(async () => {
  const zip = await JSZip.loadAsync(await fs.promises.readFile(target));
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !/^xl\/(?!theme\/).+\.xml$/i.test(entry.name)) continue;
    const xml = await entry.async('string');
    const normalized = xml
      .replace(/<x:/g, '<')
      .replace(/<\/x:/g, '</')
      .replace(/\sxmlns:x=/g, ' xmlns=');
    if (normalized !== xml) zip.file(entry.name, normalized);
  }
  await fs.promises.writeFile(target, await zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'}));
})();
