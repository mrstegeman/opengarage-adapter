'use strict';

const {
  Adapter,
  Database,
} = require('gateway-addon');
const ipRegex = require('ip-regex')({exact: true});
const manifest = require('../manifest.json');
const OpenGarageDevice = require('./device');

class OpenGarageAdapter extends Adapter {
  constructor(addonManager) {
    super(addonManager, manifest.id, manifest.id);
    addonManager.addAdapter(this);

    const db = new Database(manifest.id);
    db.open().then(() => {
      return db.loadConfig();
    }).then((config) => {
      this.config = config;
      this.startPairing();
    }).catch(console.error);
  }

  async startPairing() {
    for (const device of this.config.devices) {
      if (!ipRegex.test(device.address)) {
        console.error('Invalid address:', device.address);
        continue;
      }

      const id = `opengarage-${device.address}`;
      if (!this.devices.hasOwnProperty(id)) {
        const dev =
          new OpenGarageDevice(this, id, device, this.config.pollInterval);

        dev.promise.then(() => {
          this.handleDeviceAdded(dev);
        }).catch((e) => {
          console.error('Failed to create device:', e);
        });
      }
    }
  }

  removeThing(device) {
    if (this.devices.hasOwnProperty(device.id)) {
      device.unload();
      this.handleDeviceRemoved(device);
    }

    return Promise.resolve(device);
  }
}

module.exports = OpenGarageAdapter;
