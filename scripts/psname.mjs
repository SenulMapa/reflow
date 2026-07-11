import fs from "fs";
function names(p) {
  const b = fs.readFileSync(p);
  const numTables = b.readUInt16BE(4);
  let off = 12, nameOff = -1;
  for (let i = 0; i < numTables; i++) {
    if (b.toString("ascii", off, off + 4) === "name") nameOff = b.readUInt32BE(off + 8);
    off += 16;
  }
  const count = b.readUInt16BE(nameOff + 2);
  const strOff = nameOff + b.readUInt16BE(nameOff + 4);
  let ps = "?", fam = "?";
  for (let i = 0; i < count; i++) {
    const r = nameOff + 6 + i * 12;
    const platform = b.readUInt16BE(r), nameID = b.readUInt16BE(r + 6);
    const len = b.readUInt16BE(r + 8), o = b.readUInt16BE(r + 10);
    let s = platform === 3
      ? b.slice(strOff + o, strOff + o + len).swap16().toString("utf16le")
      : b.toString("ascii", strOff + o, strOff + o + len);
    if (nameID === 6 && ps === "?") ps = s;
    if (nameID === 1 && fam === "?") fam = s;
  }
  return { ps, fam };
}
for (const f of process.argv.slice(2)) console.log(f, JSON.stringify(names(f)));
