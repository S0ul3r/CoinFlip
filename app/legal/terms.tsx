import { LegalDocumentScreen } from '@/components/legal/LegalDocumentScreen';
import { TERMS_PL } from '@/constants/legalContent';

export default function TermsScreen() {
  return <LegalDocumentScreen title="Regulamin" body={TERMS_PL} />;
}
