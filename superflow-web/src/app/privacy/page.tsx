import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PrioraFlow",
  description: "PrioraFlow Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 prose prose-slate">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: May 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly:</p>
      <ul>
        <li>Account information: name, email, phone number</li>
        <li>Business information: workshop name, location, industry details</li>
        <li>Operational data: jobs, inspections, customers, and vehicles you manage</li>
        <li>Payment information: processed through our payment providers and never stored on our servers</li>
      </ul>
      <p>We also collect usage data automatically:</p>
      <ul>
        <li>Device and browser information</li>
        <li>Access logs and feature usage patterns</li>
        <li>Error reports and performance metrics</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve the Service</li>
        <li>To process transactions and send related communications</li>
        <li>To respond to your support requests</li>
        <li>To analyze usage patterns and improve user experience</li>
        <li>To detect and prevent fraud or security violations</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>We do not sell your personal data. We share data only with:</p>
      <ul>
        <li>Service providers who assist in operating the platform (hosting, payments, email delivery)</li>
        <li>Law enforcement when required by law</li>
        <li>Business transferees in the event of a merger or acquisition</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We implement industry-standard security measures including encryption in transit
        (TLS 1.2+), encryption at rest, role-based access controls, and regular security
        audits. However, no system is completely secure and we cannot guarantee absolute
        security.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data while your account is active and for 30 days after
        account termination. Anonymized, aggregated data may be retained indefinitely
        for analytical purposes.
      </p>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access and export your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to processing of your data</li>
        <li>Withdraw consent at any time</li>
      </ul>

      <h2>7. International Transfers</h2>
      <p>
        Your data may be transferred to and processed in countries outside your
        jurisdiction. We ensure appropriate safeguards are in place for such transfers.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use essential cookies for authentication and session management. Analytics
        cookies are optional and can be disabled in your browser settings.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        The Service is not intended for individuals under 16. We do not knowingly
        collect data from children.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of
        material changes via email or in-app notification.
      </p>

      <h2>11. Contact</h2>
      <p>
        For privacy-related questions or data requests, contact us at{" "}
        <a href="mailto:privacy@prioraflow.com" className="text-blue-600 hover:underline">
          privacy@prioraflow.com
        </a>.
      </p>
    </div>
  );
}