// Test file that does NOT import typedefs
// This is used to verify that watch files are only registered
// for files that actually import the virtual module

export const dummy = 'This file does not import typedefs';

console.log(dummy);
