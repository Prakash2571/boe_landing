import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { newsDigests, newsTaglines } from '../content/news';
import { site } from '../content/site';

// Jargon-free news feature. Framed strictly as education - never trading
// signals or investment recommendations.
export default function FinancialNews() {
  return (
    <section className="section section--sunken" id="news">
      <div className="container">
        <SectionHead
          eyebrow="Premium news"
          title={newsTaglines[0]}
          lead={`${newsTaglines[1]} ${newsTaglines[2]}`}
        />
        <div className="grid grid--3">
          {newsDigests.map((digest) => (
            <Reveal as="div" key={digest.id} className="card">
              <span className="digest__tag">{digest.tag}</span>
              <h3 className="digest__title">{digest.title}</h3>
              <p className="digest__summary">{digest.summary}</p>
            </Reveal>
          ))}
        </div>
        <p className="hero__note" style={{ marginTop: '1.75rem' }}>
          {site.disclaimer}
        </p>
      </div>
    </section>
  );
}
