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
  const windows1251 = await import('windows-1251');
  const DOC1 = windows1251.decode(readFileSync('ACTUAL.htm'));
  DOC = DOC1;
})();


function parseInfo(htmlString) {
  const parser = new jsdom.JSDOM(htmlString);
  const events = (parser.window.document.querySelectorAll('tr')[0]);
  const dates = (parser.window.document.querySelectorAll('tr')[2]);
  const time = (parser.window.document.querySelectorAll('tr')[3]);
  return {
    eventsType: events.querySelector('u').textContent,
    creationDate: Array.from(dates.querySelectorAll('b').values()).map(i => i.textContent).join(' '),
    dates: events.querySelectorAll('td')[1].textContent,
    time: `Время: ${time.querySelectorAll('b')[1].textContent} ${time.querySelectorAll('b')[3].textContent}`
  }
  // return parser.window.document.querySelectorAll('p')[0].textContent;
  // return (parser.window.document.querySelectorAll('p')[0].textContent.replace(/\s\s+/g, '/replace').split('/replace').join('\t').split('\t').filter(i => i));
}

function peopleParser(startIndex, peopleArray, parser, initial = true){
  let chel = {
    info: [],
  };
  let i = startIndex;
  const noNameBlocks = ['2023', new Date().getFullYear().toString(), 'Помещение', 'Дата', 'Стр', "Выход", "Вход",];
  while (true) {
    const infoBlock = (parser.window.document.querySelectorAll('tr')[i]?.textContent);
    const infoBlockRaw = (parser.window.document.querySelectorAll('tr')[i]);
    if(infoBlock == '') {
      i++
      continue;
    };
    if(!infoBlock) return peopleArray; // end of method

    // !TODO! HERE NOT SOLVED. NOT WORKING WHEN FIRST NAME IN ONE LINE FIXME

    if(!initial && !noNameBlocks.find(block => infoBlock.trim().toLowerCase().includes(block.toLowerCase())) && infoBlock.length > 0) {
      if(!chel.firstName) {
        const { firstName, lastName, middleName } = peopleArray[peopleArray.length - 1];
        chel.firstName = firstName;
        chel.lastName = lastName;
        chel.middleName = middleName;
      }
      const foundChel = peopleArray.find(ch => chel.firstName === ch.firstName && chel.lastName === ch.lastName && chel.middleName === ch.middleName);
      if(foundChel){
        foundChel.info.push(...chel.info);
      } else {
        peopleArray.push(chel);
      }
      chel = {
        info: [],
      }
      const [first, scnd, prollyThrd] = (parser.window.document.querySelectorAll('tr')[i]?.textContent).split(' ');

      const next = parser.window.document.querySelectorAll('tr')[i + 1]?.textContent;
      if(!noNameBlocks.find(block => next.trim().toLowerCase().includes(block.toLowerCase()))){
      chel.middleName = parser.window.document.querySelectorAll('tr')[++i]?.textContent; // TODO MB ITS IT
      } else {
        chel.middleName = prollyThrd;
      }
      chel.firstName = first;
      chel.lastName = scnd;

      // !!! TODO END OF NOT SOLVED

    } else {
      if (i === startIndex) {
        const infoBlock = (parser.window.document.querySelectorAll('tr')[i]?.textContent);
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
        if(!chel.firstName) {
          const { firstName, lastName, middleName } = peopleArray[peopleArray.length - 1];
          chel.firstName = firstName;
          chel.lastName = lastName;
          chel.middleName = middleName;
        }
        const foundChel = peopleArray.find(ch => chel.firstName === ch.firstName && chel.lastName === ch.lastName && chel.middleName === ch.middleName);
        if(foundChel){
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

function _infoBlockToArr(infoBlock){
  return Array.from(infoBlock.querySelectorAll('td').values()).map( i => i.textContent );
}

function parsePeople(htmlString) {
  const parser = new jsdom.JSDOM(htmlString);
  const people = [];
  return peopleParser(4, people, parser);
}

app.get('/api/info', async function (req, res) {
  // const result = await mammoth.convertToHtml({path: 'stuff.docx'});
  res.send(parseInfo((DOC)));
});

app.get('/api/people', async function (req, res) {
  // const result = await mammoth.convertToHtml({path: 'stuff.docx'});
  res.send(parsePeople(DOC));
});


app.get('/', async function (req, res) {
  const result = await mammoth.convertToHtml({path: 'stuff.docx'});
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
  writeFileSync('ri.rtf', req.file.buffer);

  exec('npm run parse', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    exec('npm run iconv', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      res.sendFile('./test.txt', {root: '.'});
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
    });

    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
  });
});

app.get('/api/ping', function (req, res) {
  res.send('pong');
})
console.log('listening on port 3001');
app.listen(3001);

