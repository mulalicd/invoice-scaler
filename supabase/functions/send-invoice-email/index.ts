import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email servis nije konfiguriran. Dodajte RESEND_API_KEY.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const auth = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      invoiceId, recipientEmail, recipientName, invoiceNumber,
      totalAmount, dueDate, pdfBase64, pdfFilename,
    } = body

    if (!recipientEmail || !invoiceNumber || !pdfBase64) {
      return new Response(JSON.stringify({ error: 'Nedostaju polja' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get organization for branding
    const { data: invData } = await userClient
      .from('invoices').select('organizations(name, full_name, email, brand_color)')
      .eq('id', invoiceId).maybeSingle()
    const org: any = invData?.organizations
    const orgName = org?.full_name ?? 'Faktura Sistem'
    const accent = org?.brand_color ?? '#1f4e8c'

    const formatted = new Intl.NumberFormat('bs-BA', { minimumFractionDigits: 2 }).format(Number(totalAmount)) + ' KM'
    const dueFmt = new Date(dueDate).toLocaleDateString('bs-BA')

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <div style="border-top:4px solid ${accent};padding-top:16px;">
          <h2 style="margin:0 0 8px;color:${accent};">Nova faktura ${invoiceNumber}</h2>
          <p style="color:#555;font-size:14px;margin:0 0 16px;">Poštovani${recipientName ? ' ' + recipientName : ''},</p>
          <p style="color:#333;font-size:14px;line-height:1.6;">U prilogu Vam dostavljamo fakturu broj <strong>${invoiceNumber}</strong> u iznosu od <strong>${formatted}</strong> sa rokom plaćanja do <strong>${dueFmt}</strong>.</p>
          <p style="color:#333;font-size:14px;line-height:1.6;">Hvala Vam na povjerenju.</p>
          <p style="color:#888;font-size:13px;margin-top:32px;">Srdačan pozdrav,<br/><strong>${orgName}</strong></p>
        </div>
      </div>`

    const fromAddress = `${orgName} <onboarding@resend.dev>`

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject: `Faktura ${invoiceNumber} — ${orgName}`,
        html,
        attachments: [{ filename: pdfFilename, content: pdfBase64 }],
      }),
    })

    const result = await resp.json()
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: result.message ?? 'Greška slanja', details: result }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
