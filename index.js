const mammoth = require("mammoth");
const fs = require('fs');
var express = require('express');
var app = express();

app.get('/', async function(req, res) {
  const result = await mammoth.convertToHtml({ path: 'ri.docx' });
  res.send(result.value)
});
console.log('listening on port 3000');
app.listen(3000);