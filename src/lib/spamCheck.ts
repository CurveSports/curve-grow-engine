// Local heuristic spam-score helper. Mirrors the shape of a Postmark spam check
// so we can swap in a server-side call (POSTMARK_API_TOKEN) without UI changes.

export type SpamRule = { rule: string; description: string; score: number };
export type SpamCheckResult = {
  score: number; // 0 (great) → 10 (very spammy)
  verdict: "likely_to_deliver" | "may_get_filtered" | "high_risk";
  rules: SpamRule[];
};

export function localSpamCheck(input: { subject: string; html: string; from?: string }): SpamCheckResult {
  const rules: SpamRule[] = [];
  const subj = input.subject || "";
  const text = (input.html || "").replace(/<[^>]+>/g, " ");

  if (subj.length > 0 && subj === subj.toUpperCase() && /[A-Z]/.test(subj)) {
    rules.push({ rule: "ALL_CAPS_SUBJECT", description: "Subject is all uppercase", score: 1.5 });
  }
  if ((subj.match(/!/g) ?? []).length >= 3) {
    rules.push({ rule: "EXCESS_EXCLAIMS", description: "Three or more ! in subject", score: 1.0 });
  }
  if (/\$\$|free!?|guarantee|act now|limited time|click here|winner/i.test(subj)) {
    rules.push({ rule: "SPAMMY_SUBJECT_WORDS", description: "Subject uses common spam phrases", score: 1.2 });
  }
  if (/\$\$\$|100% free|risk[- ]?free|make money fast/i.test(text)) {
    rules.push({ rule: "SPAMMY_BODY_WORDS", description: "Body uses common spam phrases", score: 1.5 });
  }
  // Image-only emails are flagged
  const imgCount = (input.html.match(/<img/gi) ?? []).length;
  const textLen = text.replace(/\s+/g, " ").trim().length;
  if (imgCount >= 1 && textLen < 200) {
    rules.push({ rule: "IMAGE_HEAVY", description: "Very little text relative to images", score: 1.0 });
  }
  // No unsubscribe link
  if (!/unsubscribe/i.test(input.html)) {
    rules.push({ rule: "NO_UNSUBSCRIBE", description: "No unsubscribe link detected", score: 2.0 });
  }
  // Excessive links
  const linkCount = (input.html.match(/<a\s+[^>]*href=/gi) ?? []).length;
  if (linkCount > 15) {
    rules.push({ rule: "EXCESSIVE_LINKS", description: "More than 15 links in the email", score: 1.0 });
  }
  // Subject length
  if (subj.length > 0 && subj.length < 5) {
    rules.push({ rule: "SHORT_SUBJECT", description: "Subject is very short", score: 0.5 });
  }
  if (subj.length > 100) {
    rules.push({ rule: "LONG_SUBJECT", description: "Subject is very long", score: 0.5 });
  }

  const score = Math.min(10, Number(rules.reduce((s, r) => s + r.score, 0).toFixed(1)));
  const verdict =
    score <= 3 ? "likely_to_deliver" : score <= 5 ? "may_get_filtered" : "high_risk";
  return { score, verdict, rules };
}
