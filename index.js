'use strict';

const OpenGarageAdapter = require('./lib/adapter');

module.exports = (addonManager) => {
  new OpenGarageAdapter(addonManager);
};
