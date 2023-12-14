const { UnRTF } = require("node-unrtf");
const iconv = require('iconv-lite');
const mammoth = require("mammoth");


const file = 'ri.rtf';
const unrtf = new UnRTF();
const buff = (iconv.encode('2023.04.03 ÊËÞ× 09:18:06 Ïðîõîäíàÿ ¹2 ÂÕÎÄ 000001BE8F64 K', 'win1251'));

console.log(iconv.decode(buff, 'utf8'));

(async function () {
  // const res = await unrtf.convert('./ri.rtf', {
  //   outputHtml: true,
  // });
  const res = await mammoth.convertToHtml({ path: 'ri.docx' });
  console.log(res.value);
  const fs = require('fs');
  fs.writeFile('ri.html', res.value, function (err) {

  });
  console.log(res);
})()