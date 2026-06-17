## Plan: Simplify Revenue Audit CTA

### Change
Replace the 3-card "Act 4 — Next Steps" section in `src/pages/public/RevenueAuditReport.tsx` with a single centered hero CTA.

### New CTA
- **Headline**: "Book a Call to Learn More About Curve Sports Allegiance"
- **Link**: `https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3fU0wAjS8lvvlPgBYW04RqTzaf8qDpkYQtZ6wSZuzGcOdDzLsvRSdqexBtsWgR3lmmqk7bZCop`
- **Style**: Primary/lime-accented hero card (replacing the current 3-column grid)

### What gets removed
- "Email me my report" card + `handleEmailReport` function
- "Forward to your board" card + `mailtoForward` link construction
- The `emailing` state and related loading logic

### What stays
- Calendar icon
- Arrow-right icon on the CTA
- The disclaimer text at the bottom of the section