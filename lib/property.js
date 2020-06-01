'use strict';

const {Property} = require('gateway-addon');

class OpenGarageProperty extends Property {
  constructor(device, name, descr, value) {
    super(device, name, descr);
    this.setCachedValue(value);
  }
}

module.exports = OpenGarageProperty;
