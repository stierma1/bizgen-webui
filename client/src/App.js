import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

function SlideSelector() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [slideDetails, setSlideDetails] = useState(null);

  useEffect(() => {
    fetch('/api/slides')
      .then(res => res.json())
      .then(data => setSlides(data))
      .catch(console.error);
  }, []);

  const handleSlideSelect = (index) => {
    fetch(`/api/slides/${index}`)
      .then(res => res.json())
      .then(data => {
        setSelectedSlide(index);
        setSlideDetails(data.indexJson);
      })
      .catch(console.error);
  };

  return (
    <div className="slide-selector">
      <h2>Example Slides</h2>
      <select
        value={selectedSlide || ''}
        onChange={(e) => handleSlideSelect(e.target.value)}
      >
        <option value="">Select a slide</option>
        {slides.map(slide => (
          <option key={slide.index} value={slide.index}>
            Slide {slide.index}
          </option>
        ))}
      </select>

      {selectedSlide && (
        <div className="preview-section">
          <div className="image-container">
            <img
              src={slides.find(s => s.index === selectedSlide)?.slideUrl}
              alt="Slide preview"
            />
            {showOverlay && (
              <img
                className="overlay"
                src={slides.find(s => s.index === selectedSlide)?.bboxUrl}
                alt="Bounding box overlay"
              />
            )}
          </div>
          
          <div className="metadata">
            <label>
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
              />
              Show Bounding Boxes
            </label>
            
            {slideDetails && (
              <>
                <div className="info-field">
                  <h3>Caption</h3>
                  <p>{slideDetails.full_image_caption}</p>
                </div>
                <div className="info-field">
                  <h3>Number of Layers</h3>
                  <p>{slideDetails.layers_all.length}</p>
                </div>
                <button
                  className="template-button"
                  onClick={() => navigate('/edit', { state: { slideDetails } })}
                >
                  Use As Template
                </button>
              </>
            )}
            {generating && (
              <div className="spinner-container">
                <div className="spinner"></div>
              </div>
            )}
    
            {generationResult && (
              <div className="result-section">
                <h3>Generation Result</h3>
                <div className="preview-section">
                  <div className="image-container">
                    <img
                      src={generationResult.imageUrl}
                      alt="Generated slide"
                    />
                    {showBBox && (
                      <img
                        className="overlay"
                        src={generationResult.bboxUrl}
                        alt="Generated bounding box overlay"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
    
            {error && (
              <div className="error-message">
                Error: {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SlideEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [slideData, setSlideData] = useState(location.state?.slideDetails || {});
  const [showBBox, setShowBBox] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: slideData.name || '',
    caption: slideData.full_image_caption || '',
    layers: slideData.layers_all?.map(layer => ({
      ...layer,
      active: true
    })) || []
  });

  useEffect(() => {
    if (!location.state?.slideDetails) {
      navigate('/');
    }
  }, [location, navigate]);

  const handleLayerChange = (index, field, value) => {
    const updatedLayers = [...formData.layers];
    updatedLayers[index][field] = value;
    setFormData({ ...formData, layers: updatedLayers });
  };

  const toggleLayerActive = (index) => {
    const updatedLayers = [...formData.layers];
    updatedLayers[index].active = !updatedLayers[index].active;
    setFormData({ ...formData, layers: updatedLayers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          ...slideData,
          index: formData.name,
          full_image_caption: formData.caption,
          layers_all: formData.layers.filter(l => l.active)
        }])
      });

      if (!response.ok) throw new Error('Generation failed');
      
      const result = await response.json();
      setGenerationResult(result);
      setGenerating(false);
      
    } catch (error) {
      setError(error.message);
      setGenerating(false);
    }
  };

  return (
    <div className="App">
      <div className="editor-container">
        <h2>Edit Slide: {formData.name}</h2>
        
        <div className="preview-section">
          <div className="image-container">
            <img
              src={`/slides/${slideData.index}.png`}
              alt="Slide preview"
            />
            {showBBox && (
              <img
                className="overlay"
                src={`/slides/${slideData.index}_bbox.png`}
                alt="Bounding box overlay"
              />
            )}
          </div>

          <form onSubmit={handleSubmit} className="edit-form">
            <label>
              Show Bounding Boxes:
              <input
                type="checkbox"
                checked={showBBox}
                onChange={(e) => setShowBBox(e.target.checked)}
              />
            </label>

            <div className="form-group">
              <label>Slide Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Full Caption:</label>
              <textarea
                value={formData.caption}
                onChange={(e) => setFormData({...formData, caption: e.target.value})}
                required
              />
            </div>

            <div className="layers-section">
              <h3>Layers</h3>
              {formData.layers.map((layer, index) => (
                <div key={index} className={`layer-card ${layer.active ? '' : 'inactive'}`}>
                  <div className="layer-header">
                    <label>
                      <input
                        type="checkbox"
                        checked={layer.active}
                        onChange={() => toggleLayerActive(index)}
                      />
                      Layer {index + 1} ({layer.category})
                    </label>
                  </div>
                  
                  {layer.active && (
                    <div className="layer-fields">
                      <div className="form-group">
                        <label>Text:</label>
                        <textarea
                          value={layer.text}
                          onChange={(e) => handleLayerChange(index, 'text', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Caption:</label>
                        <textarea
                          value={layer.caption}
                          onChange={(e) => handleLayerChange(index, 'caption', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="template-button"
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Updated Slide'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SlideSelector />} />
        <Route path="/edit" element={<SlideEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
