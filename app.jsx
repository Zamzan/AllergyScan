const { useState, useEffect, useRef } = React;

// --- ALLERGEN DICTIONARY ---
const ALLERGEN_DICTIONARY = {
  milk: ['milk', 'casein', 'whey', 'lactose', 'butter', 'cream', 'cheese', 'ghee', 'yogurt'],
  peanuts: ['peanut', 'peanuts', 'arachis oil', 'mandelonas', 'groundnut', 'arachis hypogaea'],
  soy: ['soy', 'soybean', 'soya', 'edamame', 'miso', 'tempeh', 'tofu', 'soy protein'],
  gluten: ['wheat', 'gluten', 'barley', 'rye', 'oats', 'spelt', 'kamut', 'triticale', 'malt', 'bulgur', 'seitan'],
  egg: ['egg', 'eggs', 'albumin', 'lysozyme', 'globulin', 'livetin', 'vitellin', 'ovo', 'ovalbumin'],
  shellfish: ['crab', 'crawfish', 'lobster', 'shrimp', 'prawn', 'krill', 'barnacle'],
  tree_nuts: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'brazil nut', 'macadamia', 'pine nut', 'hazelnut']
};

const SEVERITY_LEVELS = {
  HIGH: 'High',
  MEDIUM: 'Medium'
};

const getAllergenDisplayName = (key) => {
  return key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const Icon = ({ name, style, className }) => {
  // Use lucide from window to get raw SVG strings
  if (!window.lucide || !window.lucide.icons || !window.lucide.icons[name]) {
    return <span style={{width: 24, height: 24, display: 'inline-block'}} />;
  }
  
  // Format camelCase styles to CSS string or just let React handle wrapper styles
  const svgString = window.lucide.icons[name].toSvg({ class: 'lucide-icon', width: 24, height: 24 });
  return <span className={className} style={{...style, display: 'inline-flex', alignItems: 'center'}} dangerouslySetInnerHTML={{ __html: svgString }} />;
};

// --- MAIN APPLICATION COMPONENT ---
function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('home');
  const [userAllergies, setUserAllergies] = useState([]);
  const [customAllergies, setCustomAllergies] = useState([]);
  const [history, setHistory] = useState([]);
  const [newAllergyInput, setNewAllergyInput] = useState("");
  
  // Results State
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const savedAllergies = localStorage.getItem('allergies');
    if (savedAllergies) setUserAllergies(JSON.parse(savedAllergies));

    const savedCustom = localStorage.getItem('customAllergies');
    if (savedCustom) setCustomAllergies(JSON.parse(savedCustom));

    const savedHistory = localStorage.getItem('history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleAllergy = (key) => {
    let newAllergies = [...userAllergies];
    if (newAllergies.includes(key)) {
      newAllergies = newAllergies.filter(a => a !== key);
    } else {
      newAllergies.push(key);
    }
    setUserAllergies(newAllergies);
    localStorage.setItem('allergies', JSON.stringify(newAllergies));
  };

  const addCustomAllergy = () => {
    const val = newAllergyInput.trim().toLowerCase();
    if (val && !customAllergies.includes(val)) {
      const newCustom = [...customAllergies, val];
      setCustomAllergies(newCustom);
      localStorage.setItem('customAllergies', JSON.stringify(newCustom));
      setNewAllergyInput("");
    }
  };

  const removeCustomAllergy = (kw) => {
    const newCustom = customAllergies.filter(a => a !== kw);
    setCustomAllergies(newCustom);
    localStorage.setItem('customAllergies', JSON.stringify(newCustom));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setActiveTab('results');
    setIsProcessing(true);
    setScanResult(null);
    setIsEditing(false);

    try {
      // Canvas Image Preprocessing for better OCR
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        const val = avg > 110 ? 255 : 0; // High contrast threshold
        data[i] = data[i+1] = data[i+2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
      
      const worker = await window.Tesseract.createWorker('eng');
      const result = await worker.recognize(canvas.toDataURL('image/jpeg'));
      await worker.terminate();

      const text = result.data.text || "No text found.";
      processText(text);
    } catch (error) {
      console.error(error);
      alert("Failed to process image.");
      setIsProcessing(false);
    }
  };

  const processText = (text) => {
    const lowerText = text.toLowerCase();
    let found = [];

    userAllergies.forEach(allergyKey => {
      const keywords = ALLERGEN_DICTIONARY[allergyKey];
      keywords.forEach(kw => {
        if (lowerText.includes(kw)) {
            if (!found.find(f => f.keyword === kw)) {
                found.push({ allergy: allergyKey, keyword: kw, severity: SEVERITY_LEVELS.HIGH });
            }
        }
      });
    });

    customAllergies.forEach(kw => {
        if (lowerText.includes(kw)) {
             if (!found.find(f => f.keyword === kw)) {
                found.push({ allergy: kw, keyword: kw, severity: SEVERITY_LEVELS.HIGH });
             }
        }
    });

    const isSafe = found.length === 0;

    const newScan = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      originalText: text,
      foundAllergens: found,
      isSafe: isSafe
    };

    setScanResult(newScan);
    setIsProcessing(false);

    const newHistory = [newScan, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('history', JSON.stringify(newHistory));

    // Voice alert
    if (!isSafe && 'speechSynthesis' in window) {
      const uniqueAllergies = [...new Set(found.map(f => getAllergenDisplayName(f.allergy)))].join(" and ");
      const msg = `Warning. This product contains ${uniqueAllergies}.`;
      var utterance = new SpeechSynthesisUtterance(msg);
      window.speechSynthesis.speak(utterance);
    }
  };

  const renderHighlightedText = (text, foundAllergens) => {
     let highlighted = text;
     foundAllergens.forEach(f => {
         const regex = new RegExp(`(${f.keyword})`, 'gi');
         highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
     });
     return <div dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="glass-panel app-header">
        <div className="app-title">AllergyScan</div>
        <button onClick={toggleTheme} className="btn-icon">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>

      {/* Navigation */}
      <div className="glass-panel nav-bar">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Icon name="scan" style={{marginRight: 6}} /> Scan
        </div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <Icon name="user" style={{marginRight: 6}} /> Profile
        </div>
        <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Icon name="clock" style={{marginRight: 6}} /> History
        </div>
      </div>

      {/* Main Content Areas */}
      
      {/* HOME TAB */}
      {activeTab === 'home' && (
        <div className="fade-in">
          {(userAllergies.length === 0 && customAllergies.length === 0) ? (
            <div className="glass-panel p-4" style={{padding: 24, textAlign: 'center'}}>
              <h2 style={{marginBottom: 12}}>Welcome to AllergyScan!</h2>
              <p style={{color: 'var(--text-muted)', marginBottom: 24}}>Setup your allergy profile to get started.</p>
              <button className="btn" onClick={() => setActiveTab('profile')}>Go to Profile</button>
            </div>
          ) : (
            <div>
              <p style={{color: 'var(--text-muted)', marginBottom: 16}}>Upload an ingredient list to scan for hidden allergens.</p>
              <div className="glass-panel upload-card file-input-wrapper">
                <Icon name="camera" style={{width: 64, height: 64, marginBottom: 16, color: 'var(--accent)'}} />
                <h3>Tap to Scan ingredients</h3>
                <p style={{color: 'var(--text-muted)', marginTop: 8}}>Processed visually on your device.</p>
                <input type="file" accept="image/*" onChange={handleImageUpload}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="fade-in">
          <h2>Your Allergies</h2>
          <p style={{color: 'var(--text-muted)', marginTop: 4, marginBottom: 16}}>Select ingredients you are allergic to. AllergyScan looks for these and their hidden derivatives.</p>
          <div className="allergy-list">
            {Object.keys(ALLERGEN_DICTIONARY).map(key => (
              <div 
                key={key} 
                className={`glass-panel allergy-item ${userAllergies.includes(key) ? 'selected' : ''}`}
                onClick={() => toggleAllergy(key)}
              >
                 <span style={{fontWeight: 600, fontSize: '1.1rem'}}>{getAllergenDisplayName(key)}</span>
                 {userAllergies.includes(key) && <Icon name="check-circle" style={{color: 'var(--accent)'}} />}
              </div>
            ))}
          </div>

          <h3 style={{marginTop: 32, marginBottom: 12}}>Custom Allergies</h3>
          <div style={{display: 'flex', gap: 8, marginBottom: 16}}>
            <input 
              type="text" 
              value={newAllergyInput}
              onChange={e => setNewAllergyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomAllergy()}
              placeholder="e.g. sesame, mustard..."
              style={{flex: 1, padding: 12, borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none'}}
            />
            <button className="btn" style={{width: 'auto', padding: '0 24px'}} onClick={addCustomAllergy}>
              <Icon name="plus" /> Add
            </button>
          </div>

          <div className="allergy-list" style={{marginTop: 0, paddingBottom: 32}}>
            {customAllergies.map(kw => (
              <div 
                key={kw} 
                className="glass-panel allergy-item selected"
                style={{borderColor: 'var(--accent)', cursor: 'default'}}
              >
                 <span style={{fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize'}}>{kw}</span>
                 <button className="btn-icon" onClick={() => removeCustomAllergy(kw)} style={{color: 'var(--danger)', cursor: 'pointer', padding: 4}}>
                   <Icon name="trash-2" />
                 </button>
              </div>
            ))}
            {customAllergies.length === 0 && (
              <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>No custom allergies added yet.</p>
            )}
          </div>
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="fade-in">
          {isProcessing ? (
            <div className="glass-panel" style={{padding: '48px 24px', textAlign: 'center'}}>
              <div className="spinner"></div>
              <h3>Analyzing Ingredients...</h3>
              <p style={{color: 'var(--text-muted)', marginTop: 8}}>Converting image to text via OCR.</p>
            </div>
          ) : scanResult ? (
            <div>
              <div className="result-header fade-in">
                 {scanResult.isSafe ? (
                   <div className="safe-badge">
                     <Icon name="shield-check" /> Safe to Consume
                   </div>
                 ) : (
                   <div className="glass-panel" style={{background: 'var(--danger-bg)', borderColor: 'var(--danger)', padding: 24}}>
                     <div className="danger-badge" style={{marginBottom: 16, display: 'inline-flex', padding: '12px 24px', alignItems: 'center'}}>
                       ⚠️ خطر: Contains {[...new Set(scanResult.foundAllergens.map(f => getAllergenDisplayName(f.allergy)))].join(", ")}
                     </div>
                     <p style={{fontWeight: 500, textAlign: 'left', color: 'var(--text-main)'}}>Detected harmful ingredients:</p>
                     <ul style={{textAlign: 'left', marginTop: 12, paddingLeft: 24, fontWeight: 'bold'}}>
                       {scanResult.foundAllergens.map((f, i) => (
                         <li key={i} style={{color: 'var(--danger)'}}>{f.keyword} (Severity: {f.severity})</li>
                       ))}
                     </ul>
                   </div>
                 )}
              </div>

              <div className="glass-panel ingredient-box fade-in" style={{animationDelay: '0.2s', position: 'relative'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                  <h4 style={{margin: 0}}>Scanned Output:</h4>
                  {!isEditing && (
                    <button className="btn-icon" onClick={() => { setIsEditing(true); setEditableText(scanResult.originalText); }}>
                      <Icon name="edit" style={{width: 18, height: 18}} />
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                     <textarea 
                       value={editableText} 
                       onChange={e => setEditableText(e.target.value)} 
                       style={{width: '100%', minHeight: 120, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: 'var(--text-main)', border: '1px solid var(--card-border)'}} 
                     />
                     <button className="btn" onClick={() => { processText(editableText); setIsEditing(false); }}>
                       <Icon name="refresh-cw" style={{marginRight: 6}}/> Re-Analyze Text
                     </button>
                  </div>
                ) : (
                  <div style={{color: 'var(--text-muted)'}}>
                    {renderHighlightedText(scanResult.originalText, scanResult.foundAllergens)}
                  </div>
                )}
              </div>

              <button className="btn" style={{marginTop: 24}} onClick={() => setActiveTab('home')}>
                <Icon name="rotate-ccw" style={{marginRight: 8}} /> Scan Another
              </button>
            </div>
          ) : (
             <div style={{textAlign: 'center', padding: 24}}>No scan data.</div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="fade-in">
          <h2 style={{marginBottom: 16}}>Scan History</h2>
          {history.length === 0 ? (
             <p style={{color: 'var(--text-muted)'}}>No past scans found.</p>
          ) : (
             <div>
               {history.map(item => (
                 <div key={item.id} className={`glass-panel history-item ${item.isSafe ? 'history-item-safe' : 'history-item-danger'}`}>
                   <div>
                      <div style={{fontWeight: 600}}>{item.date}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4}}>
                         {item.isSafe ? "No allergens detected" : `Found: ${[...new Set(item.foundAllergens.map(f => f.keyword))].join(", ")}`}
                      </div>
                   </div>
                   <Icon name={item.isSafe ? 'check-circle' : 'alert-triangle'} style={{color: item.isSafe ? 'var(--success)' : 'var(--danger)'}} />
                 </div>
               ))}
             </div>
          )}
        </div>
      )}
    </div>
  );
}

const root = window.ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
