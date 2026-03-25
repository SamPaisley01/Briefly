// ResultDisplay.jsx
// Shows the AI-generated analysis in a tabbed layout.
// Tabs and content are tailored to the analysis mode selected.

import { useState } from "react";
import "./ResultDisplay.css";

// Tabs shown per analysis mode
const MODE_TABS = {
  general: [
    { id: "full",          label: "Full Report" },
    { id: "overview",      label: "Overview" },
    { id: "requirements",  label: "Requirements" },
    { id: "plan",          label: "Action Plan" },
    { id: "structure",     label: "Structure" },
    { id: "timeline",      label: "Timeline" },
    { id: "mistakes",      label: "Mistakes" },
  ],
  requirements: [
    { id: "full",          label: "Full Report" },
    { id: "overview",      label: "Overview" },
    { id: "requirements",  label: "Requirements" },
    { id: "mistakes",      label: "Mistakes" },
  ],
  structure: [
    { id: "full",          label: "Full Report" },
    { id: "overview",      label: "Overview" },
    { id: "structure",     label: "Structure" },
    { id: "mistakes",      label: "Mistakes" },
  ],
  rubric: [
    { id: "full",          label: "Full Report" },
    { id: "rubric",        label: "Rubric" },
    { id: "mistakes",      label: "Mistakes" },
  ],
  timeline: [
    { id: "full",          label: "Full Report" },
    { id: "overview",      label: "Overview" },
    { id: "timeline",      label: "Timeline" },
    { id: "mistakes",      label: "Mistakes" },
  ],
};

function ResultDisplay({ result, mode = "general", onReset }) {
  const tabs = MODE_TABS[mode] || MODE_TABS.general;
  const [activeTab,   setActiveTab]   = useState("full");
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState(null);

  const exportPDF = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/export-pdf`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(result),
      });
      if (!response.ok) throw new Error("Export failed. Please try again.");
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = "assignment_guidance.pdf";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Shared section renderers ──────────────────────────────────────────────

  const renderOverview = () => (
    <>
      <div className="overview-block">
        <h3 className="section-title">What this assignment is asking</h3>
        <p className="overview-text">{result.interpretation}</p>
      </div>

      {result.focus_response && (
        <div className="focus-callout">
          <div className="focus-callout-label">Your question answered</div>
          <p className="focus-callout-text">{result.focus_response}</p>
        </div>
      )}
    </>
  );

  const renderRequirements = () => (
    <>
      {result.key_verbs?.length > 0 && (
        <div className="section-block">
          <h3 className="section-title">Key words in this brief</h3>
          <p className="section-intro">
            Understanding what these words require will help you answer the assignment correctly.
          </p>
          <div className="verb-grid">
            {result.key_verbs.map((v, i) => (
              <div key={i} className="verb-card">
                <span className="verb-word">{v.verb}</span>
                <span className="verb-meaning">{v.means}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-block">
        <h3 className="section-title">Requirements from the brief</h3>
        <p className="section-intro">Everything clearly stated in your assignment brief.</p>
        <ul className="req-list">
          {result.explicit_requirements?.map((item, i) => (
            <li key={i} className="req-item">
              <span className="req-dot green"></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="section-block">
        <h3 className="section-title">What tutors will also expect</h3>
        <p className="section-intro">
          Expectations not written down, but tutors will look for when marking.
        </p>
        <ul className="req-list">
          {result.inferred_expectations?.map((item, i) => (
            <li key={i} className="req-item">
              <span className="req-dot amber"></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  const renderStructure = () => (
    <>
      <h3 className="section-title">Suggested structure</h3>
      <p className="section-intro">How to organise your work from start to finish.</p>
      <div className="structure-list">
        {result.suggested_structure?.map((section, i) => (
          <div key={i} className="structure-item">
            <div className="structure-index">{i + 1}</div>
            <div className="structure-body">
              <strong className="structure-name">{section.section}</strong>
              <p className="structure-purpose">{section.purpose}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderPlan = () => (
    <>
      <h3 className="section-title">Step-by-step action plan</h3>
      <p className="section-intro">
        Follow these steps in order. Each one is a single, concrete action.
      </p>
      <ol className="step-list">
        {result.step_by_step_plan?.map((step, i) => (
          <li key={i} className="step-card">
            <span className="step-number">{i + 1}</span>
            <span className="step-text">{step}</span>
          </li>
        ))}
      </ol>
    </>
  );

  const renderTimeline = () => (
    <>
      <h3 className="section-title">Suggested timeline</h3>
      <p className="section-intro">
        A guide for pacing your work. Adjust based on your actual deadline.
      </p>
      <div className="timeline-list">
        {result.timeline_plan?.map((phase, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-marker">
              <div className="timeline-dot"></div>
              {i < (result.timeline_plan.length - 1) && <div className="timeline-line"></div>}
            </div>
            <div className="timeline-body">
              <div className="timeline-header">
                <strong className="timeline-phase">{phase.phase}</strong>
                <span className="duration-badge">
                  {phase.suggested_duration_days}{" "}
                  {Number(phase.suggested_duration_days) === 1 ? "day" : "days"}
                </span>
              </div>
              <p className="timeline-desc">{phase.description}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderMistakes = () => (
    <>
      <h3 className="section-title">Common mistakes to avoid</h3>
      <p className="section-intro">
        The most frequent issues with this type of assignment and why they cost marks.
      </p>
      <div className="mistakes-list">
        {result.common_mistakes?.map((m, i) => {
          const mistake = typeof m === "object" ? m.mistake : m;
          const why     = typeof m === "object" ? m.why     : null;
          return (
            <div key={i} className="mistake-card">
              <div className="mistake-number">{i + 1}</div>
              <div className="mistake-body">
                <p className="mistake-text">{mistake}</p>
                {why && <p className="mistake-why">{why}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderRubric = () => (
    <>
      <div className="rubric-status">
        {result.rubric_found ? (
          <span className="rubric-badge rubric-found">Rubric found in brief</span>
        ) : (
          <span className="rubric-badge rubric-suggested">No rubric in brief — suggested rubric generated</span>
        )}
      </div>

      {result.rubric_analysis && (
        <div className="section-block">
          <h3 className="section-title">
            {result.rubric_found ? "Rubric analysis" : "Marking analysis"}
          </h3>
          <p className="overview-text">{result.rubric_analysis}</p>
        </div>
      )}

      {result.rubric_criteria?.length > 0 && (
        <div className="section-block">
          <h3 className="section-title">
            {result.rubric_found ? "Marking criteria" : "Suggested marking criteria"}
          </h3>
          <div className="rubric-criteria-list">
            {result.rubric_criteria.map((c, i) => (
              <div key={i} className="rubric-criterion">
                <div className="rubric-criterion-header">
                  <span className="rubric-criterion-name">{c.criterion}</span>
                  {c.marks_or_weight && (
                    <span className="rubric-weight-badge">{c.marks_or_weight}</span>
                  )}
                </div>
                {c.description && <p className="rubric-criterion-desc">{c.description}</p>}
                {c.how_to_score_well && (
                  <p className="rubric-score-tip">
                    <strong>To score well:</strong> {c.how_to_score_well}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // ── Tab content ──────────────────────────────────────────────────────────

  const renderTabContent = () => {
    switch (activeTab) {

      case "overview":
        return <div className="tab-content">{renderOverview()}</div>;

      case "requirements":
        return <div className="tab-content">{renderRequirements()}</div>;

      case "structure":
        return <div className="tab-content">{renderStructure()}</div>;

      case "plan":
        return <div className="tab-content">{renderPlan()}</div>;

      case "timeline":
        return <div className="tab-content">{renderTimeline()}</div>;

      case "mistakes":
        return <div className="tab-content">{renderMistakes()}</div>;

      case "rubric":
        return <div className="tab-content">{renderRubric()}</div>;

      case "full":
        return (
          <div className="tab-content">
            {result.assessment_type && (
              <div className="report-section">
                <div className="report-label">Assessment type</div>
                <span className="report-type-badge">{result.assessment_type}</span>
              </div>
            )}

            <div className="report-section">{renderOverview()}</div>

            {mode === "rubric" ? (
              <div className="report-section">{renderRubric()}</div>
            ) : (
              <>
                {(mode === "general" || mode === "requirements") && (
                  <div className="report-section">{renderRequirements()}</div>
                )}
                {(mode === "general" || mode === "structure") && (
                  <div className="report-section">{renderStructure()}</div>
                )}
                {mode !== "rubric" && (
                  <div className="report-section">{renderTimeline()}</div>
                )}
              </>
            )}

            <div className="report-section">{renderPlan()}</div>
            <div className="report-section" style={{ borderBottom: "none" }}>{renderMistakes()}</div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="results-wrapper">

      <div className="results-header">
        <div className="results-meta">
          <h2 className="results-title">Your Assignment Guidance</h2>
          {result.assessment_type && (
            <span className="assessment-badge">{result.assessment_type}</span>
          )}
        </div>
        <div className="results-actions">
          <button className="btn-export" onClick={exportPDF} disabled={exporting}>
            {exporting ? (
              <>
                <span className="spinner spinner-dark"></span>
                Exporting...
              </>
            ) : (
              "Export PDF"
            )}
          </button>
          <button className="btn-new-analysis" onClick={onReset}>
            New Analysis
          </button>
        </div>
      </div>

      {exportError && <p className="export-error">{exportError}</p>}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  );
}

export default ResultDisplay;
