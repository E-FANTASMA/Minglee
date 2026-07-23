## Storage Cleanup

`cleanupUnusedStorage.js` finds bucket files that are not referenced by `user_photos.image_url`.

Examples:

```bash
node scripts/cleanupUnusedStorage.js
node scripts/cleanupUnusedStorage.js --prefix=10382315-00f1-4cd9-9bde-7d97f058bcac/
node scripts/cleanupUnusedStorage.js --delete
node scripts/cleanupUnusedStorage.js --delete --batch-size=50
```

## WhatsApp Number Cleanup

`fixWhatsappNumbers.js` scans `users.whatsapp_number`, normalizes Nigerian numbers to `+234...`, and reports invalid or conflicting rows.

Examples:

```bash
node scripts/fixWhatsappNumbers.js
node scripts/fixWhatsappNumbers.js --apply
node scripts/fixWhatsappNumbers.js --apply --batch-size=200
```
