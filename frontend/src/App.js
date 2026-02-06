import {useState} from "react";

function App(){
  const [file, setFile]=useState(null);
  const [detections, setDetections] = useState([]);

  const uploadImage =async ()=>{
    if (!file) return alert("Select an image first");
    const formData = new FormData();
    formData.append("file",file);

    const res = await fetch("http://127.0.0.1:8001/detect-image",{
      method: "POST",
      body: formData
    });

    const data = await res.json();
    setDetections(data.detections);
  }
  return (
    <div style={{ padding: "30px" }}>
      <h1>Safety AI Dashboard</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={uploadImage} style={{ marginLeft: "10px" }}>
        Detect Objects
      </button>

      <h2>Detections:</h2>
      <ul>
        {detections.map((d, index) => (
          <li key={index}>
            {d.label} - Confidence: {d.confidence.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
