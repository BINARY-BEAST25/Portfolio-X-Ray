import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Landing.css";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <div className="landing-shell">
        <header className="landing-nav">
          <div className="landing-brand">Portfolio<span>-X-Ray</span></div>
          <div className="landing-nav-actions">
            {user ? (
              <Link className="landing-btn" to="/app">Go To Dashboard</Link>
            ) : (
              <>
                <Link className="landing-btn" to="/login">Login</Link>
                <Link className="landing-btn landing-btn-primary" to="/register">Get Started</Link>
              </>
            )}
          </div>
        </header>

        <section className="landing-hero">
          <article className="landing-panel">
            <span className="landing-kicker">Mutual Fund Intelligence</span>
            <h1 className="landing-title">See The Truth In Your Portfolio Before It Costs You.</h1>
            <p className="landing-copy">
              Upload your CAMS or KFintech statement, track live NAV, check true XIRR,
              and uncover overlap, expense drag, and tax-harvesting opportunities with AI-backed insights.
            </p>

            <div className="landing-actions">
              {user ? (
                <Link className="landing-btn landing-btn-primary" to="/app">Open Portfolio</Link>
              ) : (
                <>
                  <Link className="landing-btn landing-btn-primary" to="/login">Continue To Login</Link>
                  <Link className="landing-btn" to="/register">Create Account</Link>
                </>
              )}
            </div>

            <div className="landing-metrics">
              <div className="landing-metric">
                <h4>True XIRR</h4>
                <p>Cashflow-aware performance, not rough return math.</p>
              </div>
              <div className="landing-metric">
                <h4>Expense Drain</h4>
                <p>Annual and long-horizon fee impact in rupees.</p>
              </div>
              <div className="landing-metric">
                <h4>AI Mentor</h4>
                <p>Portfolio-aware chat and practical action steps.</p>
              </div>
            </div>
          </article>

          <aside className="landing-panel landing-stack">
            <div className="landing-feature">
              <h3>1. Upload Or Add Funds</h3>
              <p>Ingest from statement PDF or add holdings manually with live mfapi mapping.</p>
            </div>
            <div className="landing-feature">
              <h3>2. Run Full Portfolio X-Ray</h3>
              <p>Get health score, overlap signals, tax insights, and rebalancing guidance in one place.</p>
            </div>
            <div className="landing-feature">
              <h3>3. Act With Confidence</h3>
              <p>Use planner + chat to prioritize SIP changes, risk alignment, and next actions.</p>
            </div>
          </aside>
        </section>

        <div className="landing-footer">
          Built for Indian investors. AI-generated analysis is informational and not SEBI-registered investment advice.
        </div>
      </div>
    </div>
  );
}
