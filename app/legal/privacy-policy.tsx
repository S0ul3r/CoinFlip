import { LegalDocumentScreen } from '@/components/legal/LegalDocumentScreen';
import { PRIVACY_POLICY_PL } from '@/constants/legalContent';

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen title="Polityka prywatności" body={PRIVACY_POLICY_PL} />;
}
