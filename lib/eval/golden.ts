// Golden evaluation set: a fixed corpus + question cases with expected signals.
// Used by `pnpm eval` to measure faithfulness / recall / retrieval-hit and gate CI.

export const CORPUS = [
  {
    title: 'Refund policy',
    content:
      'Customers may request a refund within 30 days of purchase. Refunds are returned to the ' +
      'original payment method within 5 business days. Shipping fees are non-refundable. To start ' +
      'a refund, contact support with your order number.',
  },
  {
    title: 'Shipping & delivery',
    content:
      'Standard shipping takes 3 to 5 business days. Express shipping arrives in 1 to 2 business ' +
      'days. We ship Monday through Friday. Tracking links are emailed once an order ships.',
  },
  {
    title: 'Account & billing',
    content:
      'You can reset your password from the login page using the "Forgot password" link. Invoices ' +
      'are available under Billing. We accept major credit cards. To cancel a subscription, open ' +
      'Billing and choose Cancel.',
  },
];

export type EvalCase = { question: string; expectContains: string[]; expectDocTitle: string };

export const CASES: EvalCase[] = [
  {
    question: 'How long do I have to request a refund?',
    expectContains: ['30'],
    expectDocTitle: 'Refund policy',
  },
  {
    question: 'How many business days does standard shipping take?',
    expectContains: ['3', '5'],
    expectDocTitle: 'Shipping & delivery',
  },
  {
    question: 'How do I reset my password?',
    expectContains: ['password'],
    expectDocTitle: 'Account & billing',
  },
  {
    question: 'Are shipping fees refundable?',
    expectContains: ['non-refundable'],
    expectDocTitle: 'Refund policy',
  },
  {
    question: 'How do I cancel my subscription?',
    expectContains: ['cancel'],
    expectDocTitle: 'Account & billing',
  },
];
