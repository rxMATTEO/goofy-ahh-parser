export default function avg(arr: number[]){
  return arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
}