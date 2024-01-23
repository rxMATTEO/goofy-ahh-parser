export default function late(arr: number[]){
  return arr.filter( (num) => (num.hours === 9 && num.minutes > 15) || num.hours > 9).length;
}