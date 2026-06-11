import LegalLayout from '../../components/LegalLayout';
import { refundPolicy } from '../../content/legal';

export default function RefundPage() {
  return <LegalLayout policy={refundPolicy} />;
}
