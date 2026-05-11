import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — PrioraFlow",
  description: "PrioraFlow Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 prose prose-slate">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: May 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using PrioraFlow (&quot;the Service&quot;), you agree to be bound by these
        Terms of Service. If you do not agree, you may not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        PrioraFlow is a workshop management platform that provides job board management,
        vehicle inspections, customer communications, priority scoring, and related
        features for automotive repair workshops.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You must provide accurate information when creating an account. You are
        responsible for maintaining the security of your credentials and for all
        activity under your account. Notify us immediately of any unauthorized use.
      </p>

      <h2>4. Subscription and Payments</h2>
      <p>
        Paid plans are billed in advance on a monthly or annual basis. Prices are
        subject to change with 30 days&apos; notice. We reserve the right to suspend
        access for overdue payments.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to other users&apos; data</li>
        <li>Interfere with or disrupt the Service&apos;s infrastructure</li>
        <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
      </ul>

      <h2>6. Data and Content</h2>
      <p>
        You retain ownership of your data. You grant us a limited license to process
        and store your data solely to provide the Service. We will not sell your data
        to third parties.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        The Service, including software, design, and branding, is owned by PrioraFlow.
        Your subscription does not transfer any intellectual property rights beyond the
        limited license to use the Service.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may cancel your subscription at any time. We may suspend or terminate
        accounts that violate these Terms. Upon termination, your data will be
        retained for 30 days before deletion unless otherwise required by law.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. We do not
        guarantee uninterrupted or error-free operation.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, PrioraFlow shall not be liable for
        any indirect, incidental, or consequential damages arising from the use of
        the Service.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the United Arab Emirates. Any
        disputes shall be resolved in the courts of Dubai, UAE.
      </p>

      <h2>12. Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service
        after changes constitutes acceptance of the updated Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href="mailto:support@prioraflow.com" className="text-blue-600 hover:underline">
          support@prioraflow.com
        </a>.
      </p>
    </div>
  );
}