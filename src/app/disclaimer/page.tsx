import LegalLayout from '../../components/LegalLayout';
import { disclaimerPolicy } from '../../content/legal';

export default function DisclaimerPage() {
  return <LegalLayout policy={disclaimerPolicy} />;
}
