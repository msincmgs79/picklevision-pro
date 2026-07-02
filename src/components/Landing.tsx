import Link from "next/link";

// Marketing landing page for anonymous visitors — optimized for search (SEO) and
// AI answer engines (GEO). Server-rendered so all copy + FAQ + structured data is
// in the initial HTML for crawlers and LLMs to read and cite.

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is PickleVision?",
    a: "PickleVision is an AI pickleball analysis app that turns a video of your match into a shot-by-shot coaching breakdown — skill ratings on the DUPR scale, ball tracking, rally highlights, and player court-coverage — all in a fast web app you can install on any device.",
  },
  {
    q: "How does AI pickleball video analysis work?",
    a: "You upload footage of your match. PickleVision's computer-vision model detects the ball and players frame by frame and maps them onto the court, while an AI language model reviews key frames to grade your shots and write a plain-English coaching summary. You get results in minutes — no manual tagging.",
  },
  {
    q: "Is there a free version?",
    a: "Yes. You can start free with one full match analysis per month. Premium and Ultra plans add more monthly analyses, and you can buy top-up credits any time for extra runs.",
  },
  {
    q: "How accurate is the DUPR rating?",
    a: "PickleVision gives an AI estimate on the DUPR 2–8 scale, based on what the AI sees in your footage. It's designed to track your progress over time and is not an official DUPR rating.",
  },
  {
    q: "What do I need to record my matches?",
    a: "Just a phone on a tripod placed behind the court. A clear, steady view of the full court gives the best results — no special cameras, sensors or wearables required.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. PickleVision is a Progressive Web App (PWA): install it to your home screen on iPhone, Android or desktop and it works like a native app, including offline — with no app store download.",
  },
  {
    q: "Are my match videos private?",
    a: "Yes. Your videos are stored privately and are only visible to you.",
  },
  {
    q: "How is PickleVision different from other pickleball analysis tools?",
    a: "PickleVision pairs real computer-vision stats (ball tracking, court coverage) with an AI coaching read and a rating that tracks over time — delivered in a clean, installable web app with nothing to download.",
  },
];

const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: "★", title: "AI shot breakdown", desc: "A coaching read plus DUPR-scale skill ratings for serve, return, offense, defense and consistency — from your footage." },
  { icon: "✦", title: "Ball tracking & rallies", desc: "3D ball trajectories mapped to the court, automatic rally and highlight detection, and approximate in/out calls." },
  { icon: "▦", title: "Player court coverage", desc: "Heatmaps of where you spend time on the court and how often you get to the kitchen line." },
  { icon: "📈", title: "Rating & progress", desc: "A recency-weighted career rating across all your games, a trend line, and a win–loss record." },
  { icon: "⤓", title: "Installable app", desc: "Add PickleVision to your home screen on any device. Works like a native app, even offline — no app store." },
  { icon: "🔒", title: "Private by default", desc: "Your match videos are yours. Only you can see them." },
];

const SITE = "https://picklevision-clean.vercel.app";

export default function Landing() {
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PickleVision",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "AI pickleball analysis app: turn your match video into shot-by-shot coaching, DUPR-scale skill ratings, ball tracking, rally highlights and player court-coverage.",
    url: SITE,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PickleVision logo" width={34} height={34} />
          <span style={{ fontWeight: 800, fontSize: 20, color: "var(--text)" }}>
            Pickle<span style={{ color: "var(--primary)" }}>Vision</span>
          </span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="#features" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>Features</a>
          <a href="#faq" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>FAQ</a>
          <Link href="/login" className="btn btn-sm">Sign in</Link>
          <Link href="/login" className="btn btn-primary btn-sm">Get started</Link>
        </nav>
      </header>

      {/* hero */}
      <section style={{ textAlign: "center", padding: "56px 0 40px" }}>
        <div className="eyebrow" style={{ justifyContent: "center" }}>AI PICKLEBALL ANALYSIS</div>
        <h1 style={{ fontSize: "clamp(34px, 6vw, 60px)", fontWeight: 800, lineHeight: 1.05, margin: "14px auto 0", maxWidth: 860, letterSpacing: "-1px" }}>
          Turn your pickleball match video into an <span style={{ color: "var(--primary)" }}>AI coaching breakdown</span>
        </h1>
        <p className="muted" style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 640, margin: "20px auto 0" }}>
          Upload a match and get shot-by-shot AI ratings, ball tracking, court-coverage heatmaps and a DUPR-scale skill estimate — in minutes, on any device. No app store, no hardware.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
          <Link href="/login" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 22px" }}>Get started free →</Link>
          <Link href="/analysis" className="btn" style={{ fontSize: 15, padding: "12px 22px" }}>See a live demo</Link>
        </div>
        <p className="dim" style={{ fontSize: 13, marginTop: 16 }}>
          Free to start · Works on iPhone, Android &amp; desktop · Your videos stay private
        </p>
      </section>

      {/* how it works */}
      <section style={{ padding: "24px 0" }}>
        <h2 className="section-title" style={{ textAlign: "center", fontSize: 24, marginBottom: 22 }}>How it works</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { n: "1", t: "Record & upload", d: "Film your game on a phone behind the court and upload the video (up to 1 GB)." },
            { n: "2", t: "AI analyzes", d: "PickleVision detects the ball and players, grades your shots and maps the court." },
            { n: "3", t: "Get your breakdown", d: "Skill ratings, coaching tips, rally highlights, coverage heatmaps and a rating that tracks over time." },
          ].map((s) => (
            <div key={s.n} className="card">
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary)", color: "#0a0e1a", display: "grid", placeItems: "center", fontWeight: 800, marginBottom: 12 }}>{s.n}</div>
              <div className="section-title" style={{ fontSize: 16 }}>{s.t}</div>
              <p className="muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" style={{ padding: "40px 0", scrollMarginTop: 20 }}>
        <h2 className="section-title" style={{ textAlign: "center", fontSize: 24, marginBottom: 22 }}>Everything you get</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div style={{ fontSize: 22, color: "var(--primary)", marginBottom: 10 }}>{f.icon}</div>
              <div className="section-title" style={{ fontSize: 16 }}>{f.title}</div>
              <p className="muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "40px 0", maxWidth: 780, margin: "0 auto", scrollMarginTop: 20 }}>
        <h2 className="section-title" style={{ textAlign: "center", fontSize: 24, marginBottom: 22 }}>Frequently asked questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ.map((f) => (
            <details key={f.q} className="card" style={{ padding: "14px 16px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 15.5, listStyle: "none" }}>{f.q}</summary>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="card" style={{ textAlign: "center", padding: "40px 24px", margin: "24px 0", borderColor: "rgba(163,230,53,0.4)" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>See your game like never before</h2>
        <p className="muted" style={{ fontSize: 16, marginTop: 10, maxWidth: 520, marginInline: "auto" }}>
          Upload your next match and get an AI coaching breakdown in minutes.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 24px", marginTop: 20 }}>Get started free →</Link>
      </section>

      {/* footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 0 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="dim" style={{ fontSize: 13 }}>© {new Date().getFullYear()} PickleVision · AI pickleball analysis</div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/login" className="dim" style={{ fontSize: 13, textDecoration: "none" }}>Sign in</Link>
          <Link href="/analysis" className="dim" style={{ fontSize: 13, textDecoration: "none" }}>Demo</Link>
          <a href="#faq" className="dim" style={{ fontSize: 13, textDecoration: "none" }}>FAQ</a>
        </div>
      </footer>
      <p className="dim" style={{ fontSize: 11, textAlign: "center", paddingBottom: 30 }}>
        DUPR-scale ratings are AI-generated estimates and are not affiliated with or endorsed by DUPR.
      </p>
    </div>
  );
}
