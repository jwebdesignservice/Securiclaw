# 🧪 Securiclaw Test Suite

## Test Samples

### Malicious Code Samples

**Purpose:** Verify detection accuracy - all should trigger HIGH or CRITICAL findings

1. **malicious-1-backdoor.js** — Reverse shell using `net` + `child_process`
2. **malicious-2-data-theft.js** — Environment variable exfiltration
3. **malicious-3-sql-injection.js** — SQL injection via string concatenation
4. **malicious-4-prototype-pollution.js** — Prototype pollution attack
5. **malicious-5-xss-rce.js** — XSS, eval(), new Function(), command injection

### Safe Code Samples

**Purpose:** Verify NO false positives - should score HIGH (80+)

1. **safe-1-basic.js** — Simple utilities (calculation, validation)
2. **safe-2-secure-api.js** — Properly secured Express API
3. **safe-3-react-component.tsx** — TypeScript React component

## Running Tests

### Automated Tests
```bash
npm test
```

### Manual Testing (in UI)
1. Run `npm run dev`
2. Copy contents of sample files into the editor
3. Click "RUN AUDIT"
4. Verify expected results

## Expected Results

### Malicious Samples
- **Score:** < 50 (Critical/High risk)
- **Findings:** 5-15 issues detected
- **Severity:** Multiple CRITICAL/HIGH

### Safe Samples
- **Score:** > 80 (Low risk)
- **Findings:** 0-2 issues (if any, should be LOW)
- **Severity:** None or INFO/LOW only

## Test Coverage

Each module should detect:

- ✅ Execution risks (eval, dynamic functions)
- ✅ Permission issues (wildcards, elevated access)
- ✅ Endpoint vulnerabilities (no auth, CORS)
- ✅ Injection vectors (SQL, XSS, command)
- ✅ Dependency risks (dangerous modules, dynamic imports)

## Adding New Tests

1. Create file in `tests/samples/`
2. Name format: `{type}-{number}-{description}.js`
3. Add to this README
4. Test manually in UI
5. Consider adding to automated suite
