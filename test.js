var og = { hello: 'world', name: 'kason' };
const n = { name: 'shar', what: 'f' };
const { what, ...og } = n;

console.log(og);
