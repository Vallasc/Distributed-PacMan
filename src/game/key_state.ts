export class KeyState {
    private state: Map<string, boolean>

    constructor() {
        // Keep track of current keys being pressed.
        this.state = new Map<string, boolean>()
        let self = this

        document.body.addEventListener('keydown', function (event: KeyboardEvent) {
            self.state.set(event.code, true)
        })
        document.body.addEventListener('keyup', function (event: KeyboardEvent) {
            self.state.set(event.code, false)
        })
        document.body.addEventListener('blur', function (_) {
            // Make it so that all keys are unpressed when the browser loses focus.
            for (let key in self.state.keys()) {
                if (self.state.has(key))
                    self.state.set(key, false)
            }
        })
    }

    public getKeyState(key: string): boolean{
        if (this.state.has(key))
            return this.state.get(key)
        return false
    }
}