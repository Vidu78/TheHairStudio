import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER')!

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, client_name, service, barber, date, time, profiles(phone)')
      .eq('date', tomorrowStr)
      .eq('status', 'confirmed')

    if (error) throw error

    const results = []
    for (const b of bookings ?? []) {
      const phone = (b as any).profiles?.phone
      if (!phone) continue

      const msg =
        `📅 The Hair Studio — promemoria appuntamento:\n` +
        `Domani ${b.time} con ${b.barber}\n` +
        `Servizio: ${b.service}\n` +
        `Per info: +39 328 594 4459`

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: TWILIO_FROM_NUMBER, To: phone, Body: msg }),
        },
      )

      results.push({ id: b.id, client: b.client_name, ok: res.ok })
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
