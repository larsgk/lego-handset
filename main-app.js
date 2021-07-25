// @ts-check
import { Demo3DObj } from './demo-3dobj.js';
import { LegoHandsetDriver } from './lego-handset-driver.js';

export class MainApp extends HTMLElement {
    /** @type {Demo3DObj} */ #obj
    #cells

    constructor() {
        super();

        this.#cells = [];

        this.handleTranslate = this.handleTranslate.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    connectedCallback() {
        this.innerHTML = `
        <style>
        #list {
            display: grid;
            grid-template-columns: 1fr 3fr;
            width: 600px;
        }

        </style>

        <button id='connect'>CONNECT</button>
        <h2>Status: <span id='status'> - </span></h2>
        <div id='list'></div>
        <demo-3dobj></demo-3dobj>
        `;


        this.#obj = this.querySelector('demo-3dobj');
        this.querySelector('#connect').addEventListener('click', this.doScan);

        this._initList();

        LegoHandsetDriver.addEventListener('connect', this.handleConnect);
        LegoHandsetDriver.addEventListener('disconnect', this.handleDisconnect);
        LegoHandsetDriver.addEventListener('translate', this.handleTranslate);
    }

    disconnectedCallback() {
        LegoHandsetDriver.removeEventListener('connect', this.handleConnect);
        LegoHandsetDriver.removeEventListener('disconnect', this.handleDisconnect);
        LegoHandsetDriver.removeEventListener('translate', this.handleTranslate);
    }

    _initList() {
        const list = this.querySelector('#list');
        const labels = ['X [B -/+]', 'Y [A +/-]', 'Z [A/B Red]'];

        labels.forEach(l => {
            const label = document.createElement('span');
            label.classList.add('label');
            label.innerText = l;

            const value = document.createElement('span');
            value.classList.add('value');
            value.innerText = `-`;
            this.#cells.push(value);

            list.append(label, value);
        });
    }

    setStatus(str) {
        this.querySelector('#status').innerHTML = str;
    }

    setCellValue(i, val) {
        this.#cells[i].innerText = val;
    }

    doScan() {
        LegoHandsetDriver.scan();
    }

    handleTranslate(/** @type {CustomEvent} */ evt) {
        const {x, y, z} = evt.detail;
        this.#obj.setTranslation(x, y, -z);
        this.setCellValue(0, x);
        this.setCellValue(1, y);
        this.setCellValue(2, z);
    }

    handleConnect(/** @type {CustomEvent} */ evt) {
        const {device} = evt.detail;
        this.setStatus(`${device.name} connected`);
    }

    handleDisconnect() {
        this.setStatus(` - `);
    }
}
customElements.define('main-app', MainApp);
