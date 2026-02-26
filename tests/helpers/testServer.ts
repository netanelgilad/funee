import { createServer, IncomingMessage, ServerResponse } from 'http';

export const startTestServer = (port = 19999) => {
  const server = createServer((req, res) => {
    // Route handling
    if (req.url === '/json') {
      // Mimic httpbin.org/json structure
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        slideshow: {
          author: 'Test Author',
          date: 'date of publication',
          slides: [
            { title: 'Slide 1', type: 'all' },
            { title: 'Slide 2', type: 'all' }
          ],
          title: 'Sample Slide Show'
        }
      }));
    }
    else if (req.url === '/text') {
      res.end('Hello, World!');
    }
    else if (req.url === '/html') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<html><head></head><body><h1>Hello World</h1></body></html>');
    }
    else if (req.url === '/404' || req.url === '/status/404') {
      res.statusCode = 404;
      res.statusMessage = 'Not Found';
      res.end('Not Found');
    }
    else if (req.url === '/headers') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ headers: req.headers }));
    }
    else if (req.url === '/get') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        url: `http://localhost:${port}/get`,
        method: req.method,
        headers: req.headers,
        origin: '127.0.0.1'
      }));
    }
    else if (req.url === '/post') {
      // Handle POST request for /post route
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          let jsonBody = null;
          try {
            jsonBody = JSON.parse(body);
          } catch (e) {
            // not JSON
          }
          res.end(JSON.stringify({ 
            json: jsonBody,
            data: body,
            headers: req.headers,
            url: `http://localhost:${port}/post`
          }));
        });
      } else {
        res.statusCode = 405;
        res.end('Method Not Allowed');
      }
    }
    else if (req.url?.startsWith('/response-headers')) {
      // Parse query params and set them as response headers
      const url = new URL(req.url, `http://localhost:${port}`);
      res.setHeader('Content-Type', 'application/json');
      url.searchParams.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.end(JSON.stringify({ success: true }));
    }
    else if (req.url === '/echo') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        url: req.url,
        method: req.method,
        headers: req.headers 
      }));
    }
    else {
      res.statusCode = 404;
      res.end('Unknown route');
    }
  });
  
  server.listen(port);
  return {
    port,
    url: `http://localhost:${port}`,
    close: () => server.close()
  };
};
