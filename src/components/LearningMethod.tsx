import SectionHead from './SectionHead';
import { learningSteps } from '../content/benefits';

// The five-step learning method. Practical and simple - finance understood
// through steady learning, not complexity.
export default function LearningMethod() {
  return (
    <section className="section" id="about">
      <div className="container split">
        <SectionHead
          eyebrow="How it works"
          title="A steady way to build money habits"
        />
        <div className="steps">
          {learningSteps.map((item) => (
            <div className="step" key={item.step}>
              <span className="step__num">{item.step}</span>
              <div>
                <p className="step__title">{item.title}</p>
                <p className="step__desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
