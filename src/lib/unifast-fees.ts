export type FeeAssessmentItem = {
    description: string;
    amount: number;
    paid: number;
    balance: number;
    unifast: number;
};

export const UNIFAST_FEE_ITEMS: FeeAssessmentItem[] = [
    { description: 'Tuition Fee', amount: 2100, paid: 0, balance: 0, unifast: 0 },
    { description: 'Information Technology Fee', amount: 400, paid: 0, balance: 0, unifast: 0 },
    { description: 'Laboratory Fee - Computer', amount: 400, paid: 0, balance: 0, unifast: 0 },
    { description: 'Athletics Fee', amount: 50, paid: 0, balance: 0, unifast: 0 },
    { description: 'Cultural Fee', amount: 50, paid: 0, balance: 0, unifast: 0 },
    { description: 'Guidance Fee', amount: 10, paid: 0, balance: 0, unifast: 0 },
    { description: 'Higher Education Modernization Fee', amount: 100, paid: 0, balance: 0, unifast: 0 },
    { description: 'Insurance Fee', amount: 20, paid: 0, balance: 0, unifast: 0 },
    { description: 'Library Fee', amount: 50, paid: 0, balance: 0, unifast: 0 },
    { description: 'Medical and Dental Fee', amount: 50, paid: 0, balance: 0, unifast: 0 },
    { description: 'Registration Fee', amount: 100, paid: 0, balance: 0, unifast: 0 },
    { description: 'School Paper Fee', amount: 40, paid: 0, balance: 0, unifast: 0 },
    { description: 'SCUAA Fee', amount: 50, paid: 0, balance: 0, unifast: 0 },
    { description: 'Student Council Fee', amount: 60, paid: 0, balance: 0, unifast: 0 },
];

export const UNIFAST_FEE_TOTALS = UNIFAST_FEE_ITEMS.reduce(
    (totals, item) => ({
        amount: totals.amount + item.amount,
        paid: totals.paid + item.paid,
        balance: totals.balance + item.balance,
        unifast: totals.unifast + item.unifast,
    }),
    { amount: 0, paid: 0, balance: 0, unifast: 0 },
);

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

export const formatCurrency = (value: number): string => pesoFormatter.format(value);
