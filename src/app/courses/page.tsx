import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import Reveal from '../../components/Reveal';
import { fetchCourses, type Course } from '../../lib/courses';

function formatPrice(paise: number | null | undefined): string {
  if (paise == null) return '';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function FeaturedCourse({ course }: { course: Course }) {
  return (
    <Reveal as="div" className="card course course--featured stagger-item">
      <div className="course__meta">
        <span className="tag">{course.level}</span>
        <span className="tag tag--muted">{course.format}</span>
      </div>
      <h2 className="course__name" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>{course.name}</h2>
      <p className="course__outcome">{course.outcome}</p>
      {course.pricePaise ? (
        <p className="course__price">{formatPrice(course.pricePaise)}</p>
      ) : null}
      <span className="card__cta">View details</span>
    </Reveal>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <Reveal as="div" className="card course stagger-item">
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
  );
}

export default async function CoursesPage() {
  let courses: Course[] = [];
  let error = false;
  try {
    courses = await fetchCourses();
  } catch {
    courses = [];
    error = true;
  }

  const [featured, ...rest] = courses;

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">Courses</span>
              <h1 className="section__title">Practical courses for real-life money decisions</h1>
              <p className="section__lead">
                Learn budgeting, saving, debt management, and financial news literacy through short, practical lessons.
              </p>
            </div>
            {error ? (
              <div className="empty-state">
                <p className="section__lead">Unable to load courses right now. Please try again later.</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="empty-state">
                <p className="section__lead">No courses available right now. Check back soon.</p>
              </div>
            ) : (
              <>
                {featured ? <FeaturedCourse course={featured} /> : null}
                {rest.length > 0 ? (
                  <div className="grid grid--2" style={{ marginTop: '1.5rem' }}>
                    {rest.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
