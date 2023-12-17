const mammoth = require("mammoth");
const fs = require('fs');
const DOMParser = require('universal-dom-parser');
const express = require('express');
const cors = require("cors");
const app = express();
const jsdom = require("jsdom");

app.use(cors());
function parse(htmlString){
  const parser = new jsdom.JSDOM(htmlString);
  console.log(parser.window.document.querySelectorAll('p')[0]);
}
app.get('/', async function(req, res) {
  const result = await mammoth.convertToHtml({ path: 'ri.docx' });
  parse(result.value);
  res.send(result.value);
});
console.log('listening on port 3000');
app.listen(3000);

