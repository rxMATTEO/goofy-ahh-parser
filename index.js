const { UnRTF } = require("node-unrtf");
const file = 'ri.rtf';
const unrtf = new UnRTF();

(async function () {
  const res = await unrtf.convert('./ri.rtf', {
    outputHtml: true,
  });
  const fs = require('fs');
  fs.writeFile('ri.html', res, function (err) {

  });
  console.log(res);
})()