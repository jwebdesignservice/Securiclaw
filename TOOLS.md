# TOOLS.md - SecuriClaw Notes

## Deployment

- **Live URL:** https://securiclaw.vercel.app
- **GitHub:** https://github.com/jwebdesignservice/Securiclaw
- **Vercel Project:** securiclaw

## OpenClaw Skill

- **Skill URL:** https://securiclaw.vercel.app/securiclaw.skill
- **Skill Location:** `public/securiclaw.skill`
- **Source:** `public/skill/SKILL.md`

### Updating the Skill

1. Edit `public/skill/SKILL.md`
2. Re-package: 
   ```powershell
   Compress-Archive -Path "public/skill/*" -DestinationPath "public/securiclaw.zip" -Force
   Rename-Item "public/securiclaw.zip" "securiclaw.skill" -Force
   ```
3. Commit and push to GitHub
4. Vercel auto-deploys

### Install Command
```
openclaw skill install https://securiclaw.vercel.app/securiclaw.skill
```

## Development

### Run Locally
```bash
npm install
npm run dev:all    # Frontend + Backend
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001

### Production Build
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/scan` - Submit code for scanning
- `GET /api/scan/:id` - Get scan report
- `GET /api/health` - Health check
- `GET /api/stats` - Global stats

## Vulnerability Categories

| Severity | Examples |
|----------|----------|
| Critical | RCE, SQL injection, command injection |
| High | XSS, SSRF, path traversal |
| Medium | Open redirects, info disclosure |
| Low | Missing headers, deprecated functions |
