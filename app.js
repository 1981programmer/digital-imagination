const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to Digital Imagination (DI) - Store Coming Soon!');
});

app.listen(PORT, () => {
    console.log(`DI Server is running on http://localhost:${PORT}`);
});