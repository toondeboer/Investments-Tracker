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

  const { symbol, start, end } = JSON.parse(event.body);
  const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${start}&period2=${end}`;
  const options = {
    hostname: 'query1.finance.yahoo.com',
    path: apiUrl,
    headers: {
      Accept: '*/*',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject({
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch data from Yahoo Finance',
        }),
      });
    });

    req.end();
  });
};
