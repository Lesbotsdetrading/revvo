import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REVOLUT_API_KEY = Deno.env.get('REVOLUT_API_KEY')
const REVOLUT_API_URL = 'https://sandbox-merchant.revolut.com/api/1.0'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { customerEmail } = await req.json()

    // Create order in Revolut
    const revolutResponse = await fetch(`${REVOLUT_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 50000, // $500.00 in cents
        currency: 'USD',
        email: customerEmail,
        capture_mode: 'AUTOMATIC'
      })
    })

    if (!revolutResponse.ok) {
      throw new Error('Failed to create Revolut order')
    }

    const revolutOrder = await revolutResponse.json()

    // Store order in Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        amount: 50000,
        revolut_order_id: revolutOrder.id,
        customer_email: customerEmail,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({
        orderId: order.id,
        revolutOrderId: revolutOrder.id,
        publicId: revolutOrder.public_id
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
