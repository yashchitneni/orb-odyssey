// Helper to scale positions and sizes
// New dimensions: 1200x800 (3:2 aspect ratio)
// Original base was 800x600, so we scale up by 1.5x for X and 1.333x for Y
const SCALE_X = 1.5;  // Scale X from 800 to 1200
const SCALE_Y = 1.333; // Scale Y from 600 to 800

const ScaleHelper = {
    // Scale a single value (general purpose)
    scale: (value) => Math.round(value * Math.min(SCALE_X, SCALE_Y)),
    
    // Scale x position
    x: (x) => Math.round(x * SCALE_X),
    
    // Scale y position
    y: (y) => Math.round(y * SCALE_Y),
    
    // Scale font size (scale up for bigger display)
    font: (size) => {
        const numSize = parseInt(size);
        return Math.round(numSize * 1.3) + 'px';
    },
    
    // Get center positions
    centerX: () => 600,
    centerY: () => 400,
    
    // Get canvas dimensions
    width: () => 1200,
    height: () => 800
};

// Make it globally available
window.ScaleHelper = ScaleHelper;