import LegalLayout from '../../components/LegalLayout';
import { termsPolicy } from '../../content/legal';

export default function TermsPage() {
  return <LegalLayout policy={termsPolicy} />;
}
