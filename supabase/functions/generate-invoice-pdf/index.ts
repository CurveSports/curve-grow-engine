import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) return json({ error: "invoice_id required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: inv, error } = await supabase
      .from("org_revenue_share_invoices")
      .select("*, organizations(name)")
      .eq("id", invoice_id)
      .maybeSingle();
    if (error || !inv) return json({ error: "Invoice not found" }, 404);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]); // Letter
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const muted = rgb(0.45, 0.45, 0.45);
    const black = rgb(0.1, 0.1, 0.1);

    let y = 740;
    page.drawText("CURVE SPORTS", { x: 50, y, size: 18, font: bold, color: black });
    y -= 18;
    page.drawText("Diamond Sports Foundation", { x: 50, y, size: 10, font, color: muted });

    y = 740;
    page.drawText(`Invoice #: ${inv.invoice_number}`, { x: 380, y, size: 10, font: bold });
    y -= 14; page.drawText(`Date: ${inv.invoice_date}`, { x: 380, y, size: 10, font, color: muted });
    y -= 14; page.drawText(`Due: ${inv.due_date ?? "—"}`, { x: 380, y, size: 10, font, color: muted });

    y = 670;
    page.drawText("Bill To", { x: 50, y, size: 9, font: bold, color: muted });
    y -= 14; page.drawText(inv.organizations?.name ?? "Organization", { x: 50, y, size: 12, font: bold });

    y = 600;
    page.drawText("Period", { x: 50, y, size: 9, font: bold, color: muted });
    page.drawText(`${inv.period_start}  to  ${inv.period_end}`, { x: 110, y, size: 10, font });

    y -= 30;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: muted, thickness: 0.5 });
    y -= 18; page.drawText("Description", { x: 50, y, size: 9, font: bold, color: muted });
    page.drawText("Amount", { x: 480, y, size: 9, font: bold, color: muted });
    y -= 4; page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: muted, thickness: 0.5 });

    const rows: [string, number][] = [
      ["New Revenue Generated this period", Number(inv.new_revenue_this_period)],
      ["Less: Recovery Threshold", -Number(inv.recovery_threshold)],
      ["Revenue Above Threshold this period", Number(inv.revenue_above_threshold_this_period)],
      ["Curve Revenue Share (25%)", Number(inv.curve_share_this_period)],
    ];
    for (const [label, amt] of rows) {
      y -= 18;
      page.drawText(label, { x: 50, y, size: 10, font });
      page.drawText(usd(amt), { x: 480, y, size: 10, font });
    }

    y -= 12; page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, color: black, thickness: 1 });
    y -= 20;
    page.drawText("TOTAL DUE", { x: 50, y, size: 12, font: bold });
    page.drawText(usd(Number(inv.curve_share_this_period)), { x: 470, y, size: 14, font: bold });

    y -= 50;
    page.drawText("Running totals", { x: 50, y, size: 9, font: bold, color: muted });
    y -= 14; page.drawText(`Total new revenue to date: ${usd(Number(inv.total_new_revenue_to_date))}`, { x: 50, y, size: 10, font, color: muted });
    y -= 14; page.drawText(`Total Curve share to date: ${usd(Number(inv.total_curve_share_to_date))}`, { x: 50, y, size: 10, font, color: muted });

    if (inv.invoice_notes) {
      y -= 28; page.drawText("Notes", { x: 50, y, size: 9, font: bold, color: muted });
      y -= 14; page.drawText(String(inv.invoice_notes).slice(0, 200), { x: 50, y, size: 10, font, color: muted });
    }

    const bytes = await pdf.save();
    return new Response(JSON.stringify({ pdf: Array.from(bytes), invoice_number: inv.invoice_number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
