/**
 * Converts numeric amount to Indian Rupee Words format
 * e.g., 15833 => "Fifteen Thousand Eight Hundred Thirty-Three Only"
 */
export function numberToWordsINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "";
  const num = Math.floor(Math.abs(Number(amount)));
  if (num === 0) return "Zero Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertSection(n) {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) {
      const remainder = n % 10;
      return tens[Math.floor(n / 10)] + (remainder ? `-${ones[remainder]}` : "");
    }
    const remainder = n % 100;
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (remainder ? ` ${convertSection(remainder)}` : "")
    );
  }

  let words = "";

  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const remainder = rem;

  if (crore > 0) {
    words += `${convertSection(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertSection(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertSection(thousand)} Thousand `;
  }
  if (remainder > 0) {
    words += `${convertSection(remainder)} `;
  }

  return `${words.trim()} Only`;
}

export default numberToWordsINR;
