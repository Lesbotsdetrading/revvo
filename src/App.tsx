import React, { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';

function App() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ customerEmail: email })
        }
      );

      if (!response.ok) throw new Error('Payment initialization failed');
      
      const { publicId } = await response.json();
      
      // Initialize Revolut payment form
      const RevolutCheckout = (window as any).RevolutCheckout;
      if (!RevolutCheckout) {
        throw new Error('Revolut Checkout not loaded');
      }

      const rc = await RevolutCheckout(publicId);
      rc.payWithPopup({
        onSuccess() {
          alert('Payment successful!');
        },
        onError(error: Error) {
          console.error('Payment error:', error);
          setError('Payment failed. Please try again.');
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-8">
          <CreditCard className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Premium Digital Package</h1>
        <p className="text-gray-600 text-center mb-8">
          Get instant access to our exclusive digital content
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Amount:</span>
            <span className="text-2xl font-bold">$500.00</span>
          </div>
        </div>

        <form onSubmit={handlePayment} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay Securely</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Secure payment powered by Revolut
        </div>
      </div>
    </div>
  );
}

export default App;