// React Router 7 uses the Web Encoding API, which this Jest/JSDOM setup does
// not expose by default.
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
