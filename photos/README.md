# Survey photos

Drop the survey photos here using the exact names from the Drive folder:

    電學三樓（男）.jpg
    篤信一樓飲水機.jpg
    電學地下一樓（女）.jpg

`src/data.js` references them by filename, so the name must match exactly.

## Convert HEIC first

Browsers cannot display HEIC. These eight need converting to .jpg, and the
filename in `src/data.js` updated to match:

    電學七樓（女）.HEIC      電學七樓飲水機.HEIC
    電學五樓（男）.HEIC      電學五樓飲水機.HEIC
    電學八樓（男）.HEIC      電學八樓飲水機.HEIC
    電學六樓飲水機.HEIC      電學四樓飲水機.HEIC

Until then those items show the placeholder instead of a broken image.

## Later

These move to S3 and `photo` becomes a URL. Nothing else changes.
