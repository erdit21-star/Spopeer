const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isEmail = (v) => typeof v === 'string' && /\S+@\S+\.\S+/.test(v);

module.exports = { isNonEmptyString, isEmail };

