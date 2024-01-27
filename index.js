const mammoth = require("mammoth");
const express = require('express');
const cors = require("cors");
const app = express();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});
const jsdom = require("jsdom");
const {writeFileSync, readFileSync} = require("fs");
const {exec} = require('child_process');

app.use(cors());
app.use(express.static('dist'));
app.use(express.json());

let DOC = '';
(async () => {
  DOC = await decodeGoofyDoc(readFileSync('docs/current/1706385615121.htm'));
})();

async function decodeGoofyDoc(doc){
  const windows1251 = await import('windows-1251');
  return windows1251.decode(doc);
}


function parseInfo(htmlString) {
  const parser = new jsdom.JSDOM(htmlString);
  const events = (parser.window.document.querySelectorAll('tr')[0]);
  const dates = (parser.window.document.querySelectorAll('tr')[2]);
  const time = (parser.window.document.querySelectorAll('tr')[3]);
  return {
    eventsType: events.querySelector('u').textContent,
    dates: _infoBlockToArr(dates).slice(1).join(' '),
    creationDate: events.querySelectorAll('td')[1].textContent,
    time: `${time.querySelectorAll('b')[1].textContent} ${time.querySelectorAll('b')[3].textContent}`
  }
  // return parser.window.document.querySelectorAll('p')[0].textContent;
  // return (parser.window.document.querySelectorAll('p')[0].textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
}

function peopleParser(startIndex, peopleArray, parser, initial = true) {
  let chel = {
    info: [],
  };
  let i = startIndex;
  const noNameBlocks = ['2023', new Date().getFullYear().toString(), 'Помещение', 'Дата', 'Стр', "Выход", "Вход",];
  const trs = parser.window.document.querySelectorAll('tr');
  while (true) {
    const infoBlock = (trs[i]?.textContent);
    const infoBlockRaw = (trs[i]);
    if (infoBlock === '') {
      i++;
      continue;
    }
    if (!infoBlock) return peopleArray; // end of method

    if (!initial && !noNameBlocks.find(block => infoBlock.trim().toLowerCase().includes(block.toLowerCase())) && infoBlock.length > 0) {
      if (!chel.firstName) {
        const {firstName, lastName, middleName} = peopleArray[peopleArray.length - 1];
        chel.firstName = firstName;
        chel.lastName = lastName;
        chel.middleName = middleName;
      }
      const foundChel = peopleArray.find(ch => chel.firstName === ch.firstName && chel.lastName === ch.lastName && chel.middleName === ch.middleName);
      if (foundChel) {
        foundChel.info.push(...chel.info);
      } else {
        peopleArray.push(chel);
      }
      chel = {
        info: [],
      }
      const [first, scnd, prollyThrd] = (trs[i]?.textContent).split(' ');

      const next = trs[i + 1]?.textContent;
      if (!noNameBlocks.find(block => next.trim().toLowerCase().includes(block.toLowerCase()))) {
        chel.middleName = trs[++i]?.textContent;
      } else {
        chel.middleName = prollyThrd;
      }
      chel.firstName = scnd;
      chel.lastName = first;

    } else {
      if (i === startIndex) {
        const infoBlock = (trs[i]?.textContent);
        chel.page = infoBlock;
        chel.pageNumber = infoBlock.split(' ')[1];
      } else if (i === startIndex + 1) {
        chel.room = infoBlock;
      } else if (i === startIndex + 2) {
        chel.rows = infoBlock;
      } else if (initial && i === startIndex + 5) {
        chel.middleName = infoBlock;
      } else if (initial && i === startIndex + 4) {
        const [first, last] = infoBlock.split(' ');
        chel.lastName = first;
        chel.firstName = last;
      } else if (!infoBlock.toString().trim().startsWith('Стр.')) {
        chel.info.push(_infoBlockToArr(infoBlockRaw));
      } else {
        if (!chel.firstName) {
          const {firstName, lastName, middleName} = peopleArray[peopleArray.length - 1];
          chel.firstName = firstName;
          chel.lastName = lastName;
          chel.middleName = middleName;
        }
        const foundChel = peopleArray.find(ch => chel.firstName === ch.firstName && chel.lastName === ch.lastName && chel.middleName === ch.middleName);
        if (foundChel) {
          foundChel.info.push(...chel.info);
        } else {
          peopleArray.push(chel);
        }
        break;
      }
    }
    i += 1;
  }
  return peopleParser(i, peopleArray, parser, false);
}

function _infoBlockToArr(infoBlock) {
  return Array.from(infoBlock.querySelectorAll('td').values()).map(i => i.textContent);
}

function parsePeople(htmlString) {
  const parser = new jsdom.JSDOM(htmlString);
  const people = [];
  return peopleParser(4, people, parser);
}

app.get('/api/info', async function (req, res) {
  res.send(parseInfo((DOC)));
});

app.get('/api/people', async function (req, res) {
  res.send(parsePeople(DOC));
});


app.get('/', async function (req, res) {
  const file = readFileSync('dist/index.html');
  res.header('Content-Type', 'text/html');
  res.send(file);
});

app.get('/robots.txt', function (req, res) {
  res.type('text/plain');
  res.send("User-agent: *\nDisallow: /");
});

app.post('/api/create', upload.single('rtf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Где файл? Нету.');
  }
  const file = req.file.buffer.toString();
  console.log(file.toString())
});

app.get('/api/ping', function (req, res) {
  res.send('pong');
})
console.log('listening on port 3001');
app.listen(3001);

