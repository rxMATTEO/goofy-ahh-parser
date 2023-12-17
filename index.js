const mammoth = require("mammoth");
const fs = require('fs');
const DOMParser = require('universal-dom-parser');
const express = require('express');
const cors = require("cors");
const app = express();
const jsdom = require("jsdom");
const {info} = require("autoprefixer");

app.use(cors());

function parseInfo(htmlString) {
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

function peopleParser(startIndex, peopleArray, parser){
  const chel = {
    info: [],
  };
  let i = startIndex;
  while (true) {
    const infoBlock = (parser.window.document.querySelectorAll('p')[i]?.textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
    if(!infoBlock) return peopleArray;
    if (i === startIndex) {
      const infoBlock = (parser.window.document.querySelectorAll('p')[i]?.textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
      chel.page = infoBlock[0];
      chel.pageNumber = infoBlock[0].split(' ')[1];
    }
    else if (i === startIndex + 1) {
      chel.room = infoBlock[1];
    } else if (i === startIndex + 2) {
      chel.rows = infoBlock;
    } else if (i === startIndex + 5) {
      chel.middleName = infoBlock[0];
    } else if (i === startIndex + 4) {
      const [first, last] = infoBlock[0].split(' ');
      chel.lastName = first;
      chel.firstName = last;
    } else if (!infoBlock.toString().trim().startsWith('Стр.')) {
      chel.info.push(infoBlock);
    } else {
      peopleArray.push(chel);
      break;
    }
    i += 1;
  }
  return peopleParser(i, peopleArray, parser);
}

function parsePeople(htmlString) {
  const parser = new jsdom.JSDOM(htmlString);
  const people = [];
  let chel = {
    info: []
  };
  return peopleParser(4, people, parser);
}

app.get('/info', async function (req, res) {
  const result = await mammoth.convertToHtml({path: 'ri.docx'});
  res.send(parseInfo((result.value)));
});

app.get('/people', async function (req, res) {
  const result = await mammoth.convertToHtml({path: 'ri.docx'});
  res.send(parsePeople((result.value)));
});

app.get('/', async function (req, res) {
  const result = await mammoth.convertToHtml({path: 'ri.docx'});
  res.send(result.value);
});
console.log('listening on port 3000');
app.listen(3000);

