import LegalLayout from '../../components/LegalLayout';
import { privacyPolicy } from '../../content/legal';

export default function PrivacyPage() {
  return <LegalLayout policy={privacyPolicy} />;
}
