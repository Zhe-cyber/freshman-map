# Survey photos

One JPEG per item, named `<itemId>.jpg` — e.g. `elec-3ftm.jpg` is the 3F men's
toilet in 電學大樓. `src/data.js` references them by that name. The current
84-photo survey covers 電學大樓, 篤信大樓, 真知教學大樓, 懷恩樓, and the
學生活動中心 vending machines.

Named by id rather than by the Chinese survey filename so URLs need no
encoding and the shell does not mangle them on Windows.

## Adding more

1. Take the photo, name it by the survey convention (`電學三樓（男）.jpg`)
2. `node tools/import-photos.js` gives you the itemId
3. Save the photo here as `<itemId>.jpg`

Supported prefixes are 電學, 篤信, 教學, 懷恩, 活中, 工學, and 圖書. Toilets,
water dispensers, and vending machines are recognised. Add `1`, `2`, and so on
after 飲水機 or 販賣機 when a floor has more than one distinct machine.

Some phone photos are HEIF even when named `.jpg`. Exporting through Google
Drive's image endpoint transcodes them to real JPEG, which is how these were
produced. Check with: `node -e "const b=require('fs').readFileSync('photos/x.jpg');console.log(b[0]===0xFF&&b[1]===0xD8)"`

## Later

These move to S3 and `photo` becomes a URL. Nothing else changes.
