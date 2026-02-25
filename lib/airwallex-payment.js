// Airwallex 支付集成
// 支持创建支付订单和 webhook 回调处理

const AIRWALLEX_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.airwallex.com' 
  : 'https://api-demo.airwallex.com';

const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY;

// 获取 Access Token
async function getAccessToken() {
  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': AIRWALLEX_CLIENT_ID,
      'x-api-key': AIRWALLEX_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Airwallex access token');
  }

  const data = await response.json();
  return data.token;
}

// 创建支付订单
async function createPaymentIntent({ amount, currency, orderId, email, description }) {
  const token = await getAccessToken();

  const response = await fetch(`${AIRWALLEX_BASE_URL}/api/v1/pa/payment_intents/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.round(amount * 100), // 转美分
      currency: currency || 'USD',
      merchant_order_id: orderId,
      descriptor: description || `HJS充值`,
      metadata: { email, orderId },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Airwallex API error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    clientSecret: result.client_secret,
    checkoutUrl: result.next_action?.url || result.next_action?.hosted_url,
  };
}

// 查询支付状态
async function getPaymentIntent(paymentIntentId) {
  const token = await getAccessToken();

  const response = await fetch(
    `${AIRWALLEX_BASE_URL}/api/v1/pa/payment_intents/${paymentIntentId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get payment intent');
  }

  return await response.json();
}

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
};
