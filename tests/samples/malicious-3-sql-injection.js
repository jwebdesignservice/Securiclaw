// Malicious Sample #3: SQL Injection Vulnerable Code
const express = require('express');
const mysql = require('mysql');

const app = express();
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'users'
});

// VULNERABLE: No input validation, string concatenation
app.get('/user', (req, res) => {
  const userId = req.query.id;
  const query = "SELECT * FROM users WHERE id = " + userId;
  
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// VULNERABLE: No authentication
app.post('/admin/delete', (req, res) => {
  const table = req.body.table;
  db.query("DROP TABLE " + table, (err) => {
    res.send("Deleted");
  });
});

app.listen(3000);
