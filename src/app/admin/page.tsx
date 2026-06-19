import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import AdminDashboard from '../../components/AdminDashboard';

export const metadata = {
  title: 'Admin · Account approvals',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <Nav />
      <AdminDashboard />
      <Footer />
    </>
  );
}
