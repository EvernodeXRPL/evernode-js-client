export class EventEmitter {
    constructor() {
        this.handlers = {};
    }

    on(event, handler) {
        if (!this.handlers[event])
            this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    emit(event, value, error = null) {
        if (this.handlers[event])
            this.handlers[event].forEach(handler => handler(value, error));
    }
}