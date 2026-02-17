# 🚀 SECURICLAW - QUICK START GUIDE

**Get up and running in 5 minutes!**

---

## 📋 PREREQUISITES

- **Node.js** v18 or higher
- **npm** or **yarn**
- **OpenCLAW API access** (for AI features)

---

## ⚡ QUICK START (Development)

### 1. Install Dependencies

```bash
npm install
```

**Windows Note:** If you get Visual Studio errors with `better-sqlite3`:
```bash
# Try ignoring build scripts (uses prebuilt binaries)
npm install --ignore-scripts

# OR install build tools (one-time setup)
npm install --global windows-build-tools
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

**Minimum Configuration (AI Disabled):**
```env
PORT=3001
NODE_ENV=development
```

**With AI (OpenCLAW):**
```env
PORT=3001
NODE_ENV=development
OPENCLAW_API_URL=http://localhost:3000/api
OPENCLAW_API_KEY=your_api_key_here
```

**With AI (Direct Anthropic - Fallback):**
```env
PORT=3001
NODE_ENV=development
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 3. Start Dev Servers

```bash
# Run both frontend and backend
npm run dev:all
```

**Or run separately:**

```bash
# Terminal 1: Frontend (Vite)
npm run dev

# Terminal 2: Backend (Express + AI)
npm run dev:server
```

### 4. Open Browser

Frontend: **http://localhost:8080**  
Backend: **http://localhost:3001**

---

## 🎮 TESTING THE APP

### Test Deterministic Scan (No AI)

1. Open http://localhost:8080
2. **Leave AI toggle OFF**
3. Paste malicious code:
   ```javascript
   function bad() {
     eval(userInput);
     document.innerHTML = userInput;
   }
   ```
4. Click **"RUN AUDIT"**
5. Should detect 2+ CRITICAL issues instantly

### Test AI-Enhanced Scan

1. **Enable AI toggle** (Brain icon 🧠)
2. Button changes to **"AI-ENHANCED SCAN"**
3. Paste code with DOMPurify:
   ```javascript
   function safe() {
     element.innerHTML = DOMPurify.sanitize(userInput);
   }
   ```
4. Click **"AI-ENHANCED SCAN"**
5. Should show:
   - Lower confidence score
   - "LIKELY FALSE POSITIVE" badge
   - AI explanation why it's safe

---

## 🔧 CONFIGURATION OPTIONS

### AI Service Priority

The backend tries AI services in this order:

1. **OpenCLAW API** (if `OPENCLAW_API_URL` + `OPENCLAW_API_KEY` set)
2. **Anthropic Direct** (if `ANTHROPIC_API_KEY` set)
3. **Fallback** (Deterministic only, no AI enhancement)

### Performance Tuning

**Backend (`server/index.js`):**
```javascript
// Adjust rate limiting
const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                  // 10 scans per IP
});
```

**AI Timeout (`server/ai-service.js`):**
```javascript
// Add timeout to fetch calls
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

fetch(url, { signal: controller.signal });
```

---

## 🧪 RUNNING TESTS

### Stress Tests (Verify 100% Detection)

```bash
# Run full stress test suite
npx tsx tests/stress/automated-stress-test.mjs

# Test individual exploits
npx tsx tests/stress/scan-each-exploit.mjs

# Test exploits collection
npx tsx tests/stress/identify-missing.mjs
```

**Expected Output:**
```
✅ Pass Rate: 100.0%
✅ Exploits Detection: 30/30
✅ Malicious Samples: 5/5
✅ Safe Code: 3/3
🟢 GREEN LIGHT — READY FOR PRODUCTION!
```

### Unit Tests

```bash
npm test
```

---

## 📊 VERIFYING AI INTEGRATION

### Test AI Endpoint Directly

```bash
curl -X POST http://localhost:3001/api/ai/analyze-issue \
  -H "Content-Type: application/json" \
  -d '{
    "code": "element.innerHTML = DOMPurify.sanitize(input);",
    "issue": {
      "type": "xss-innerhtml",
      "severity": "critical",
      "description": "innerHTML assignment detected"
    }
  }'
```

**Expected Response (with AI working):**
```json
{
  "confidence": 30,
  "falsePositive": true,
  "severity": "low",
  "explanation": "DOMPurify.sanitize() is being used...",
  "contextNotes": "Best practice: prefer textContent"
}
```

**Expected Response (AI unavailable):**
```json
{
  "confidence": 50,
  "falsePositive": false,
  "severity": "critical",
  "explanation": "AI service unavailable - using deterministic results"
}
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Cannot find module 'better-sqlite3'"

**Solution 1:** Install with prebuilt binaries
```bash
npm install --ignore-scripts
```

**Solution 2:** Install build tools (Windows)
```bash
npm install --global windows-build-tools
npm install
```

**Solution 3:** Use alternative database
```bash
# Replace better-sqlite3 with sql.js (pure JS)
npm uninstall better-sqlite3
npm install sql.js
# Then update server/index.js to use sql.js
```

### Issue: "AI service unavailable"

**Check:**
1. Is `.env` file present?
2. Are API keys correct?
3. Is OpenCLAW running (if using OpenCLAW API)?
4. Check backend logs for errors

**Test API Connection:**
```bash
# Test OpenCLAW
curl http://localhost:3000/api/health

# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
```

### Issue: Frontend won't load

**Check:**
1. Is Vite running on port 8080?
2. Is backend running on port 3001?
3. Check browser console for errors
4. Verify proxy config in `vite.config.ts`

### Issue: CORS errors

**Solution:** Backend CORS is enabled by default. If issues persist:

```javascript
// server/index.js
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
NODE_ENV=production npm start
```

Serves both frontend (static) and backend API on port 3001.

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3001
OPENCLAW_API_URL=https://your-openclaw-instance.com/api
OPENCLAW_API_KEY=prod_key_here
```

### Deployment Platforms

**Backend + Frontend (Single Server):**
- Heroku
- Railway
- Render
- Fly.io
- DigitalOcean App Platform

**Separate Deployment:**
- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Backend:** Railway, Render, Heroku

---

## 📈 MONITORING

### Health Check

```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1737433920000,
  "scans": 42
}
```

### Stats

```bash
curl http://localhost:3001/api/stats
```

Response:
```json
{
  "total_scans": 1234,
  "days_active": 15
}
```

---

## 🎯 NEXT STEPS

**With AI Enabled:**
- ✅ Test false positive reduction
- ✅ Monitor confidence scores
- ✅ Review AI explanations
- ✅ Tune AI prompts if needed

**Without AI (Deterministic Only):**
- ✅ Already 100% detection on known patterns
- ✅ Lightning fast (<2ms)
- ✅ Production ready
- ⏳ Add AI later when ready

**Deployment:**
1. Run tests: `npx tsx tests/stress/automated-stress-test.mjs`
2. Verify 100% pass rate
3. Build: `npm run build`
4. Deploy to platform of choice
5. Set environment variables
6. Test live deployment

---

## 📚 ADDITIONAL RESOURCES

- **Full Documentation:** `AI_INTEGRATION_STATUS.md`
- **Test Results:** `FINAL_TEST_RESULTS.md`
- **Backend Guide:** `BACKEND_READY.md`
- **Stress Tests:** `tests/stress/`

---

**Built with 🦞 by Securiclaw**

**Status:** 🟢 Ready for Development & Testing
