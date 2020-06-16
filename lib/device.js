'use strict';

const {Device} = require('gateway-addon');
const fetch = require('node-fetch');
const OpenGarageProperty = require('./property');

const vehicleEnum = [
  'Not Present',
  'Present',
  'Unknown',
];

class OpenGarageDevice extends Device {
  constructor(adapter, id, dev, pollInterval) {
    super(adapter, id);

    this.ip = dev.address;
    this.deviceKey = dev.dkey;
    this.pollInterval = pollInterval;

    this.promise = fetch(`http://${this.ip}/jc`).then((res) => {
      return res.json();
    }).then((body) => {
      this.name = body.name;
      this['@type'] = ['DoorSensor'];

      this.properties.set(
        'open',
        new OpenGarageProperty(
          this,
          'open',
          {
            '@type': 'OpenProperty',
            title: 'Open',
            type: 'boolean',
            readOnly: true,
          },
          body.door === 1
        )
      );

      this.properties.set(
        'vehicle',
        new OpenGarageProperty(
          this,
          'vehicle',
          {
            title: 'Vehicle',
            type: 'string',
            enum: vehicleEnum,
            readOnly: true,
          },
          vehicleEnum[body.vehicle]
        )
      );

      if (body.hasOwnProperty('temp')) {
        this['@type'].push('TemperatureSensor');
        this.properties.set(
          'temperature',
          new OpenGarageProperty(
            this,
            'temperature',
            {
              '@type': 'TemperatureProperty',
              title: 'Temperature',
              type: 'number',
              unit: 'degree celsius',
              readOnly: true,
            },
            body.temp
          )
        );
      }

      if (body.hasOwnProperty('humid')) {
        this['@type'].push('MultiLevelSensor');
        this.properties.set(
          'humidity',
          new OpenGarageProperty(
            this,
            'humidity',
            {
              '@type': 'LevelProperty',
              title: 'Humidity',
              type: 'number',
              minimum: 0,
              maximum: 100,
              unit: 'percent',
              readOnly: true,
            },
            body.humid
          )
        );
      }

      this.addAction(
        'open',
        {
          title: 'Open',
          description: 'Open the door',
        }
      );

      this.addAction(
        'close',
        {
          title: 'Close',
          description: 'Close the door',
        }
      );

      this.poll();
    });
  }

  poll() {
    fetch(`http://${this.ip}/jc`).then((res) => {
      return res.json();
    }).then((body) => {
      this.properties.get('open').setCachedValueAndNotify(body.door === 1);
      this.properties.get('vehicle').setCachedValueAndNotify(
        vehicleEnum[body.vehicle]
      );

      if (body.temp) {
        this.properties.get('temperature').setCachedValueAndNotify(body.temp);
      }

      if (body.humid) {
        this.properties.get('humidity').setCachedValueAndNotify(body.humid);
      }
    }).finally(() => {
      this._pollSchedule =
        setTimeout(this.poll.bind(this), this.pollInterval * 1000);
    });
  }

  unload() {
    if (this._pollSchedule) {
      clearTimeout(this._pollSchedule);
      this._pollSchedule = null;
    }
  }

  async performAction(action) {
    action.start();

    try {
      switch (action.name) {
        case 'open':
          await this.toggle(true);
          break;
        case 'close':
          await this.toggle(false);
          break;
      }
    } catch (e) {
      console.error(e);
      action.status = 'error';
      this.actionNotify(action);
      return;
    }

    action.finish();
  }

  toggle(open) {
    const query = open ? 'open=1' : 'close=1';
    return fetch(`http://${this.ip}/cc?dkey=${this.deviceKey}&${query}`)
      .then((res) => {
        return res.json();
      }).then((body) => {
        if (body.result !== 1) {
          throw new Error(`Error opening/closing door: ${body.result}`);
        }

        this.properties.get('open').setCachedValueAndNotify(open);
      });
  }
}

module.exports = OpenGarageDevice;
