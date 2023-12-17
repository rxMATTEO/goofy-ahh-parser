const mammoth = require("mammoth");
const fs = require('fs');
const DOMParser = require('universal-dom-parser');
const express = require('express');
const cors = require("cors");
const app = express();
const jsdom = require("jsdom");

app.use(cors());
function parseInfo(htmlString){
  const parser = new jsdom.JSDOM(htmlString);
  const events = (parser.window.document.querySelectorAll('p')[0].textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
  const dates = (parser.window.document.querySelectorAll('p')[2].textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
  const time = (parser.window.document.querySelectorAll('p')[3].textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
  return {
    eventsType: events[0],
    creationDate: events.slice(1).join(': '),
    dates: dates.slice(1).join(''),
    time: time.slice(1).join('')
  }
  // return parser.window.document.querySelectorAll('p')[0].textContent;
  // return (parser.window.document.querySelectorAll('p')[0].textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
}
app.get('/info', async function(req, res) {
  const result = await mammoth.convertToHtml({ path: 'ri.docx' });
  res.send(parseInfo((result.value)));
});
app.get('/', async function(req, res) {
  const result = await mammoth.convertToHtml({ path: 'ri.docx' });
  res.send(result.value);
});
console.log('listening on port 3000');
app.listen(3000);

