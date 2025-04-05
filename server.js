const express = require('express');
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { runInference } = require('./lib/processRunner');

const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync('example.schema.json', 'utf-8'));
const validate = ajv.compile(schema);

// Create required directories
const tempDir = path.join(__dirname, 'tmp');
const outputBase = path.join(__dirname, 'outputs');
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(outputBase, { recursive: true });

const app = express();
const port = 3000;

// Serve React build files
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Serve static files from slides directory
app.use('/slides', express.static(path.join(__dirname, 'slides')));

// API endpoint to get all slides
app.get('/api/slides', (req, res) => {
  
  try {
    // Read and parse slides metadata
    const slidesData = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'meta', 'slides.json'), 'utf8'));
    
    // Map each slide entry to API response format
    const responseData = slidesData.map(slide => ({
      index: slide.index,
      slideUrl: `http://localhost:${port}/slides/${slide.index}.png`,
      bboxUrl: `http://localhost:${port}/slides/${slide.index}_bbox.png`
    }));

    res.json(responseData);
  } catch (error) {
    console.error('Error processing slides:', error);
    res.status(500).json({ error: 'Failed to load slide data' });
  }
});

// API endpoint to get specific slide and next slide URL
app.get('/api/slides/:index', (req, res) => {
  try {
    const slidesData = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'meta', 'slides.json'), 'utf8'));
    
    const currentIndex = req.params.index;
    const currentSlide = slidesData.find(slide => slide.index === currentIndex);

    if (!currentSlide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    const slideGroup = parseInt(currentIndex.split("_")[0]);
    const currentIdx = parseInt(currentIndex.split("_")[1]);
    const nextSlide = currentIdx + 1;
    const previousSlide = currentIdx - 1;

    res.json({
      index: currentIndex,
      indexJson: currentSlide,
      nextSlideUrl: slidesData.find(slide => slide.index === (slideGroup + "_" + nextSlide))
        ? `http://localhost:${port}/api/slides/${slideGroup + "_" + nextSlide}`
        : null,
      previousSlideUrl: slidesData.find(slide => slide.index === (slideGroup + "_" + previousSlide))
        ? `http://localhost:${port}/api/slides/${slideGroup + "_" + previousSlide}`
        : null
    });
  } catch (error) {
    console.error('Error processing slide request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Generate new slides from config
app.post('/api/generate', express.json(), async (req, res) => {
  try {
    // Validate request body
    if (!validate(req.body)) {
      return res.status(400).json({
        error: 'Invalid config format',
        details: validate.errors
      });
    }

    // Create unique timestamp-based paths
    const timestamp = Date.now();
    const configPath = path.join(tempDir, `${timestamp}.json`);
    const outputDir = path.join(outputBase, String(timestamp));
    
    // Save config file
    fs.writeFileSync(configPath, JSON.stringify(req.body));
    
    // Run inference process
    await runInference(configPath, outputDir);

    // Build response URLs
    const index = req.body[0].index;
    res.json({
      index: index,
      imageUrl: `http://localhost:${port}/outputs/${timestamp}/${index}.png`,
      bboxUrl: `http://localhost:${port}/outputs/${timestamp}/${index}_bbox.png`
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      details: error.message
    });
  }
});

// Serve generated outputs
app.use('/outputs', express.static(outputBase));

// Handle client-side routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});