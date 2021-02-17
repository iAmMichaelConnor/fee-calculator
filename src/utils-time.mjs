export const toDate = time => new Date(time).toString();

// these little functions are possibly unused...
const toSecs = time => time / 1000;
const toMins = time => toSecs(time) / 60;
const toHrs = time => toMins(time) / 60;
const toDays = time => toHrs(time) / 24;

export const formatTime = _s => {
  let s = _s;
  const ms = s % 1000;
  s = (s - ms) / 1000;
  const secs = s % 60;
  s = (s - secs) / 60;
  const mins = s % 60;
  s = (s - mins) / 60;
  const hrs = s % 24;
  const days = (s - hrs) / 24;

  return `${days}d ${hrs}h ${mins}m ${secs}s ${ms}ms`;
};

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
