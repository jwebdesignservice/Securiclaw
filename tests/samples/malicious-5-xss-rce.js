// Malicious Sample #5: XSS and Remote Code Execution
const express = require('express');
const app = express();

// VULNERABLE: XSS via innerHTML
app.get('/search', (req, res) => {
  const query = req.query.q;
  const html = `
    <html>
      <body>
        <h1>Search Results</h1>
        <div id="results"></div>
        <script>
          document.getElementById('results').innerHTML = '${query}';
        </script>
      </body>
    </html>
  `;
  res.send(html);
});

// VULNERABLE: eval() with user input
app.post('/calculate', (req, res) => {
  const expression = req.body.expr;
  const result = eval(expression);
  res.json({ result });
});

// VULNERABLE: new Function() constructor
app.post('/transform', (req, res) => {
  const code = req.body.code;
  const fn = new Function('data', code);
  const transformed = fn(req.body.data);
  res.json(transformed);
});

// VULNERABLE: Command injection
const { exec } = require('child_process');
app.get('/ping', (req, res) => {
  const host = req.query.host;
  exec(`ping -c 1 ${host}`, (error, stdout) => {
    res.send(stdout);
  });
});

app.listen(3000);
