// @ts-check

// LegoHandsetDriver
// Tested with The LEGO 88010 Handset/Remote One on Linux
//
// Reads keys and dispatches x, y, z translations
//

export const LegoHandsetDriver = new class extends EventTarget {
    #device // Just allow one device, for now
    #writeCharacteristic
    #buttons

    constructor() {
        super();

        this.#buttons = [0, 0];

        this._onData = this._onData.bind(this);
    }

    async openDevice(device) {
        // if already connected to a device - close it
        if (this.#device) {
            this.disconnect();
        }

        const server = await device.gatt.connect();

        device.ongattserverdisconnected = e => this._disconnected(e);

        await this._startNotifications(server);

        this.#writeCharacteristic = await this._getWriteCharacteristic(server);

        await this._initButtons();

        console.log('Opened device: ', device);

        this.#device = device;
        this.dispatchEvent(new CustomEvent('connect', {detail: { device }}));
    }

    async _startNotifications(server) {
        const service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123');
        const characteristic = await service.getCharacteristic('00001624-1212-efde-1623-785feabcd123');
        characteristic.addEventListener('characteristicvaluechanged', this._onData);
        return characteristic.startNotifications();
    }

    async _getWriteCharacteristic(server) {
        const service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123');
        return await service.getCharacteristic('00001624-1212-efde-1623-785feabcd123');
    }

    async _initButtons() {
        await this.#writeCharacteristic.writeValue(new Uint8Array([0x0a, 0x00, 0x41, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]));
        await this.#writeCharacteristic.writeValue(new Uint8Array([0x0a, 0x00, 0x41, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]));
    }

    disconnect() {
        this.#device?.gatt?.disconnect();
        this.#device = undefined;
    }

    _disconnected(evt) {
        this.dispatchEvent(new Event('disconnect'));
    }

    async scan() {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['00001623-1212-efde-1623-785feabcd123'] }]
        });

        if (device) {
            await this.openDevice(device);
        }
    }

    _onData(event) {
        const target = event.target;

        const data = new Uint8Array(target.value.buffer)
        console.log(data);

        if (data.length === 5 && data[0] === 0x05 && data[2] === 0x45) {
            this.#buttons[data[3]] = data[4];

            const xlate = {x:0, y:0, z:0}

            if (this.#buttons[0] === 0x01 || this.#buttons[0] == 0xff) {
                xlate.y = this.#buttons[0] - 127;
            }
            if (this.#buttons[1] === 0x01 || this.#buttons[1] == 0xff) {
                xlate.x = 127 - this.#buttons[1];
            }
            if (this.#buttons[0] === 0x7f) xlate.z -= 127;
            if (this.#buttons[1] === 0x7f) xlate.z += 127;


            this.dispatchEvent(new CustomEvent('translate', {
                detail: xlate
            }));
        }
    }
}
