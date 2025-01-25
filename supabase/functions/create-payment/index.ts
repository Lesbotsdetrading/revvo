import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REVOLUT_API_KEY = Deno.env.get('REVOLUT_API_KEY')
const REVOLUT_API_URL = 'https://sandbox-merchant.revolut.com/api/1.0'

console.log('Environment check:')
console.log('REVOLUT_API_KEY exists:', !!REVOLUT_API_KEY)
console.log('REVOLUT_API_URL:', REVOLUT_API_URL)
console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'))
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  try {
    const body = await req.text()
    console.log('Request body:', body)

    const parsedBody = JSON.parse(body)
    console.log('Parsed body:', parsedBody)

    // Accept either customerEmail or email
    const customerEmail = parsedBody.customerEmail || parsedBody.email
    console.log('Customer email:', customerEmail)

    if (!customerEmail) {
      throw new Error('Customer email is required (use either "customerEmail" or "email" in the request)')
    }

    if (!REVOLUT_API_KEY) {
      throw new Error('REVOLUT_API_KEY environment variable is not set')
    }

    // Use provided amount or default to 50000 (500 USD)
    const amount = parsedBody.amount || 50000
    const currency = parsedBody.currency || 'USD'

    console.log('Creating Revolut order...')
    const revolutRequestBody = {
      amount,
      currency,
      email: customerEmail,
      capture_mode: 'AUTOMATIC'
    }
    console.log('Revolut request body:', revolutRequestBody)

    // Create order in Revolut
    const revolutResponse = await fetch(`${REVOLUT_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(revolutRequestBody)
    })

    console.log('Revolut response status:', revolutResponse.status)
    const revolutResponseText = await revolutResponse.text()
    console.log('Revolut response body:', revolutResponseText)

    if (!revolutResponse.ok) {
      throw new Error(`Failed to create Revolut order: ${revolutResponseText}`)
    }

    const revolutOrder = JSON.parse(revolutResponseText)
    console.log('Parsed Revolut order:', revolutOrder)

    console.log('Storing order in Supabase...')
    // Store order in Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        amount,
        revolut_order_id: revolutOrder.id,
        customer_email: customerEmail,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Order stored successfully:', order)

    const response = {
      orderId: order.id,
      revolutOrderId: revolutOrder.id,
      publicId: revolutOrder.public_id
    }
    console.log('Sending response:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    )
  } catch (error) {
    console.error('Error in create-payment function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    )
  }
})