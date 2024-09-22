const express = require('express');
const cors = require('cors'); 

const app = express();
const port = 3003;

app.use(express.json()); 
app.use(cors()); 

app.post('/api', (req, res) => {
//   const { lat, lon, altitude, elevation, accuracy, categories } = req.body;

  const temperature = 20 + Math.random() * 10; 

  res.json({ temperature });
});

app.listen(port, () => {
  console.log(`Dummy API server running at http://localhost:${port}`);
});
