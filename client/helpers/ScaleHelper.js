// A placeholder ScaleHelper to ensure the refactored code is runnable.
// The user should replace this with their actual implementation.
export const ScaleHelper = {
    _width: 800,
    _height: 600,

    init(game) {
        this._width = game.config.width;
        this._height = game.config.height;
    },
    x(val) { return val; },
    y(val) { return val; },
    scale(val) { return val; },
    font(size) { return size; },
    width() { return this._width; },
    height() { return this._height; },
    centerX() { return this._width / 2; },
    centerY() { return this._height / 2; }
};