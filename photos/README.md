# Survey photos

One JPEG per item, named `<itemId>.jpg` — e.g. `elec-3ftm.jpg` is the 3F men's
toilet in 電學大樓. `src/data.js` references them by that name.

Named by id rather than by the Chinese survey filename so URLs need no
encoding and the shell does not mangle them on Windows.

## Adding more

1. Take the photo, name it by the survey convention (`電學三樓（男）.jpg`)
2. `node tools/import-photos.js` gives you the itemId
3. Save the photo here as `<itemId>.jpg`

Some phone photos are HEIF even when named `.jpg`. Exporting through Google
Drive's image endpoint transcodes them to real JPEG, which is how these were
produced. Check with: `node -e "const b=require('fs').readFileSync('photos/x.jpg');console.log(b[0]===0xFF&&b[1]===0xD8)"`

## Later

These move to S3 and `photo` becomes a URL. Nothing else changes.
