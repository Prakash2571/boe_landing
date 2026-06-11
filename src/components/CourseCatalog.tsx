import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { type Course } from '../lib/courses';

function formatPrice(paise: number | null | undefined): string {
  if (paise == null) return '';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// Config-driven course catalog. Education products only - no funds or
// investment listings.
export default function CourseCatalog({ courses }: { courses: Course[] }) {
  return (
    <section className="section" id="courses">
      <div className="container">
        <SectionHead
          eyebrow="Courses"
          title="Practical courses for real-life money decisions"
          lead="Each course is built around behaviour, systems, and decision clarity: short lessons you can apply right away."
        />
        {courses.length === 0 ? (
          <div className="empty-state">
            <p className="section__lead">No courses available right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid--3">
            {courses.map((course) => (
              <Reveal as="div" key={course.id} className="card course stagger-item">
                <div className="course__meta">
                  <span className="tag">{course.level}</span>
                  <span className="tag tag--muted">{course.format}</span>
                </div>
                <h3 className="course__name">{course.name}</h3>
                <p className="course__outcome">{course.outcome}</p>
                {course.pricePaise ? (
                  <p className="course__price">{formatPrice(course.pricePaise)}</p>
                ) : null}
                <span className="card__cta">View details</span>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
