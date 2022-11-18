const fs = require('fs');
const storyFile = fs.readFileSync("story.json", 'utf8');
const story = JSON.parse(storyFile);
// Read the "index.html" file using 'utf8' encoding
const indexFile = fs.readFileSync("build/index.html", 'utf8');
// Add the contents of "index.html" as the 'source'
story.source = indexFile;

// Build a "format.js" file contents
// Convert the 'story' back into a string
let format = "window.storyFormat(" + JSON.stringify(story) + ");";
// Write the "format.js" file using
fs.writeFileSync("build/format.js", format);
console.log("built new version in /build");
