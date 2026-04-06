import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSearch, faExchangeAlt, faTrophy, faFileExcel, faClock, faCog } from '@fortawesome/free-solid-svg-icons';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  return (
    <section className="about-page card">
      <div className="section-header">
        <button className="btn-ghost section-toggle" onClick={onBack} title="Back to home" aria-label="Back to home page">
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h2>About Swim Lab</h2>
      </div>

      <div className="about-intro" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          "Your comprehensive swimming performance analytics and standards tracking platform"
        </p>
      </div>

      <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        Swim Lab is a powerful tool designed to help swimmers, coaches, and teams analyze performance, track progress against competitive standards, and identify improvement opportunities. Whether you're a competitive swimmer aiming for national standards or a coach managing multiple athletes, Swim Lab provides the insights you need.
      </p>

      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2.5rem' }}>
        
        <div className="feature-card" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faSearch} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Athlete Lookup</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Search for swimmers by name, TIREF, or club and instantly retrieve their complete competitive history, including times, events, and progression over seasons.
          </p>
        </div>

        <div className="feature-card" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faTrophy} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Standards Tracking</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Compare swimmer times against regional and national standards. Load custom county times and evaluate performance against multiple competitive benchmarks.
          </p>
        </div>

        <div className="feature-card" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faExchangeAlt} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Athlete Comparison</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Compare multiple swimmers side-by-side to analyze relative performance, identify training opportunities, and benchmark progress within teams or clubs.
          </p>
        </div>

        <div className="feature-card" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faClock} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Performance Analytics</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Analyze personal best times, seasonal progression, and event-specific performance. Identify trends and focus areas for targeted training improvements.
          </p>
        </div>

        <div className="feature-card" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faFileExcel} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Data Export</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Export swimmer profiles and comparison results to Excel for further analysis, reporting, and integration with your coaching management systems.
          </p>
        </div>

        <div className="feature-card" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faCog} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Customizable Settings</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Personalize your experience with theme selection, athlete tagging, preferred county standards, and saved profiles for quick access to frequently analyzed swimmers.
          </p>
        </div>

      </div>

      <div className="about-footer" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Built for swimmers, coaches, and teams who are serious about performance optimization.
        </p>
        <button className="btn-ghost" onClick={onBack} style={{ color: 'var(--primary)' }}>
          Ready to get started? Go home to search for a swimmer
        </button>
      </div>
    </section>
  );
};

export default AboutPage;
