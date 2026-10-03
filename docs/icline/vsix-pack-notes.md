# วิธีแพ็ก VSIX ที่ถูกต้อง (บันทึกจาก dev.4-fix.4, 2026-10-03)

## คำสั่งทางการ (ทางเดียวที่ควรใช้)

```bash
export PATH="/c/Users/dedch/.bun/bin:$PATH"
cd apps/vscode
npm run package:vsix   # = sync-icline-docs + npm run package + node scripts/package-vsix.mjs
```

`scripts/package-vsix.mjs` ทำ 3 อย่างที่การเรียก vsce ตรง ๆ ไม่มี:

1. `swapIn/restore` — สลับ `README.marketplace.md` มาเป็น `README.md` ตอนแพ็ก แล้วคืนหลังเสร็จ
   (vsce ไม่มี flag เลือก README — ไม่ swap = marketplace ได้เนื้อความผิด)
2. `--baseImagesUrl ... --githubBranch main` — rewrite รูประบุ `assets/` เป็น GitHub
   absolute URL (ของที่ผ่าน pipeline นี้: relative 0 / absolute 17)
3. `--no-dependencies --out dist/<extensionId>-<version>.vsix` — ดูข้อ 2

## ห้ามเรียก `vsce package` เปล่า ๆ

vsce จะรัน `npm list --production` เองแล้วล้มด้วย `ELSPROBLEMS` เสมอ เพราะ
`node_modules` ติดตั้งด้วย **bun** (layout `.bun` store, `js-yaml` extraneous ฯลฯ)
ซึ่ง npm อ่านไม่รู้เรื่อง — prepublish ผ่านหมดแต่มาตายขั้นนี้ ไม่เกี่ยวกับโค้ด
`--no-dependencies` คือมาตรฐานของ repo อยู่แล้ว (ใช้ใน `package-vsix.mjs`,
`publish-marketplace.mjs`, `publish-nightly.mjs`, `test:e2e:build`)

ผลข้างเคียงถ้าฝืนเรียกเปล่า ๆ: ได้ vsix ชื่อ default (`iCline-…` จาก `name`) ตกที่
root แถม README ไม่ถูก swap — เหตุของไฟล์ค้าง `iCline-0.1.18-dev.5.vsix` /
`iCline-0.1.9.vsix` ที่ root (ignored, ลบทิ้งได้)

## กับดัก `npx vsce` (เจอ 2026-10-03)

`package-vsix.mjs` เรียกผ่าน `npx` — ถ้า npx ไปโหลด vsce ใส่ cache เองแล้วได้ของเสีย
(`Cannot find module 'leven'`) ให้เลี่ยงโดยเรียก local binary ตรง ๆ:

```bash
node -e "import('node:child_process').then(async ({spawnSync}) => {
  const {swapIn, restore} = await import('./scripts/marketplace-readme.mjs');
  const {getVsceImageRewriteArgs} = await import('./scripts/marketplace-images.mjs');
  const fs = await import('node:fs'); const path = await import('node:path');
  const manifest = JSON.parse(fs.readFileSync('./scripts/icline-docs.manifest.json','utf-8'));
  const pkg = JSON.parse(fs.readFileSync('./package.json','utf-8'));
  const base = manifest.vsixFileName || manifest.extensionId || 'i-mrdedchai.iCline';
  const out = path.resolve('dist', base + '-' + pkg.version + '.vsix');
  const vsce = path.resolve('node_modules/.bin/vsce.exe');
  const swap = swapIn();
  let code = 1;
  try {
    const r = spawnSync(vsce, ['package','--no-dependencies',...getVsceImageRewriteArgs(manifest),'--out',out], {stdio:'inherit', shell:false});
    code = r.status ?? 1;
  } finally { if (!swap.skipped) restore(); }
  process.exit(code);
});"
```

(ต้อง path absolute + `shell:false` — relative path กับ `shell:true` บน Windows
ได้ `'.' is not recognized`.) local `vsce.exe` คือ 3.9.2 ใช้งานได้ปกติ

## เช็กลิสต์ตรวจ VSIX ทุกครั้ง (ตัวอย่าง fix.4)

แตกซิปแล้วตรวจ: `package.json → version` ตรง, `readme.md` + `README.th.md` อยู่ครบ,
markers (`reasoning-effort-trigger` ×1, `modelAvailableCount` ×5),
รูปใน README เป็น absolute ทั้งหมด — ดูคำสั่งในประวัติ commit นี้

## ข้อห้ามอื่นที่ยังใช้อยู่

- ห้าม `+` ในชื่อไฟล์รูป (`vsce` ตายด้วย \"Invalid image source in README.md\")
- แพ็กด้วย path มาตรฐานเท่านั้น — README-dodge เคยทำ README ภาษาอังกฤษหลุด
- `proto-lint` เตือน `team.proto` unused import = noise เดิม ไม่ต้องแก้
