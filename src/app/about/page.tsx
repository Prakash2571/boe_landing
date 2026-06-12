import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import { site } from '../../content/site';

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        {/* About / Mission */}
        <section className="section">
          <div className="container">
            <div className="section__head">
              <span className="eyebrow">About {site.name}</span>
              <h1 className="section__title">Welcome to BEONEDGE LLP</h1>

            <p className='section__lead'>
              beonedge.in is owned and operated by BEONEDGE LLP, a Limited Liability Partnership registered under the laws of India.
              
              </p> 

              <p className="section__lead">
                At BEONEDGE LLP, we believe that financial knowledge should be
                practical, accessible, and easy to understand. Our mission is to
                help individuals build confidence in managing their money through
                high-quality educational content, courses, and insights designed
                for real-world application.
              </p>
              <p className="section__lead">
                We simplify complex financial concepts and present them in a clear
                and understandable manner, enabling learners to make more informed
                decisions about budgeting, saving, debt management, credit
                awareness, and understanding financial and market developments.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
