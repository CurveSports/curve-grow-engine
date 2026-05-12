// Stub for domain verification. Per project memory, branded-domain email is blocked on DNS access.
// This function records that DNS records were provided and marks the domain as 'awaiting DNS' until real DNS verification is wired.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function generateMockDnsRecords(domain: string) {
  return [
    { type: "CNAME", host: `s1._domainkey.${domain}`, value: `s1.domainkey.u.lovable-mail.com.`, purpose: "DKIM" },
    { type: "CNAME", host: `s2._domainkey.${domain}`, value: `s2.domainkey.u.lovable-mail.com.`, purpose: "DKIM" },
    { type: "TXT",   host: domain, value: `v=spf1 include:lovable-mail.com ~all`, purpose: "SPF" },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, org_id, domain, from_email, from_name, domain_id } = await req.json();
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "register") {
      if (!org_id || !domain) {
        return new Response(JSON.stringify({ error: "org_id and domain required" }), { status: 400, headers: corsHeaders });
      }
      const records = generateMockDnsRecords(domain);
      const ins = await admin.from("org_email_domains").insert({
        org_id, domain, from_email, from_name,
        verification_records: records,
        provider_domain_id: `mock_${crypto.randomUUID()}`,
      }).select().single();
      if (ins.error) return new Response(JSON.stringify({ error: ins.error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ domain: ins.data, records }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!domain_id) {
        return new Response(JSON.stringify({ error: "domain_id required" }), { status: 400, headers: corsHeaders });
      }
      // TODO: implement real DNS lookup + provider verification once DNS access is granted.
      return new Response(JSON.stringify({
        verified: false,
        message: "DNS verification is not yet active. Records have been recorded; verification will run once DNS provisioning is enabled.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("verify-email-domain", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
