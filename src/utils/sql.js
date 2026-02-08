function pickFields(obj, allowed) {
  const out = {};
  for (const k of allowed) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

module.exports = { pickFields };
