const express = require('express');
const path = require('path');
const app = express();

// Serve the current directory (which contains index.html and attack.html)
app.use(express.static(__dirname));

app.listen(5500, '127.0.0.1', () => {
    console.log('Static file server running cleanly on http://127.0.0.1:5500');
    console.log('This ensures IPv4 binding so Burp Suite can connect to it seamlessly!');
});
