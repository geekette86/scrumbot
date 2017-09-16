/**
 * Scrumbot Sift. Frontend controller entry point.
 */
import {
  SiftController,
  registerSiftController
} from '@redsift/sift-sdk-web';

import Webhook from './lib/webhook';


function _sendWebhook(url, key, value) {
  // console.log('sched-sift: _sendWebhook: ', url, key, value);
  var wh = new XMLHttpRequest();
  var whurl = url;
  whurl = whurl.replace('{key}', encodeURIComponent(key));
  whurl = whurl.replace('{value}', encodeURIComponent(value));
  // console.log('sched-sift: _sendWebhook: sending: ', whurl);
  wh.open('GET', whurl, false);
  wh.send();
}

export default class MyController extends SiftController {
  constructor() {
    // You have to call the super() method to initialize the base class.
    super();
    this._suHandler = this.onStorageUpdate.bind(this);
    this.view.subscribe('wpm', this.onFormSubmit.bind(this));
  }

  // for more info: http://docs.redsift.com/docs/client-code-siftcontroller
  loadView(state) {
    console.log('scrumbot: loadView', state);
    // Register for storage update events on the "x" bucket so we can update the UI
    this.storage.subscribe(['settingsExport'], this._suHandler);
    switch (state.type) {
      case 'summary':
        let wh = this.getWebhook();
        let settings = this.getSettings();
        return {
          html: 'summary.html',
          data: Promise.all([wh, settings]).then(values => {
              console.log("PROMISES ", values)
              return {
                webhookUri: values[0],
                settings: JSON.parse(values[1].name)
              }})
          };

          default: console.error('scrumbot: unknown Sift type: ', state.type);
        }
    }

    // Event: storage update
    onStorageUpdate(value) {
      console.log('scrumbot: onStorageUpdate: ', value);
      return this.getSettings().then(xe => {
        // Publish events from 'who' to view
        console.log("OSU: ", xe)
        this.publish('name', xe);
      });
    }

    onFormSubmit(value) {
      console.log('scrumbot: FormSubmit: ', value);
      this.storage.get({
        bucket: '_redsift',
        keys: ['webhooks/settingsHook']
      }).then(wbr => {
        console.log('scrumbot: FormSubmit webhook url: ', wbr[0].value);
        // this._wpmSetting = value;
        // this.storage.putUser({ kvs: [{ key: 'wpm', value: value }] });
        // console.log("WEHHHH ", Webhook)
        // let wh = new Webhook(wbr[0].value);
        // wh.send('wpm', value);
        _sendWebhook(wbr[0].value, "settings", JSON.stringify(value))
      }).catch((error) => {
        console.error('scrumbot: FormSubmit: ', error);
      });
    }


    getWebhook() {
      return this.storage.get({
        bucket: '_redsift',
        keys: ['webhooks/settingsHook']
      }).then(d => {
        console.log("WH", d[0])
        return d[0].value
      });
    }

    getSettings() {
      return this.storage.getAll({
        bucket: 'settingsExport',
        keys: ['setttings']
      }).then((values) => {
        console.log('scrumbot: getSettings returned:', values);
        return {
          name: values[0].value
        };
      });
    }

  }

  // Do not remove. The Sift is responsible for registering its views and controllers
  registerSiftController(new MyController());
