# Manfith vendor checkout

Clone the private Manfith project here (not committed to Git):

```bash
cd frontend
npm run setup:manfith
```

Default remote: `git@github.com:bbccbbcc2010-alt/manfith.git`

## If clone fails

```powershell
# SSH
ssh -T git@github.com
npm run setup:manfith

# Personal access token
$env:GITHUB_TOKEN="ghp_xxxx"
npm run setup:manfith

# HTTPS URL
$env:MANFITH_REPO_URL="https://github.com/bbccbbcc2010-alt/manfith.git"
npm run setup:manfith

# Already cloned elsewhere
$env:MANFITH_REPO_PATH="C:\path\to\manfith"
npm run setup:manfith
```

After success: see `docs/MANFITH_REPO_AUDIT.md` and `docs/MANFITH_ENV_MAPPING.md`.
