import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

function Selector() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [infographics, setInfographics] = useState([]);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [selectedInfographic, setSelectedInfographic] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [slideDetails, setSlideDetails] = useState(null);
  const [infographicDetails, setInfographicDetails] = useState(null);

  useEffect(() => {
    fetch('/api/slides')
      .then(res => res.json())
      .then(data => {
        data.sort((a, b) => {
          return parseInt(a.index.split("_")[0]) - parseInt(b.index.split("_")[0])
        });
        return setSlides(data)
      })
      .catch(console.error);
    fetch('/api/infographics')
    .then(res => res.json())
    .then(data => {
      data.sort((a, b) => {
        return parseInt(a) - parseInt(b)
      });
      return setInfographics(data)
    })
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

  const handleInfographicSelect = (index) => {
    fetch(`/api/infographics/${index}`)
      .then(res => res.json())
      .then(data => {
        setSelectedInfographic(index);
        setInfographicDetails(data.indexJson);
      })
      .catch(console.error);
  };


  return (
    <span>
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
                  onClick={() => navigate('/edit/slide', { state: { slideDetails } })}
                >
                  Use As Template
                </button>
              </>
            )}
            
          </div>
        </div>
      )}
    </div>
    <div className="infographic-selector">
      <h2>Example Infographic</h2>
      <select
        value={selectedInfographic || ''}
        onChange={(e) => handleInfographicSelect(e.target.value)}
      >
        <option value="">Select a Infographic</option>
        {infographics.map(infographic => (
          <option key={infographic.index} value={infographic.index}>
             {infographic.index}
          </option>
        ))}
      </select>

      {selectedInfographic && (
        <div className="preview-section">
          <div className="image-container">
            <img
              src={infographics.find(s => s.index.toString() === selectedInfographic.toString())?.slideUrl}
              alt="Infographic preview"
            />
            {showOverlay && (
              <img
                className="overlay"
                src={infographics.find(s => s.index.toString() === selectedInfographic.toString())?.bboxUrl}
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
            
            {infographicDetails && (
              <>
                <div className="info-field">
                  <h3>Caption</h3>
                  <p>{infographicDetails.full_image_caption}</p>
                </div>
                <div className="info-field">
                  <h3>Number of Layers</h3>
                  <p>{infographicDetails.layers_all.length}</p>
                </div>
                <button
                  className="template-button"
                  onClick={() => navigate('/edit/infographic', { state: { infographicDetails } })}
                >
                  Use As Template
                </button>
              </>
            )}
            
          </div>
        </div>
      )}
    </div>
    </span>
    
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
    setGenerating(true);
    setError(null);
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
      setShowBBox(false);
      
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
                      {layer.category === "text" && (
                      <div className="form-group">
                        <label>Text:</label>
                        <textarea
                          value={layer.text}
                          onChange={(e) => handleLayerChange(index, 'text', e.target.value)}
                        />
                      </div>
                      )}
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
                  <button
                    className="template-button"
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `${generationResult.imageUrl}`;
                      link.download = `${generationResult.imageUrl}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Download Slide
                  </button>
                </div>
              </div>
            )}
    
            {error && (
              <div className="error-message">
                Error: {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function InfographicEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [infographicData, setInfographicData] = useState(location.state?.infographicDetails || {});
  const [showBBox, setShowBBox] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generationResult, setGenerationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: infographicData.name || '',
    caption: infographicData.full_image_caption || '',
    layers: infographicData.layers_all?.map(layer => ({
      ...layer,
      active: true
    })) || []
  });

  useEffect(() => {
    if (!location.state?.infographicDetails) {
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
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          ...infographicData,
          index: formData.name,
          full_image_caption: formData.caption,
          layers_all: formData.layers.filter(l => l.active)
        }])
      });

      if (!response.ok) throw new Error('Generation failed');
      
      const result = await response.json();
      setGenerationResult(result);
      setGenerating(false);
      setShowBBox(false);
      
    } catch (error) {
      setError(error.message);
      setGenerating(false);
    }
  };

  return (
    <div className="App">
      <div className="editor-container">
        <h2>Edit Infographic: {formData.name}</h2>
        
        <div className="preview-section">
          <div className="image-container">
            <img
              src={`/infographics/${infographicData.index}.png`}
              alt="Infographic preview"
            />
            {showBBox && (
              <img
                className="overlay"
                src={`/infographics/${infographicData.index}_bbox.png`}
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
              <label>Infographic Name:</label>
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
                      {layer.category === "text" && (
                      <div className="form-group">
                        <label>Text:</label>
                        <textarea
                          value={layer.text}
                          onChange={(e) => handleLayerChange(index, 'text', e.target.value)}
                        />
                      </div>
                      )}
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
              {generating ? 'Generating...' : 'Generate Updated Infographic'}
            </button>
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
                      alt="Generated infographic"
                    />
                    {showBBox && (
                      <img
                        className="overlay"
                        src={generationResult.bboxUrl}
                        alt="Generated bounding box overlay"
                      />
                    )}
                  </div>
                  <button
                    className="template-button"
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `${generationResult.imageUrl}`;
                      link.download = `${generationResult.imageUrl}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Download Infographic
                  </button>
                </div>
              </div>
            )}
    
            {error && (
              <div className="error-message">
                Error: {error}
              </div>
            )}
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
        <Route path="/" element={<Selector />} />
        <Route path="/edit/slide" element={<SlideEditor />} />
        <Route path="/edit/infographic" element={<InfographicEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
