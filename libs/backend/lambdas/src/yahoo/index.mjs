import https from 'https';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const { symbols, start, end } = JSON.parse(event.body);

  const results = await Promise.all(
    symbols.map((symbol) => {
      const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${start}&period2=${end}`;
      const options = {
        hostname: 'query1.finance.yahoo.com',
        path: apiUrl,
        method: 'GET',
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      };

      return new Promise((resolve, reject) => {
        const req = https.get(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            resolve({ symbol, data: JSON.parse(data) });
          });
        });

        req.on('error', (error) => {
          resolve({ symbol, error: 'Failed to parse response' });
        });

        req.end();
      });
    })
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results),
  };
};
