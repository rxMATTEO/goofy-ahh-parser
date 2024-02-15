export default function nabuhal(arr: number[]) {
  if(arr.length === 0) return {hours: 0, minutes: 0};
  return arr.reduce((p, c) => {
    return {
      hours: p.hours + c.hours,
      minutes: p.minutes + c.minutes
    };
  }, {hours: 0, minutes: 0});
}