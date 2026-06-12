// Legal & compliance content. Education-only positioning throughout.
// No investing, SIP, portfolio, or account-opening language.

export type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalPolicy = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const termsPolicy: LegalPolicy = {
  title: 'Terms and Conditions',
  lastUpdated: '2026-06-09',
  sections: [
    {
      heading: '1. Introduction',
      body: [
        "These Terms & Conditions constitute a legally binding agreement between the user and BEONEDGE LLP.",
        'BEONEDGE provides financial education and learning resources. We do not provide investment advice, brokerage services, or access to financial markets.',
      ],
    },
    {
      heading: '2. Eligibility and Learner Accounts',
      body: [
        'To use certain features of our Services, you must create a learner account. You must be at least 18 years old and capable of entering into a binding contract.',
        'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.',
        'A learner account grants you access to educational content and features. It does not constitute an investment account, trading account, or brokerage relationship.',
      ],
    },
    {
      heading: '3. Course Access and Membership',
      body: [
        'Upon purchase or enrollment, you receive a limited, non-exclusive, non-transferable license to access the purchased course or membership content for personal, non-commercial use.',
        'Course access is generally provided for the lifetime of the course, unless otherwise stated at the time of purchase. We reserve the right to update, modify, or retire courses as our curriculum evolves.',
        'Membership benefits (such as premium news briefings, live sessions, and templates) are available only during the active subscription period.',
        'You may not share your account credentials, download course videos for redistribution, or resell access to our content.',
      ],
    },
    {
      heading: '4. Payments and Billing',
      body: [
        'All prices are listed in Indian Rupees (INR) unless otherwise stated. Prices are subject to change, but changes will not affect orders already placed.',
        'Payments are processed through secure third-party payment gateways. We do not store your full payment card details.',
        'For subscription memberships, billing recurs automatically at the interval selected during purchase (monthly or annually) until cancelled.',
        'Failed payments may result in suspension of membership benefits until the issue is resolved.',
      ],
    },
    {
      heading: '5. Intellectual Property',
      body: [
        'All content on the BeOnEdge platform, including videos, text, worksheets, templates, graphics, and software, is the property of BeOnEdge or its licensors and is protected by copyright and other intellectual property laws.',
        'You may download and print materials for personal study, but you may not reproduce, distribute, modify, create derivative works from, or publicly display any content without our prior written consent.',
        'The BeOnEdge name, logo, and brand elements are trademarks of BeOnEdge. You may not use them without permission.',
      ],
    },
    {
      heading: '6. Prohibited Conduct',
      body: [
        'You agree not to use our Services for any unlawful purpose or in any way that could damage, disable, overburden, or impair our platform.',
        'Prohibited activities include: attempting to gain unauthorized access to our systems; using automated scripts or bots; harassing other learners or instructors; uploading malicious code; and engaging in any activity that interferes with other users\' access.',
      ],
    },
    {
      heading: '7. Termination',
      body: [
        'We reserve the right to suspend or terminate your account and access to our Services at our discretion, including for violations of these Terms or harmful behavior.',
        'You may close your account at any time by contacting us. Upon termination, your right to access purchased content may be revoked, subject to applicable refund policies.',
      ],
    },
    {
      heading: '8. Limitation of Liability',
      body: [
        'To the fullest extent permitted by law, BeOnEdge and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our Services.',
        'Our total liability for any claim arising from these Terms or our Services shall not exceed the amount you paid us in the 12 months preceding the claim.',
        'We do not guarantee any specific educational outcome, career result, or financial improvement from using our Services.',
      ],
    },
    {
      heading: '9. Governing Law and Disputes',
      body: [
        'These Terms are governed by the laws of India. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.',
        'Before initiating any legal proceedings, you agree to attempt to resolve the dispute informally by contacting us at support@beonedge.in.',
      ],
    },
    {
      heading: '10. Changes to Terms',
      body: [
        'We may update these Terms from time to time. The updated Terms will be posted on this page with a revised "Last updated" date. Continued use of our Services after changes constitutes acceptance.',
        'Material changes will be notified via email or a prominent notice on our platform.',
      ],
    },
    {
      heading: '11. Contact',
      body: [
        'For questions about these Terms, please contact us at support@beonedge.in.',
      ],
    },
  ],
};

export const privacyPolicy: LegalPolicy = {
  title: 'Privacy Policy',
  lastUpdated: '2026-06-09',
  sections: [
    {
      heading: '1. Introduction',
      body: [

         "BEONEDGE LLP respects your privacy and is committed to protecting your personal information." ,              
       
        'By using our Services, you consent to the practices described in this Privacy Policy.',
      ],
    },
    {
      heading: '2. Information We Collect',
      body: [
        'We collect information you provide directly, including: name, email address, phone number, and any details you share through forms or support inquiries.',
        'We automatically collect certain usage data, such as IP address, browser type, device information, pages visited, and time spent on our platform.',
        'We use cookies and similar technologies to enhance your experience, remember preferences, and analyze platform usage.',
      ],
    },
    {
      heading: '3. How We Use Your Information',
      body: [
        'To provide and manage our educational services, including course access, membership benefits, and customer support.',
        'To communicate with you about your account, course updates, newsletters, and promotional offers (you may opt out of marketing communications at any time).',
        'To improve our platform, develop new content, and analyze learning patterns.',
        'To ensure security, prevent fraud, and comply with legal obligations.',
      ],
    },
    {
      heading: '4. Cookies and Tracking',
      body: [
        'Cookies are small data files stored on your device. We use essential cookies for platform functionality and analytics cookies to understand usage patterns.',
        'You can manage cookie preferences through your browser settings. Disabling essential cookies may affect platform functionality.',
        'We do not use cookies to track your activity across third-party websites for advertising purposes.',
      ],
    },
    {
      heading: '5. Data Sharing and Third Parties',
      body: [
        'We do not sell your personal data. We share information only with trusted service providers who assist in delivering our Services (such as payment processors, email delivery, and hosting providers).',
        'These third parties are contractually obligated to protect your data and use it only for the purposes we specify.',
        'We may disclose information if required by law, court order, or to protect our rights and safety.',
      ],
    },
    {
      heading: '6. Data Security',
      body: [
        'We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.',
        'Despite our efforts, no online platform can guarantee absolute security. You are responsible for keeping your account credentials secure.',
      ],
    },
    {
      heading: '7. Your Rights',
      body: [
        'You have the right to access, correct, update, or delete your personal data. You may also request a copy of the data we hold about you.',
        'To exercise these rights, contact us at support@beonedge.in. We will respond within 30 days of receiving a verifiable request.',
        'You may also withdraw consent for certain data processing activities, though this may limit your ability to use some features.',
      ],
    },
    {
      heading: '8. Children\'s Privacy',
      body: [
        'Our Services are not intended for children under 13. We do not knowingly collect personal data from children under 13. If you believe we have inadvertently collected such data, please contact us immediately.',
      ],
    },
    {
      heading: '9. Changes to This Policy',
      body: [
        'We may update this Privacy Policy periodically. Changes will be posted on this page with a revised "Last updated" date. We encourage you to review this policy regularly.',
      ],
    },
    {
      heading: '10. Contact',
      body: [
        'If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at support@beonedge.in.',
      ],
    },
  ],
};

export const refundPolicy: LegalPolicy = {
  title: 'Refund and Cancellation Policy',
  lastUpdated: '2026-06-09',
  sections: [
    {
      heading: '1. Scope',
      body: [
         "All refund and cancellation requests relating to services offered by BEONEDGE LLP shall be governed by this policy." ,

        
      ],
    },
    {
      heading: '2. Course Refunds',
      body: [
        'Individual courses are eligible for a full refund within 7 days of purchase, provided you have not completed more than 25% of the course content.',
        'To request a refund, contact us at support@beonedge.in with your order details. Refunds are processed to the original payment method within 7–10 business days.',
        'Bundles and special promotions may have different refund terms, which will be clearly stated at the time of purchase.',
      ],
    },
    {
      heading: '3. Membership Subscriptions',
      body: [
        'Premium membership subscriptions can be cancelled at any time. Cancellation stops future billing; you retain access until the end of the current billing period.',
        'Monthly memberships are eligible for a refund within 48 hours of the most recent charge. Annual memberships are eligible for a prorated refund within 14 days of the most recent charge.',
      ],
    },
    {
      heading: '4. Non-Refundable Items',
      body: [
        'The following are not eligible for refunds: downloaded digital templates or worksheets after access; live sessions or webinars that have already occurred; and corporate or bulk enrollment purchases unless otherwise agreed in writing.',
      ],
    },
    {
      heading: '5. How to Request a Refund',
      body: [
        'Email us at support@beonedge.in with the subject line "Refund Request", including your registered email address, order ID, and reason for the request.',
        'We review all refund requests within 2 business days and will notify you of the decision via email.',
      ],
    },
    {
      heading: '6. Processing Timeline',
      body: [
        'Approved refunds are processed within 7–10 business days. The time for the refund to appear in your account depends on your payment provider and may take additional days.',
      ],
    },
    {
      heading: '7. Contact',
      body: [
        'For refund-related queries, please contact us at support@beonedge.in.',
      ],
    },
  ],
};

export const disclaimerPolicy: LegalPolicy = {
  title: 'Educational Disclaimer',
  lastUpdated: '2026-06-09',
  sections: [
    {
      heading: '1. Purpose of Content',
      body: [
         
        
        'BEONEDGE provides financial education and general awareness content designed to help learners understand personal finance concepts. All content is created for educational purposes only.',
      ],
    },
    {
      heading: '2. Not Financial, Investment, Tax, or Legal Advice',
      body: [
        'The content on this platform does not constitute financial advice, investment advice, tax advice, or legal advice. We are not registered financial advisors, tax professionals, or legal practitioners.',
        'Information about budgeting, saving, debt management, credit, and taxes is provided for general educational understanding and should not be relied upon as professional advice tailored to your specific situation.',
      ],
    },
    {
      heading: '3. No Guaranteed Outcomes',
      body: [
        'We do not guarantee any specific results, income improvements, or financial outcomes from using our courses or content. Individual results depend on personal circumstances, effort, and external factors beyond our control.',
      ],
    },
    {
      heading: '4. Consult a Qualified Professional',
      body: [
        'Before making significant financial decisions, including major purchases, debt restructuring, tax filing, or legal matters, you should consult a qualified professional who understands your individual circumstances.',
      ],
    },
    {
      heading: '5. Accuracy and Updates',
      body: [
        'We strive to keep our content accurate and up to date. However, financial regulations, tax rules, and market conditions change over time. We do not guarantee that all information is current at the time you access it.',
        'If you notice any outdated or incorrect information, please contact us at support@beonedge.in so we can review and update it.',
      ],
    },
    {
      heading: '6. No Investment Products or Services',
      body: [
        'BeOnEdge does not offer investment products, brokerage services, portfolio management, or access to financial markets. We do not facilitate stock purchases, mutual fund investments, SIPs, or any form of securities trading.',
      ],
    },
    {
      heading: '7. Contact',
      body: [
        'If you have questions about the nature of our content or this disclaimer, please contact us at support@beonedge.in.',
      ],
    },
  ],
};
