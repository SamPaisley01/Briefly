// FileUpload.jsx
// Renders the assignment brief upload form.
// Supports drag-and-drop or a click-to-browse file picker.
// The parent component (MainApp) controls the loading state and usage limits.

import { useState, useRef } from "react";

// The analysis modes the user can choose from.
// Each value maps to a different AI prompt focus in the backend.
const ANALYSIS_MODES = [
  { value: "general",      label: "General breakdown" },
  { value: "requirements", label: "Assessment requirements" },
  { value: "structure",    label: "Report / submission structure" },
  { value: "rubric",       label: "Marking / rubric analysis" },
  { value: "timeline",     label: "Timeline and planning" },
];

function FileUpload({ onAnalyse, loading, usageLimitReached, usage, maxWindow, maxDay }) {
  const [file,     setFile]     = useState(null);
  const [focus,    setFocus]    = useState("");
  const [mode,     setMode]     = useState("general");
  const [dragOver, setDragOver] = useState(false);

  // Hidden file input element — triggered by clicking the drop zone
  const fileInputRef = useRef(null);

  // Validate and store the selected file
  const handleFileSelect = (selected) => {
    if (!selected) return;
    // Only accept PDFs
    if (selected.type !== "application/pdf") {
      alert("Please upload a PDF file. Other file types are not supported.");
      return;
    }
    setFile(selected);
  };

  // Handle a file dropped onto the drop zone
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  // Remove the currently selected file and reset the hidden input
  const clearFile = (e) => {
    e.stopPropagation(); // prevent triggering the drop zone click handler
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send the file and options up to MainApp via onAnalyse
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || loading || usageLimitReached) return;
    await onAnalyse(file, focus, mode);
  };

  // Build the CSS class string for the drop zone
  const dropZoneClass = [
    "drop-zone",
    dragOver ? "drag-over" : "",
    file ? "has-file" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={handleSubmit} className="upload-form">

      {/* ── Drag-and-drop area ───────────────────────────────────────────── */}
      <div
        className={dropZoneClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        {/* Hidden real file input — opened by the drop zone click handler */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          hidden
        />

        {file ? (
          /* File has been selected — show its name and a clear button */
          <div className="file-selected">
            <span className="file-icon">📄</span>
            <span className="file-name">{file.name}</span>
            <button
              type="button"
              className="file-clear-btn"
              onClick={clearFile}
              aria-label="Remove file"
            >
              ✕
            </button>
          </div>
        ) : (
          /* No file yet — show the upload prompt */
          <div className="drop-prompt">
            <span className="upload-icon">↑</span>
            <p>
              Drop your PDF here, or{" "}
              <span className="upload-link">browse files</span>
            </p>
            <small>PDF files only · max 10 MB</small>
          </div>
        )}
      </div>

      {/* ── Analysis type selector ───────────────────────────────────────── */}
      <div className="form-group">
        <label htmlFor="analysis-mode">Analysis type</label>
        <select
          id="analysis-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={loading}
        >
          {ANALYSIS_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Optional specific question ───────────────────────────────────── */}
      <div className="form-group">
        <label htmlFor="focus-input">
          Any specific questions?{" "}
          <span className="optional">(optional)</span>
        </label>
        <textarea
          id="focus-input"
          rows="3"
          placeholder="e.g. What should my final submission include? How should I structure the report?"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          disabled={loading}
          maxLength={500}
          autoComplete="off"
        />
      </div>

      {/* ── Submit button ────────────────────────────────────────────────── */}
      <button
        type="submit"
        className="btn-analyse"
        disabled={!file || loading || usageLimitReached}
      >
        {loading ? "Analysing..." : "Analyse Brief"}
      </button>

      {/* Usage limit warning — shown when the user is at or near their limit */}
      {usageLimitReached && (
        <p className="usage-warning">
          You have used your {maxDay} analyses for today. Please come back tomorrow.
        </p>
      )}
    </form>
  );
}

export default FileUpload;
